import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { connect } from "node:net";
import type { Socket } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { draft, stroke, until, visitor } from "./helpers.ts";
import { MatchStream, newVisitor, send, startServer, status, twoPlayerMatch, waitForLog } from "./helpers-match.ts";
import type { MatchServer } from "./helpers-match.ts";

// What a slow or hostile client can cost (ADR 0003): a stream past its
// lifetime is never written again, a seated player always gets a stream, and
// a bot match yields the slot to another visitor once it has had its time.

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function alive(s: MatchServer): Promise<void> {
  const res = await fetch(new URL("/", s.base));
  expect(res.status).toBe(200);
  await res.text();
}

// Stalled readers: GETs never read past their first bytes, one more per
// open(). Node can't shrink a socket's receive buffer and the kernel default
// soaks up megabytes, so a node:net reader never builds a backlog; Python's
// SO_RCVBUF can. Readers opened at different moments reach the lifetime with
// different backlogs, so some sit above zero and below the drop threshold:
// the window a write after end landed in.
interface Stalled {
  open: () => Promise<void>;
  kill: () => void;
}

function stalledReaders(s: MatchServer, path: string, cookie = ""): Stalled {
  const url = new URL(s.base);
  const request = `GET ${path} HTTP/1.1\r\nHost: x\r\nCookie: ${cookie}\r\n\r\n`;
  const script = [
    "import socket, sys",
    "socks = []",
    "for line in sys.stdin:",
    "    s = socket.socket()",
    "    s.setsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF, 4096)",
    `    s.connect((${JSON.stringify(url.hostname)}, ${url.port}))`,
    "    s.sendall(sys.argv[1].encode())",
    "    s.recv(100)",
    "    socks.append(s)",
    "    print('ok', flush=True)",
  ].join("\n");
  const child: ChildProcess = spawn("python3", ["-I", "-c", script, request]);
  const waiting: (() => void)[] = [];
  child.stdout!.on("data", (d: Buffer) => {
    for (let n = d.toString().split("ok").length - 1; n > 0; n--) waiting.shift()?.();
  });
  return {
    open: () =>
      new Promise((resolve) => {
        waiting.push(resolve);
        child.stdin!.write("\n");
      }),
    kill: () => child.kill(),
  };
}

// The same from node:net, paused after the first bytes.
function pausedSocket(s: MatchServer, path: string, cookie = ""): Promise<Socket> {
  const url = new URL(s.base);
  return new Promise((resolve, reject) => {
    const sock = connect({ host: url.hostname, port: Number(url.port) }, () => {
      sock.setNoDelay(true);
      sock.write(`GET ${path} HTTP/1.1\r\nHost: x\r\nCookie: ${cookie}\r\n\r\n`);
      sock.once("data", () => {
        sock.pause();
        resolve(sock);
      });
    });
    sock.on("error", reject);
  });
}

describe("a stream past its lifetime", () => {
  let s: MatchServer;
  beforeAll(async () => {
    // every stalled reader is the same visitor; none may be replaced before its lifetime
    s = await startServer({ MATCH_STREAM_MAX_MS: "1500", EVENTS_STREAM_MAX_MS: "1500", MATCH_STREAMS_PER_TOKEN: "100" });
  });
  afterAll(async () => {
    await s.stop();
  });

  it("seated viewers' stalled streams end while ticks keep coming: the server stays up", async () => {
    const a = await newVisitor(s.base);
    expect((await send(s.base, "/api/match", {}, a)).status).toBe(201);
    expect((await send(s.base, "/api/match/bot", {}, a)).status).toBe(200);
    const stream = new MatchStream(s.base, a);
    await stream.waitFor("view");
    const sock = await pausedSocket(s, "/match/events", a.cookie);
    const stalled = stalledReaders(s, "/match/events", a.cookie);
    for (let k = 0; k < 30; k++) {
      await stalled.open();
      for (let i = 0; i < 20; i++) await send(s.base, "/api/match/step", { ticks: 1 }, a);
    }
    // tick on past every reader's lifetime
    const stop = Date.now() + 2000;
    while (Date.now() < stop) {
      await send(s.base, "/api/match/step", { ticks: 1 }, a);
      await sleep(25);
    }
    await waitForLog(s, (l) => l.event === "stream.close" && l.reason === "lifetime");
    await stream.close();
    stalled.kill();
    sock.destroy();
    await alive(s);
    expect(s.out()).not.toContain("ERR_STREAM_WRITE_AFTER_END");
    await send(s.base, "/api/match/forfeit", {}, a);
  });

  // The scroll's send() destroys a response whose write returns false, and
  // Node never emits a write-after-end error on a destroyed response, so this
  // one held before the guard too; it keeps the lifetime path covered.
  it("the scroll's stalled streams end while events keep coming: the server stays up", async () => {
    const sock = await pausedSocket(s, "/events");
    const stalled = stalledReaders(s, "/events");
    let w = await visitor(s.base);
    let id = await draft(s.base, w);
    const points = Array.from({ length: 200 }, (_, i) => (i * 7) % 200);
    const strokeOn = async (): Promise<void> => {
      if ((await stroke(s.base, w, id, points)).status !== 201) {
        w = await visitor(s.base);
        id = await draft(s.base, w);
      }
    };
    for (let k = 0; k < 20; k++) {
      await stalled.open();
      for (let i = 0; i < 4; i++) await strokeOn();
    }
    const stop = Date.now() + 2000;
    while (Date.now() < stop) {
      await strokeOn();
      await sleep(25);
    }
    stalled.kill();
    sock.destroy();
    await alive(s);
    expect(s.out()).not.toContain("ERR_STREAM_WRITE_AFTER_END");
  });
});

describe("stream slots", () => {
  let s: MatchServer;
  beforeAll(async () => {
    s = await startServer({ MATCH_STREAMS_MAX: "4", MATCH_STREAMS_PER_IP: "3", MATCH_STREAMS_PER_TOKEN: "2" });
  });
  afterAll(async () => {
    await s.stop();
  });

  it("watchers can fill the slots, but a seated player is always admitted", async () => {
    // three watchers fill this address's share
    const watchers = await Promise.all([1, 2, 3].map(() => newVisitor(s.base)));
    const open: MatchStream[] = [];
    for (const w of watchers) {
      const x = new MatchStream(s.base, w);
      await x.waitFor("status");
      open.push(x);
    }
    const late = new MatchStream(s.base, await newVisitor(s.base));
    await until(() => late.status !== 0, 3000);
    expect(late.status).toBe(503);

    const a = await newVisitor(s.base);
    expect((await send(s.base, "/api/match", {}, a)).status).toBe(201);
    expect((await send(s.base, "/api/match/bot", {}, a)).status).toBe(200);
    // past the per-address cap, then past the global cap: the oldest watcher makes room
    const mine = [new MatchStream(s.base, a)];
    await mine[0]!.waitFor("view");
    mine.push(new MatchStream(s.base, a));
    await mine[1]!.waitFor("view");
    expect(mine.every((x) => x.status === 200)).toBe(true);
    const evicted = await waitForLog(s, (l) => l.event === "stream.close" && l.reason === "evicted");
    expect(evicted.who).not.toBe(s.json().find((l) => l.event === "match.create")!.who);
    for (const x of [...open, late, ...mine]) await x.close();
    await send(s.base, "/api/match/forfeit", {}, a);
  });

  it("one visitor holds at most the per-token cap: a new tab replaces their oldest", async () => {
    const v = await newVisitor(s.base);
    const tabs: MatchStream[] = [];
    for (let i = 0; i < 3; i++) {
      const x = new MatchStream(s.base, v);
      await x.waitFor("status");
      tabs.push(x);
    }
    expect(tabs.every((x) => x.status === 200)).toBe(true);
    await waitForLog(s, (l) => l.event === "stream.close" && l.reason === "replaced");
    for (const x of tabs) await x.close();
  });
});

describe("holding the slot against the bot", () => {
  let s: MatchServer;
  beforeAll(async () => {
    s = await startServer({ MATCH_BOT_YIELD_MS: "800" });
  });
  afterAll(async () => {
    await s.stop();
  });

  it("a bot match yields to another visitor once it has had its time, not before", async () => {
    const a = await newVisitor(s.base);
    const b = await newVisitor(s.base);
    expect((await send(s.base, "/api/match", {}, a)).status).toBe(201);
    expect((await send(s.base, "/api/match/bot", {}, a)).status).toBe(200);
    expect((await send(s.base, "/api/match", {}, b)).data.error).toBe("match-busy");
    await sleep(900);
    // the holder can't yield to themselves
    expect((await send(s.base, "/api/match", {}, a)).data.error).toBe("already-seated");
    const c = await send(s.base, "/api/match", {}, b);
    expect(c.status).toBe(201);
    expect(c.data).toMatchObject({ status: "waiting", you: 0 });
    const end = await waitForLog(s, (l) => l.event === "match.end" && l.reason === "yielded");
    expect(end).toMatchObject({ winner: null, west: "bot" });
    expect((await status(s.base, a)).status).toBe("waiting");
    // the holder can take the open seat and play the challenger
    expect((await send(s.base, "/api/match/join", {}, a)).status).toBe(200);
    await send(s.base, "/api/match/forfeit", {}, a);
  });

  it("a match between two people never yields", async () => {
    const { a } = await twoPlayerMatch(s.base);
    await sleep(900);
    const c = await newVisitor(s.base);
    expect((await send(s.base, "/api/match", {}, c)).data.error).toBe("match-busy");
    await send(s.base, "/api/match/forfeit", {}, a);
  });
});
