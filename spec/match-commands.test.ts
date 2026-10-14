import { afterAll, beforeAll, expect, it } from "vitest";
import { markOf } from "../src/mark.ts";
import { createMatch } from "../src/sim/index.ts";
import { ownEntities, send, startServer, status, twoPlayerMatch, waitForLog } from "./helpers-match.ts";
import type { MatchServer, ViewEntity } from "./helpers-match.ts";
import type { Visitor } from "./helpers.ts";

// A command naming anything but the commander's own live piece is answered
// byte-for-byte the same, so a fogged enemy can't be probed (ADR 0002).
let s: MatchServer;
let a: Visitor;
let b: Visitor;
let mineA: ViewEntity[];
let mineB: ViewEntity[];
const creatureId = createMatch("scroll-1", 1).entities.find((e) => e.side === "wild")!.id;

beforeAll(async () => {
  s = await startServer();
  ({ a, b } = await twoPlayerMatch(s.base));
  mineA = await ownEntities(s.base, a);
  mineB = await ownEntities(s.base, b);
});
afterAll(() => s.stop());

const labourers = (es: ViewEntity[]) => es.filter((e) => e.kind === "labourer").map((e) => e.id);

it("accepts a command for your own units, applied at the next tick", async () => {
  const r = await send(s.base, "/api/match/command", { type: "stop", units: labourers(mineA).slice(0, 2) }, a);
  expect(r.status).toBe(202);
  expect(r.data.tick).toBe(1);
  expect((await send(s.base, "/api/match/step", { ticks: 1 }, a)).status).toBe(200);
  const line = await waitForLog(s, (l) => l.event === "command", 4000);
  expect(line).toMatchObject({ who: markOf(a.token), seat: 0, type: "stop", units: 2, n: 1 });
  expect(JSON.stringify(line)).not.toContain(String(labourers(mineA)[0]) + ",");
});

it("answers an enemy's, a creature's and a nonexistent id identically", async () => {
  const enemy = labourers(mineB)[0]!;
  const tries = [enemy, creatureId, 99999, mineB.find((e) => e.kind === "hall")!.id];
  const answers = [];
  for (const id of tries) {
    const r = await send(s.base, "/api/match/command", { type: "move", units: [id], x: 10, y: 10 }, a);
    answers.push([r.status, r.type, r.text]);
  }
  const train = await send(s.base, "/api/match/command", { type: "train", building: mineB.find((e) => e.kind === "hall")!.id, unit: "labourer" }, a);
  answers.push([train.status, train.type, train.text]);
  expect(answers[0]![0]).toBe(422);
  expect(JSON.parse(answers[0]![2] as string)).toEqual({ error: "not-yours", message: "no such unit of yours" });
  for (const x of answers) expect(x).toEqual(answers[0]);

  // the log names the true owner; the response never did
  await waitForLog(s, (l) => l.event === "denied" && l.owner === markOf(b.token));
  await waitForLog(s, (l) => l.event === "denied" && l.owner === "wild");
  await waitForLog(s, (l) => l.event === "denied" && l.reason === "not-yours" && l.owner === "-");
});

it("answers an attack on a fogged enemy as on a target that doesn't exist", async () => {
  const units = labourers(mineA).slice(0, 1);
  const fogged = await send(s.base, "/api/match/command", { type: "attack", units, target: labourers(mineB)[0] }, a);
  const none = await send(s.base, "/api/match/command", { type: "attack", units, target: 99999 }, a);
  expect(fogged.status).toBe(422);
  expect([fogged.status, fogged.type, fogged.text]).toEqual([none.status, none.type, none.text]);
});

it("refuses malformed commands with 400 and caps commands at ten a second", async () => {
  expect((await send(s.base, "/api/match/command", { type: "fly" }, b)).status).toBe(400);
  await new Promise((r) => setTimeout(r, 1100));
  const units = labourers(mineB).slice(0, 1);
  const codes: number[] = [];
  for (let i = 0; i < 14; i++) codes.push((await send(s.base, "/api/match/command", { type: "stop", units }, b)).status);
  expect(codes.slice(0, 10).every((c) => c === 202)).toBe(true);
  expect(codes.slice(10).every((c) => c === 429)).toBe(true);
  const line = await waitForLog(s, (l) => l.event === "denied" && l.reason === "rate", 3000);
  expect(line).toMatchObject({ who: markOf(b.token), count: 4 });
  expect(s.json().filter((l) => l.event === "denied" && l.reason === "rate")).toHaveLength(1);
  expect((await status(s.base, b)).status).toBe("playing");
});

it("tells each seat its own recent events, never the other's fogged ones", async () => {
  const hall = mineA.find((e) => e.kind === "hall")!.id;
  await new Promise((r) => setTimeout(r, 1100));
  expect((await send(s.base, "/api/match/command", { type: "train", building: hall, unit: "labourer" }, a)).status).toBe(202);
  await send(s.base, "/api/match/step", { ticks: 60 }, a);
  const ra = (await status(s.base, a)).recentEvents as { type: string; seat?: number; unit?: number }[];
  const trained = ra.find((e) => e.type === "unit.trained");
  expect(trained).toMatchObject({ seat: 0 });
  const rb = (await status(s.base, b)).recentEvents as { type: string; unit?: number }[];
  expect(rb.some((e) => e.unit === trained!.unit)).toBe(false);
  expect(await status(s.base)).not.toHaveProperty("recentEvents");
});
