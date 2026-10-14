import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { until } from "./helpers.ts";
import type { Visitor } from "./helpers.ts";

// Match specs never touch the shared APP_URL server: each spawns its own, on
// its own database and log directory, in manual-tick mode unless told not to.

export interface MatchServer {
  base: string;
  dir: string;
  child: ChildProcess;
  out: () => string;
  json: () => Record<string, unknown>[];
  exited: Promise<number | null>;
  stop: () => Promise<void>;
}

const children = new Set<ChildProcess>();
process.on("exit", () => {
  for (const c of children) c.kill();
});

export async function startServer(env: Record<string, string | undefined> = {}, dir?: string): Promise<MatchServer> {
  const where = dir ?? mkdtempSync(join(tmpdir(), "match-"));
  const port = 8500 + Math.floor(Math.random() * 500);
  const merged: Record<string, string | undefined> = {
    ...process.env,
    PORT: String(port),
    DB_PATH: join(where, "c.db"),
    LOG_DIR: join(where, "logs"),
    MATCH_MANUAL_TICKS: "1",
    FLY_APP_NAME: undefined,
    ...env,
  };
  for (const k of Object.keys(merged)) if (merged[k] === undefined) delete merged[k];
  const child = spawn(process.execPath, ["src/server.ts"], { env: merged as NodeJS.ProcessEnv });
  children.add(child);
  let out = "";
  child.stdout!.on("data", (d: Buffer) => (out += d.toString()));
  child.stderr!.on("data", (d: Buffer) => (out += d.toString()));
  const exited = new Promise<number | null>((resolve) => child.on("exit", (code) => resolve(code)));
  let dead = false;
  void exited.then(() => {
    dead = true;
    children.delete(child);
  });
  const s: MatchServer = {
    base: `http://127.0.0.1:${port}`,
    dir: where,
    child,
    out: () => out,
    json: () =>
      out
        .split("\n")
        .filter((l) => l.startsWith("{"))
        .map((l) => JSON.parse(l) as Record<string, unknown>),
    exited,
    stop: async () => {
      if (!dead) child.kill();
      await exited;
    },
  };
  await until(() => out.includes("listening") || dead, 10000);
  if (dead && !out.includes("listening")) throw new Error(`server exited: ${out}`);
  return s;
}

export async function newVisitor(base: string): Promise<Visitor> {
  const res = await fetch(new URL("/api/match", base));
  await res.text();
  const cookie = res.headers.get("set-cookie")!.split(";")[0]!;
  return { cookie, token: cookie.split("=")[1]! };
}

export interface Raw {
  status: number;
  type: string | null;
  text: string;
  data: Record<string, unknown>;
}

export async function send(base: string, path: string, body: unknown, who?: Visitor | string): Promise<Raw> {
  const cookie = typeof who === "string" ? who : who?.cookie;
  const res = await fetch(new URL(path, base), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    // not JSON (a 404 page)
  }
  return { status: res.status, type: res.headers.get("content-type"), text, data };
}

export async function status(base: string, who?: Visitor): Promise<Record<string, unknown>> {
  const res = await fetch(new URL("/api/match", base), { headers: who ? { Cookie: who.cookie } : {} });
  return (await res.json()) as Record<string, unknown>;
}

export interface ViewEntity {
  id: number;
  kind: string;
  side: number | string;
  x: number;
  y: number;
}

export async function ownEntities(base: string, who: Visitor): Promise<ViewEntity[]> {
  const s = await status(base, who);
  const view = s.view as { seat: number; entities: ViewEntity[] } | null;
  if (!view) throw new Error("no view");
  return view.entities.filter((e) => e.side === view.seat);
}

// Seat 0 = a, seat 1 = b, playing.
export async function twoPlayerMatch(base: string): Promise<{ a: Visitor; b: Visitor; matchId: number }> {
  const a = await newVisitor(base);
  const b = await newVisitor(base);
  const c = await send(base, "/api/match", {}, a);
  if (c.status !== 201) throw new Error(`create: ${c.status} ${c.text}`);
  const j = await send(base, "/api/match/join", {}, b);
  if (j.status !== 200) throw new Error(`join: ${j.status} ${j.text}`);
  return { a, b, matchId: c.data.matchId as number };
}

export async function waitForLog(s: MatchServer, pred: (l: Record<string, unknown>) => boolean, timeout = 3000) {
  await until(() => s.json().some(pred), timeout);
  return s.json().find(pred)!;
}

export interface Frame {
  type: string;
  data: string;
}

// The match stream, read with fetch's streamed body (no EventSource in Node).
export class MatchStream {
  frames: Frame[] = [];
  raw = "";
  status = 0;
  private controller = new AbortController();
  private done: Promise<void>;

  constructor(base: string, who?: Visitor) {
    this.done = this.read(new URL("/match/events", base), who ? { Cookie: who.cookie } : {});
  }

  private async read(url: URL, headers: Record<string, string>): Promise<void> {
    try {
      const res = await fetch(url, { headers, signal: this.controller.signal });
      this.status = res.status;
      if (!res.body) return;
      const decoder = new TextDecoder();
      let pending = "";
      for await (const chunk of res.body) {
        const text = decoder.decode(chunk as Uint8Array, { stream: true });
        this.raw += text;
        pending += text;
        let split: number;
        while ((split = pending.indexOf("\n\n")) !== -1) {
          const block = pending.slice(0, split);
          pending = pending.slice(split + 2);
          const f: Frame = { type: "message", data: "" };
          for (const line of block.split("\n")) {
            if (line.startsWith("event: ")) f.type = line.slice(7);
            else if (line.startsWith("data: ")) f.data = line.slice(6);
          }
          if (f.data) this.frames.push(f);
        }
      }
    } catch {
      // aborted
    }
  }

  of(type: string): Record<string, unknown>[] {
    return this.frames.filter((f) => f.type === type).map((f) => JSON.parse(f.data) as Record<string, unknown>);
  }

  async waitFor(type: string, count = 1, timeout = 3000): Promise<void> {
    await until(() => this.frames.filter((f) => f.type === type).length >= count, timeout);
  }

  close(): Promise<void> {
    this.controller.abort();
    return this.done;
  }
}
