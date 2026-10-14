import { afterAll, beforeAll, expect, it } from "vitest";
import { markOf } from "../src/mark.ts";
import { sealGlyph } from "../src/seal.ts";
import { page } from "./helpers.ts";
import type { Visitor } from "./helpers.ts";
import { newVisitor, send, startServer, status, twoPlayerMatch, waitForLog } from "./helpers-match.ts";
import type { MatchServer } from "./helpers-match.ts";

// A finished match's chronicle becomes one ordinary colophon per player, once.
let s: MatchServer;
let a: Visitor;
let b: Visitor;
let c: Visitor;
let matchId: number;

beforeAll(async () => {
  s = await startServer();
  ({ a, b, matchId } = await twoPlayerMatch(s.base));
  c = await newVisitor(s.base);
});
afterAll(() => s.stop());

it("refuses before the match ends, and to anyone who didn't sit in it", async () => {
  expect((await send(s.base, "/api/match/chronicle", { matchId }, a)).data.error).toBe("not-ended");
  expect((await send(s.base, "/api/match/chronicle", { matchId: 9999 }, a)).status).toBe(404);
  await send(s.base, "/api/match/step", { ticks: 20 }, a);
  await send(s.base, "/api/match/forfeit", {}, b);
  const r = await send(s.base, "/api/match/chronicle", { matchId }, c);
  expect([r.status, r.data.error]).toEqual([403, "not-yours"]);
  expect(await waitForLog(s, (l) => l.event === "denied" && l.route === "POST /api/match/chronicle" && l.who === markOf(c.token))).toMatchObject({
    owner: markOf(a.token),
  });
  expect((await status(s.base, c)).result).toBeNull();
});

it("writes a chronicle from the match's own events, naming players by glyph", async () => {
  const result = (await status(s.base, a)).result as { chronicle: string; chronicleSealed: boolean };
  expect(result.chronicle.length).toBeLessThanOrEqual(320);
  expect(result.chronicle).toContain(sealGlyph(a.token));
  expect(result.chronicle).toContain("yielded");
  expect(result.chronicle).not.toContain(markOf(a.token));
  expect(result.chronicleSealed).toBe(false);
});

it("seals exactly once under two concurrent presses, as the sealer's own colophon", async () => {
  const [x, y] = await Promise.all([
    send(s.base, "/api/match/chronicle", { matchId }, a),
    send(s.base, "/api/match/chronicle", { matchId }, a),
  ]);
  expect([x.status, y.status].sort()).toEqual([201, 409]);
  const id = (x.status === 201 ? x.data : y.data).id as number;
  expect((x.status === 409 ? x.data : y.data).error).toBe("sealed");
  expect((await status(s.base, a)).result).toMatchObject({ chronicleSealed: true });
  await waitForLog(s, (l) => l.event === "chronicle.seal" && l.colophon === id && l.who === markOf(a.token));

  const mine = await page(s.base, a);
  const theirs = await page(s.base, b);
  const entry = new RegExp(`class="colophon( colophon--mine)?" data-colophon-id="${id}"`);
  expect(entry.exec(mine)?.[1]).toBe(" colophon--mine");
  expect(entry.exec(theirs)?.[1]).toBeUndefined();
  expect(entry.test(theirs)).toBe(true);

  // the other player seals their own copy once too
  expect((await send(s.base, "/api/match/chronicle", { matchId }, b)).status).toBe(201);
  expect((await send(s.base, "/api/match/chronicle", { matchId }, b)).status).toBe(409);
  for (const t of [a.token, b.token, c.token]) expect(s.out()).not.toContain(t);
});
