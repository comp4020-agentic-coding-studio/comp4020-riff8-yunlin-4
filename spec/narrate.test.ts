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
  expect(out[2]).toContain("鑑·3fa9c2 in the east against the bot in the west");
  expect(out[3]).toBe("14:02:19 鑑·3fa9c2 (east) ordered 6 units to move");
  expect(out[4]).toContain("gave 3 move orders to 14 units");
  expect(out[5]).toContain("nian");
  expect(out[5]).toContain("鑑·3fa9c2");
  expect(out[6]).toBe("14:02:19 a 蛟龍 jiaolong took 3 of 鑑·3fa9c2's labourers");
  expect(out[7]).toContain("fell to 鑑·3fa9c2 (east)'s spearman");
  expect(out[8]).toContain("賞·77c1a0 tried to command a unit that is not theirs (it is 鑑·3fa9c2's): refused");
  expect(out[9]).toContain("9m 30s (2280 ticks at 4 a second): 鑑·3fa9c2 (east) won by taking the hall");
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
