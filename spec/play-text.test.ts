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

import { attackWarnings, describeEvent, headings, sightings, snapshot } from "../scripts/lib/render-view.ts";
import type { SeatView } from "../src/sim/types.ts";

describe("warnings and headings", () => {
  const base = viewFor(createMatch("scroll-1", 1), 0);
  const ent = (id: number, kind: any, side: any, x: number, y: number, hp = 10) => ({ id, kind, side, x, y, hp, maxHp: 10, task: "idle" as const });
  const v = (entities: any[], tick = 1): SeatView => ({ ...base, tick, entities });
  it("warns once per area when own units lose hp or die", () => {
    const a = snapshot(v([ent(3, "labourer", 0, 20, 14), ent(4, "labourer", 0, 22, 14)]));
    const b = snapshot(v([ent(3, "labourer", 0, 20, 14, 4), ent(4, "labourer", 0, 22, 14, 3)], 2));
    expect(attackWarnings(a, b, [], 0, v([]))).toEqual(["YOUR LABOURERS ARE UNDER ATTACK on the far side, north half (20,14)"]);
    const died = { type: "unit.died", tick: 2, side: 0, unit: 9, kind: "spearman", cause: "soldier", byKind: "spearman", bySide: 1, x: 90, y: 2 } as any;
    expect(attackWarnings(a, b, [died], 0, v([]))).toHaveLength(2);
  });
  it("warns about own deaths to the enemy or a creature even with no hp drop seen", () => {
    const a = snapshot(v([]));
    const d = (unit: number, cause: string, bySide: any, byKind: string) => ({ type: "unit.died", tick: 2, side: 0, unit, kind: "labourer", cause, byKind, bySide, x: 91, y: 0 }) as any;
    const evs = [d(1, "soldier", 1, "spearman"), d(2, "soldier", 1, "spearman"), d(3, "creature", "wild", "nian")];
    const w = attackWarnings(a, snapshot(v([], 2)), evs, 0, v([], 2));
    expect(w).toHaveLength(1);
    expect(w[0]).toMatch(/^YOUR LABOURERS ARE UNDER ATTACK on the far side, north half \(91,0\): 3 killed by enemy spearmen and the /);
    expect(attackWarnings(a, snapshot(v([], 2)), [d(4, "soldier", 0, "spearman")], 0, v([], 2))).toEqual([]);
    expect(sightings(a, v([], 2), evs)).toEqual(["Enemy spearmen sighted on the far side, north half (91,0) — they killed 2 of yours"]);
    expect(sightings(a, v([], 2), [d(3, "creature", "wild", "nian")])).toEqual([]);
  });
  it("reports newly sighted enemy spearmen with a count", () => {
    const foes = [1, 2, 3].map((i) => ent(10 + i, "spearman", 1, 21 + i, 10));
    expect(sightings(undefined, v(foes))).toEqual(["Enemy spearmen sighted on the far side, north half (22,10) — 3 of them"]);
    expect(sightings(snapshot(v(foes)), v(foes))).toEqual([]);
  });
  it("gives a pixiu a compass heading", () => {
    const prev = snapshot(v([ent(7, "pixiu", "wild", 55, 20)]));
    expect(headings(prev, v([ent(7, "pixiu", "wild", 55, 17)]))[7]).toBe("north");
  });
  it("never writes 'spearmans'", () => {
    const d = (side: any, bySide: any) => ({ type: "unit.died", tick: 2, side, unit: 9, kind: "spearman", cause: "soldier", byKind: "spearman", bySide, x: 91, y: 0 }) as any;
    const wild = { type: "unit.died", tick: 2, side: "wild", unit: 8, kind: "nian", cause: "soldier", byKind: "spearman", bySide: 0, x: 5, y: 5 } as any;
    const evs = [d(0, 1), d(1, 0), wild];
    const a = snapshot(v([]));
    const all = [...evs.map((e) => describeEvent(e, 0)), ...attackWarnings(a, snapshot(v([], 2)), evs, 0, v([], 2)), ...sightings(a, v([], 2), evs)].join("\n");
    expect(all).toContain("spearmen");
    expect(all).not.toContain("spearmans");
  });
});
