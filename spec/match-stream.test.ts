import { afterAll, beforeAll, expect, it } from "vitest";
import { markOf } from "../src/mark.ts";
import { MatchStream, newVisitor, ownEntities, send, startServer, twoPlayerMatch } from "./helpers-match.ts";
import type { MatchServer } from "./helpers-match.ts";
import type { Visitor } from "./helpers.ts";
import { until } from "./helpers.ts";

// Each seat's stream carries only what that seat has seen (ADR 0002).
let s: MatchServer;
let a: Visitor;
let b: Visitor;
let c: Visitor;
let streamA: MatchStream;
let streamC: MatchStream;
let stranger: MatchStream;

beforeAll(async () => {
  s = await startServer();
  a = await newVisitor(s.base);
  c = await newVisitor(s.base);
  streamA = new MatchStream(s.base, a);
  streamC = new MatchStream(s.base, c);
  stranger = new MatchStream(s.base);
  await until(() => [streamA, streamC, stranger].every((x) => x.frames.length >= 1), 3000);
  // a creates in this tab, b joins: a's open stream is reseated without reconnecting
  expect((await send(s.base, "/api/match", {}, a)).status).toBe(201);
  b = await newVisitor(s.base);
  expect((await send(s.base, "/api/match/join", {}, b)).status).toBe(200);
  for (let i = 0; i < 12; i++) await send(s.base, "/api/match/step", { ticks: 5 }, a);
  await streamA.waitFor("events", 12);
});
afterAll(async () => {
  for (const x of [streamA, streamC, stranger]) await x.close();
  await s.stop();
});

it("sends a fresh status to everyone on each change, computed per viewer", () => {
  expect(streamA.of("status").map((x) => x.status)).toEqual(["none", "waiting", "playing"]);
  expect(streamA.of("status").at(-1)).toMatchObject({ you: 0, view: null });
  expect(streamC.of("status").at(-1)).toMatchObject({ status: "playing", you: null, view: null, result: null });
});

it("a seated viewer gets its own view and events each tick; others get status only", () => {
  expect(streamA.of("view").every((v) => v.seat === 0)).toBe(true);
  expect(streamA.of("events").length).toBe(12);
  // a step's frames come after it: the last view is at the last tick stepped
  expect(streamA.of("view").at(-1)!.tick).toBe(60);
  for (const x of [streamC, stranger]) expect(x.frames.every((f) => f.type === "status")).toBe(true);
});

it("seat 0's frames never carry seat 1's hidden pieces, a token or a mark", async () => {
  const theirs = (await ownEntities(s.base, b)).map((e) => e.id);
  expect(theirs.length).toBeGreaterThan(0);
  for (const f of streamA.frames) {
    if (f.type === "view") {
      const ids = (JSON.parse(f.data) as { entities: { id: number }[] }).entities.map((e) => e.id);
      for (const id of theirs) expect(ids).not.toContain(id);
    }
    if (f.type === "events") {
      for (const e of JSON.parse(f.data) as Record<string, unknown>[]) {
        for (const k of ["unit", "building", "target"]) if (typeof e[k] === "number") expect(theirs).not.toContain(e[k]);
      }
    }
  }
  for (const x of [streamA, streamC, stranger]) {
    for (const secret of [a.token, b.token, markOf(a.token), markOf(b.token)]) expect(x.raw).not.toContain(secret);
  }
});

it("logs stream.open by mark with no request line", async () => {
  await until(() => s.json().some((l) => l.event === "stream.open" && l.who === markOf(a.token)), 2000);
  expect(s.json().some((l) => l.event === "request" && l.route === "GET /match/events")).toBe(false);
});
