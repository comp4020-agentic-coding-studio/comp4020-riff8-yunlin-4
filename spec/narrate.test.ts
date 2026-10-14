import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";
import { narrateLine, newMemory } from "../scripts/narrate.ts";

const j = (o: Record<string, unknown>) => JSON.stringify({ ts: "2026-10-14T14:02:19.123Z", who: "-", ...o });

const match = [
  j({ event: "match.create", who: "鑑·3fa9c2", match: 12, seat: 0 }),
  j({ event: "match.bot", who: "鑑·3fa9c2", match: 12 }),
  j({ event: "match.start", match: 12, east: "鑑·3fa9c2", west: "bot" }),
  j({ event: "command", who: "鑑·3fa9c2", match: 12, seat: 0, type: "move", units: 6 }),
  j({ event: "command", who: "鑑·3fa9c2", match: 12, seat: 0, type: "move", units: 14, n: 3 }),
  j({ event: "creature.aggro", match: 12, creature: "nian", target: 14, targetSeat: 0, owner: "鑑·3fa9c2" }),
  j({ event: "unit.died", match: 12, seat: 0, kind: "labourer", cause: "creature", by: "jiaolong", count: 3, owner: "鑑·3fa9c2" }),
  j({ event: "unit.died", match: 12, seat: 1, kind: "spearman", cause: "soldier", by: "spearman", bySeat: 0, owner: "bot" }),
  j({ event: "denied", who: "賞·77c1a0", reason: "not-yours", route: "POST /api/match/command", owner: "鑑·3fa9c2" }),
  j({ event: "match.end", match: 12, ticks: 2280, winner: "鑑·3fa9c2", winnerSeat: 0, reason: "hall" }),
];

it("narrates a whole little match", () => {
  const mem = newMemory();
  const out = match.map((l) => narrateLine(l, mem));
  expect(out[0]).toBe("14:02:19 鑑·3fa9c2 created a match and took the east seat");
  expect(out[1]).toContain("called in the bot");
  expect(out[2]).toContain("鑑·3fa9c2 holds the east seat, the bot the west; creatures (年 蛟龍 麒麟 貔貅) belong to neither");
  expect(out[3]).toBe("14:02:19 鑑·3fa9c2 (east) ordered 6 units to move");
  expect(out[4]).toContain("sent move orders 3 times (14 unit-orders in all, counting a unit once per order)");
  expect(out[5]).toContain("年 nian (a creature, no one's side) attacked 鑑·3fa9c2 (east)'s unit 14");
  expect(out[6]).toBe("14:02:19 3 of 鑑·3fa9c2 (east)'s labourers were killed by the 蛟龍 jiaolong");
  expect(out[7]).toContain("fell to 鑑·3fa9c2 (east)'s spearman");
  expect(out[8]).toContain("賞·77c1a0 tried to command a unit that is not theirs (it is 鑑·3fa9c2's): refused");
  expect(out[9]).toContain("9m 30s of game time (2280 ticks at 4 a second): 鑑·3fa9c2 (east) won by taking the hall");
});

it("shows game time, tags sides, and says what was tried", () => {
  const mem = newMemory();
  const n = (o: Record<string, unknown>) => narrateLine(j(o), mem);
  n({ event: "match.start", match: 1, map: "scroll-1", east: "守·57a0ee", west: "bot" });
  expect(n({ event: "match.start", match: 2, map: "scroll-1", east: "守·57a0ee", west: "bot" })).toContain("in the east against");
  expect(n({ event: "build.done", who: "守·57a0ee", match: 1, tick: 533, seat: 0, kind: "barracks" })).toBe(
    "14:02:19 [2:13] 守·57a0ee (east) finished building a barracks",
  );
  expect(n({ event: "chronicle.seal", match: 1, colophon: 3 })).toBe("14:02:19 someone new sealed the chronicle of match 1 onto the scroll as their colophon 3");
  expect(n({ event: "denied", who: "守·57a0ee", reason: "grain", route: "POST /api/match/command", match: 1, type: "train", seat: 0, unit: "spearman" })).toContain(
    "守·57a0ee (east) tried to train a spearman but couldn't afford it: refused",
  );
  expect(
    n({ event: "denied", who: "守·57a0ee", reason: "invalid", route: "x", match: 1, type: "build", seat: 0, building: "barracks", detail: "a barracks needs 2×2 open plain ground" }),
  ).toContain("tried to build a barracks where it can't stand (a barracks needs 2×2 open plain ground): refused");
  expect(n({ event: "command", who: "守·57a0ee", match: 1, tick: 4, seat: 0, type: "train", unit: "spearman", n: 2, units: 0 })).toContain("queued 2 spearmen at the barracks");
  expect(n({ event: "command", who: "守·57a0ee", match: 1, tick: 4, seat: 0, type: "train", unit: "labourer", n: 1, units: 0 })).toContain("queued a labourer at the hall");
  expect(n({ event: "command", who: "守·57a0ee", match: 1, tick: 4, seat: 0, type: "attack", n: 10, units: 36 })).toContain("sent attack orders 10 times (36 unit-orders in all, counting a unit once per order)");
  expect(n({ event: "creature.aggro", match: 1, tick: 8, creature: "nian", target: 22, targetKind: "labourer", targetSeat: 0, owner: "守·57a0ee" })).toContain(
    "attacked 守·57a0ee (east)'s labourer 22",
  );
  expect(n({ event: "unit.died", match: 1, tick: 9, seat: "wild", kind: "pixiu", unit: 5, cause: "soldier", by: "spearman", bySeat: 1, owner: "wild" })).toContain("a 貔貅 pixiu fell to the bot (west)'s spearman");
  expect(n({ event: "unit.died", match: 1, tick: 9, seat: 1, kind: "spearman", unit: 25, cause: "creature", by: "pixiu", owner: "bot" })).toContain(
    "the bot (west)'s spearman 25 was killed by the 貔貅 pixiu",
  );
  expect(n({ event: "unit.died", match: 1, tick: 9, seat: 0, kind: "spearman", unit: 25, cause: "soldier", by: "spearman", bySeat: 1, owner: "守·57a0ee" })).toContain(
    "守·57a0ee (east)'s spearman 25 fell to the bot (west)'s spearman",
  );
});

it("narrates the yielded and lapsed ends", () => {
  const mem = newMemory();
  expect(narrateLine(j({ event: "match.end", match: 3, ticks: 2400, winner: null, winnerSeat: null, reason: "yielded" }), mem)).toContain(
    "yielded the scroll to another visitor after ten minutes against the bot",
  );
  expect(narrateLine(j({ event: "match.end", match: 4, ticks: 0, winner: null, winnerSeat: null, reason: "lapsed" }), mem)).toContain("lapsed: nobody took the second seat");
});

it("handles Fly prefixes, pass-through and quiet", () => {
  const mem = newMemory();
  const req = j({ event: "request", who: "鑑·3fa9c2", method: "GET", route: "GET /", status: 200, ms: 3 });
  expect(narrateLine(`2026-10-14T09:08:37Z app[abc123] syd [info]${req}`, mem)).toBe("14:02:19 鑑·3fa9c2 opened the scroll");
  expect(narrateLine(req, mem, { quiet: true })).toBeNull();
  expect(narrateLine("hello world", mem)).toBe("hello world");
  expect(narrateLine("prefix {not json", mem)).toBe("prefix {not json");
});

it("never throws on garbage", () => {
  const mem = newMemory();
  for (const l of ["", "{", "{}", '{"event":5}', "null", "[1,2]", '{"event":"command","units":{"a":1},"seat":"x"}', "{" + "a".repeat(100_000), "\u0000\u0001{", j({ event: "weird", x: "a\nb".repeat(100) })]) {
    const out = narrateLine(l, mem);
    expect(out === null || typeof out === "string").toBe(true);
    if (out) expect(out.split("\n").length).toBe(1);
  }
});

it("runs as a script over stdin", () => {
  const r = spawnSync("node", ["scripts/narrate.ts", "--quiet"], {
    input: [...match, "plain line", j({ event: "request", route: "GET /match", status: 200 })].join("\n") + "\n",
    encoding: "utf8",
  });
  const lines = r.stdout.trim().split("\n");
  expect(lines).toHaveLength(11);
  expect(lines[3]).toContain("(east) ordered 6 units to move");
  expect(lines[10]).toBe("plain line");
});
