import { describe, expect, it } from "vitest";
import { createMatch, viewFor, visibleIds } from "../src/sim/index.ts";
import { byKind, command, place, run } from "../src/sim/testing.ts";

describe("fog", () => {
  it("shows seat 0 none of seat 1's pieces and none of the west at the start", () => {
    const s = createMatch("scroll-1", 1);
    const v = viewFor(s, 0);
    expect(v.entities.every((e) => e.side === 0)).toBe(true);
    expect(v.entities.filter((e) => e.side === 0).length).toBe(5);
    for (let y = 0; y < v.height; y++) expect(v.ground.slice(y * v.width, y * v.width + 60).trim()).toBe("");
    expect(v.ground.length).toBe(v.width * v.height);
    expect(v.ground).toMatch(/^[ prfghlxPRFGHLX]+$/);
    expect(v.ground).toContain("P");
    // groves only in view, and only seat 0's own grain
    expect(v.groves.every(([x]) => x > 80)).toBe(true);
    expect(v.grain).toBe(s.grain[0]);
  });

  it("forgets an enemy that walks out of sight but keeps the ground inked, paler", () => {
    const s = createMatch("scroll-1", 1);
    const watcher = place(s, "spearman", 0, 80, 16);
    command(s, 0, { type: "stop", units: [watcher.id] });
    const walker = place(s, "labourer", 1, 76, 16);
    expect(visibleIds(s, 0).has(walker.id)).toBe(true);
    expect(viewFor(s, 0).entities.some((e) => e.id === walker.id)).toBe(true);
    // the watcher leaves; the enemy stays put
    command(s, 0, { type: "move", units: [watcher.id], x: 100, y: 16 }, 80);
    command(s, 1, { type: "stop", units: [walker.id] });
    const v = viewFor(s, 0);
    expect(v.entities.some((e) => e.id === walker.id)).toBe(false);
    expect(visibleIds(s, 0).has(walker.id)).toBe(false);
    expect(v.ground[16 * v.width + 76]).toBe("p");
    // nothing about it anywhere in the view
    expect(JSON.stringify(v)).not.toContain(`"id":${walker.id},`);
  });

  it("hides the lurking jiaolong even from a unit standing beside it", () => {
    const s = createMatch("scroll-1", 1);
    const j = byKind(s, "jiaolong");
    // in the south reach of the river, away from the nian; the unit is on the
    // bank, beyond the jiaolong's strike, well inside its own sight
    j.x = 54;
    j.y = 25;
    const scout = place(s, "spearman", 0, 50, 25);
    const v = viewFor(s, 0);
    expect(v.ground[j.y * v.width + j.x]).toBe("R");
    expect(v.entities.some((e) => e.kind === "jiaolong")).toBe(false);
    expect(visibleIds(s, 0).has(j.id)).toBe(false);
    expect(visibleIds(s, 1).has(j.id)).toBe(false);
    run(s, 4);
    expect(viewFor(s, 0).entities.some((e) => e.kind === "jiaolong")).toBe(false);
    expect(scout.hp).toBe(scout.maxHp);
  });
});
