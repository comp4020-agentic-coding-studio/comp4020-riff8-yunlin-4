import { describe, expect, it } from "vitest";
import { createMatch, viewFor } from "../src/sim/index.ts";
import { renderView } from "../scripts/lib/render-view.ts";

describe("text renderer", () => {
  const lines = renderView(viewFor(createMatch("scroll-1", 1), 0));
  it("has a header, one row per map line, and stays compact", () => {
    expect(lines[0]).toMatch(/^tick 0 \(0:00\) · grain 200 · pop 4\/40 · you: east \(seat 0\)$/);
    expect(lines.length).toBeLessThan(80);
  });
  it("draws own hall and labourers", () => {
    const body = lines.join("\n");
    expect(body).toContain("HHH");
    expect(body).toContain("L");
    expect(body).toMatch(/labourers: 4 idle/);
  });
});

import { attackWarnings, headings, sightings, snapshot } from "../scripts/lib/render-view.ts";
import type { SeatView } from "../src/sim/types.ts";

describe("warnings and headings", () => {
  const base = viewFor(createMatch("scroll-1", 1), 0);
  const ent = (id: number, kind: any, side: any, x: number, y: number, hp = 10) => ({ id, kind, side, x, y, hp, maxHp: 10, task: "idle" as const });
  const v = (entities: any[], tick = 1): SeatView => ({ ...base, tick, entities });
  it("warns once per area when own units lose hp or die", () => {
    const a = snapshot(v([ent(3, "labourer", 0, 20, 14), ent(4, "labourer", 0, 22, 14)]));
    const b = snapshot(v([ent(3, "labourer", 0, 20, 14, 4), ent(4, "labourer", 0, 22, 14, 3)], 2));
    expect(attackWarnings(a, b, [], 0)).toEqual(["YOUR LABOURERS ARE UNDER ATTACK near (20,14)"]);
    const died = { type: "unit.died", tick: 2, side: 0, unit: 9, kind: "spearman", cause: "soldier", byKind: "spearman", bySide: 1, x: 90, y: 2 } as any;
    expect(attackWarnings(a, b, [died], 0)).toHaveLength(2);
  });
  it("warns about own deaths to the enemy or a creature even with no hp drop seen", () => {
    const a = snapshot(v([]));
    const d = (unit: number, cause: string, bySide: any, byKind: string) => ({ type: "unit.died", tick: 2, side: 0, unit, kind: "labourer", cause, byKind, bySide, x: 91, y: 0 }) as any;
    const evs = [d(1, "soldier", 1, "spearman"), d(2, "soldier", 1, "spearman"), d(3, "creature", "wild", "nian")];
    const w = attackWarnings(a, snapshot(v([], 2)), evs, 0);
    expect(w).toHaveLength(1);
    expect(w[0]).toMatch(/^YOUR LABOURERS ARE UNDER ATTACK near \(91,0\): 3 killed by enemy spearmen and the /);
    expect(attackWarnings(a, snapshot(v([], 2)), [d(4, "soldier", 0, "spearman")], 0)).toEqual([]);
    expect(sightings(a, v([], 2), evs)).toEqual(["Enemy spearmen sighted near (91,0) — they killed 2 of yours"]);
    expect(sightings(a, v([], 2), [d(3, "creature", "wild", "nian")])).toEqual([]);
  });
  it("reports newly sighted enemy spearmen with a count", () => {
    const foes = [1, 2, 3].map((i) => ent(10 + i, "spearman", 1, 21 + i, 10));
    expect(sightings(undefined, v(foes))).toEqual(["Enemy spearmen sighted near (22,10) — 3 of them"]);
    expect(sightings(snapshot(v(foes)), v(foes))).toEqual([]);
  });
  it("gives a pixiu a compass heading", () => {
    const prev = snapshot(v([ent(7, "pixiu", "wild", 55, 20)]));
    expect(headings(prev, v([ent(7, "pixiu", "wild", 55, 17)]))[7]).toBe("north");
  });
});
