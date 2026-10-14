import { expect, it } from "vitest";
import { markOf } from "../src/mark.ts";
import { newVisitor, send, startServer, status, twoPlayerMatch, waitForLog } from "./helpers-match.ts";

// Timers, restarts and the production guard (ADR 0003).

it("in production mode: no manual ticks, and no step route", async () => {
  const s = await startServer({ MATCH_MANUAL_TICKS: undefined });
  try {
    const a = await newVisitor(s.base);
    expect((await status(s.base, a)).manualTicks).toBe(false);
    const r = await send(s.base, "/api/match/step", { ticks: 1 }, a);
    expect(r.status).toBe(404);
    // the real 4 Hz loop runs while a match is played
    await send(s.base, "/api/match", {}, a);
    await send(s.base, "/api/match/bot", {}, a);
    await new Promise((r) => setTimeout(r, 700));
    const tick = ((await status(s.base, a)).view as { tick: number }).tick;
    expect(tick).toBeGreaterThanOrEqual(1);
  } finally {
    await s.stop();
  }
});

it("refuses to boot with manual ticks on Fly", async () => {
  await expect(startServer({ FLY_APP_NAME: "colophon" })).rejects.toThrow(/server exited/);
});

it("forfeits an idle seat, abandons a silent match and an unjoined one", async () => {
  const s = await startServer({ MATCH_IDLE_FORFEIT_MS: "600", MATCH_ABANDON_MS: "1200" });
  try {
    const { a, b } = await twoPlayerMatch(s.base);
    const own = ((await status(s.base, b)).view as { seat: number; entities: { id: number; side: number }[] }).entities;
    const mine = own.filter((e) => e.side === 1).map((e) => e.id);
    // b keeps commanding; a goes quiet and forfeits
    for (let i = 0; i < 4; i++) {
      await send(s.base, "/api/match/command", { type: "stop", units: [mine.at(-1)] }, b);
      await new Promise((r) => setTimeout(r, 250));
    }
    const forfeit = await waitForLog(s, (l) => l.event === "match.forfeit", 3000);
    expect(forfeit).toMatchObject({ who: markOf(a.token), seat: 0, why: "idle" });
    const end = await waitForLog(s, (l) => l.event === "match.end" && l.reason === "forfeit");
    expect(end).toMatchObject({ winnerSeat: 1, winner: markOf(b.token) });
    expect((await status(s.base, b)).result).toMatchObject({ winner: 1, youWon: true, reason: "forfeit" });
    expect((await status(s.base, a)).result).toMatchObject({ winner: 1, youWon: false });

    // nobody commands at all: abandoned with no winner (both idle together isn't a forfeit)
    await twoPlayerMatch(s.base);
    await waitForLog(s, (l) => l.event === "match.end" && l.reason === "abandoned", 4000);

    // nobody joins
    const c = await newVisitor(s.base);
    expect((await send(s.base, "/api/match", {}, c)).status).toBe(201);
    await new Promise((r) => setTimeout(r, 1500));
    expect((await status(s.base, c)).result).toMatchObject({ reason: "abandoned", winner: null });
    expect(s.json().filter((l) => l.event === "match.end" && l.reason === "abandoned")).toHaveLength(2);
  } finally {
    await s.stop();
  }
});

it("ends an in-flight match on restart, and logs it", async () => {
  const s = await startServer();
  const { a, matchId } = await twoPlayerMatch(s.base);
  await send(s.base, "/api/match/step", { ticks: 4 }, a);
  await s.stop();
  const again = await startServer({}, s.dir);
  try {
    const end = await waitForLog(again, (l) => l.event === "match.end");
    expect(end).toMatchObject({ match: matchId, reason: "restart", winner: null });
    // the token isn't in memory any more; the stored hash still knows a's seat
    expect(await status(again.base, a)).toMatchObject({ status: "ended", you: 0, result: { reason: "restart", winner: null } });
    expect((await send(again.base, "/api/match", {}, a)).status).toBe(201);
  } finally {
    await again.stop();
  }
});
