import { afterAll, beforeAll, expect, it } from "vitest";
import { markOf } from "../src/mark.ts";
import { newVisitor, send, startServer, status, waitForLog } from "./helpers-match.ts";
import type { MatchServer } from "./helpers-match.ts";
import type { Visitor } from "./helpers.ts";

// Who may see and change what, for the match's lifecycle (ADR 0002).
let s: MatchServer;
let a: Visitor;
let b: Visitor;
let c: Visitor;
beforeAll(async () => {
  s = await startServer();
  a = await newVisitor(s.base);
  b = await newVisitor(s.base);
  c = await newVisitor(s.base);
});
afterAll(() => s.stop());

it("starts with no match, and refuses actions on none", async () => {
  expect(await status(s.base, a)).toMatchObject({ status: "none", you: null, view: null, result: null, manualTicks: true });
  expect((await send(s.base, "/api/match/join", {}, a)).data.error).toBe("no-match");
  expect((await send(s.base, "/api/match/bot", {}, a)).data.error).toBe("no-match");
  expect((await send(s.base, "/api/match/forfeit", {}, a)).data.error).toBe("no-match");
});

it("refuses POSTs without a seal, a forged seal, or JSON", async () => {
  for (const who of [undefined, "seal=not-a-uuid", "seal=%"]) {
    const r = await send(s.base, "/api/match", {}, who);
    expect(r.status).toBe(409);
    expect(r.data.error).toBe("no-seal");
  }
  const form = await fetch(new URL("/api/match", s.base), {
    method: "POST",
    headers: { Cookie: a.cookie, "Content-Type": "application/x-www-form-urlencoded" },
    body: "x=1",
  });
  expect(form.status).toBe(400);
  expect((await status(s.base)).status).toBe("none");
});

it("creates, joins and plays: each viewer sees only their own status", async () => {
  const created = await send(s.base, "/api/match", {}, a);
  expect(created.status).toBe(201);
  expect(created.data).toMatchObject({ status: "waiting", you: 0, seatsOpen: [1], view: null });
  expect((await send(s.base, "/api/match", {}, a)).data.error).toBe("already-seated");
  expect((await send(s.base, "/api/match", {}, b)).data.error).toBe("match-busy");
  expect((await send(s.base, "/api/match/bot", {}, b)).status).toBe(403);

  const joined = await send(s.base, "/api/match/join", {}, b);
  expect(joined.status).toBe(200);
  expect(joined.data).toMatchObject({ status: "playing", you: 1, seatsOpen: [] });
  expect((joined.data.view as { seat: number }).seat).toBe(1);

  const sa = await status(s.base, a);
  expect(sa.you).toBe(0);
  expect((sa.view as { seat: number }).seat).toBe(0);

  // a third visitor, and a stranger, see that a match is on and nothing more
  for (const who of [c, undefined]) {
    const sc = await status(s.base, who);
    expect(sc).toMatchObject({ status: "playing", you: null, view: null, result: null });
    expect(JSON.stringify(sc)).not.toContain(a.token);
    expect(JSON.stringify(sc)).not.toContain(markOf(a.token));
  }
  expect((await send(s.base, "/api/match/join", {}, c)).data.error).toBe("match-full");
  expect((await send(s.base, "/api/match/join", {}, b)).data.error).toBe("already-seated");
  expect((await send(s.base, "/api/match/bot", {}, a)).data.error).toBe("match-full");
  for (const [path, code, err] of [
    ["/api/match/command", 403, "not-seated"],
    ["/api/match/forfeit", 403, "not-seated"],
    ["/api/match/step", 403, "not-seated"],
    ["/api/match", 409, "match-busy"],
  ] as const) {
    const r = await send(s.base, path, path.endsWith("command") ? { type: "stop", units: [3] } : { ticks: 1 }, c);
    expect([r.status, r.data.error]).toEqual([code, err]);
  }
  const step = await send(s.base, "/api/match/step", { ticks: 8 }, a);
  expect(step.status).toBe(200);
  expect((step.data.view as { tick: number }).tick).toBe(8);
  expect((await send(s.base, "/api/match/step", { ticks: 401 }, a)).status).toBe(400);
});

it("logs the lifecycle by mark, and never a token", async () => {
  const create = await waitForLog(s, (l) => l.event === "match.create");
  expect(create).toMatchObject({ who: markOf(a.token), seat: 0 });
  expect(await waitForLog(s, (l) => l.event === "match.join")).toMatchObject({ who: markOf(b.token), seat: 1 });
  expect(await waitForLog(s, (l) => l.event === "match.start")).toMatchObject({ east: markOf(a.token), west: markOf(b.token), map: "scroll-1" });
  const denied = await waitForLog(s, (l) => l.event === "denied" && l.reason === "not-seated");
  expect(denied.who).toBe(markOf(c.token));
  await waitForLog(s, (l) => l.event === "request" && l.route === "POST /api/match/join");
  for (const t of [a.token, b.token, c.token]) expect(s.out()).not.toContain(t);
});

it("plays the bot from seat 0 once the slot is free", async () => {
  expect((await send(s.base, "/api/match/forfeit", {}, a)).status).toBe(200);
  const end = await waitForLog(s, (l) => l.event === "match.end");
  expect(end).toMatchObject({ reason: "forfeit", winnerSeat: 1, winner: markOf(b.token) });
  const created = await send(s.base, "/api/match", {}, c);
  expect(created.status).toBe(201);
  expect((await send(s.base, "/api/match/bot", {}, a)).status).toBe(403);
  const started = await send(s.base, "/api/match/bot", {}, c);
  expect(started.data).toMatchObject({ status: "playing", you: 0 });
  expect(await waitForLog(s, (l) => l.event === "match.bot")).toMatchObject({ who: markOf(c.token) });
  expect(await waitForLog(s, (l) => l.event === "match.start" && l.west === "bot")).toMatchObject({ east: markOf(c.token) });
  expect((await send(s.base, "/api/match/step", { ticks: 40 }, c)).status).toBe(200);
  expect((await status(s.base, a)).result).toBeNull();
});
