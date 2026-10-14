import { describe, expect, it } from "vitest";
import { createMatch, viewFor, visibleIds } from "../src/sim/index.ts";
import { byKind, clearUnits, command, place, placeBuilding, run } from "../src/sim/testing.ts";

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

describe("fog: ids and routes", () => {
  // round 2: one global counter let a seat count the enemy's hidden
  // production from the gaps in its own new ids
  it("gives a seat the same ids for its own new pieces whatever the fogged enemy makes", () => {
    const ownIds = (enemyTrains: number) => {
      const s = createMatch("scroll-1", 1);
      s.grain = [10000, 10000];
      const hall = (seat: 0 | 1) => s.entities.find((e) => e.kind === "hall" && e.side === seat)!.id;
      for (let k = 0; k < enemyTrains; k++) command(s, 1, { type: "train", building: hall(1), unit: "labourer" });
      const ids: number[] = [];
      for (let k = 0; k < 3; k++) {
        const ev = command(s, 0, { type: "train", building: hall(0), unit: "labourer" }, 60);
        ids.push(...ev.filter((e) => e.type === "unit.trained" && e.seat === 0).map((e) => (e as { unit: number }).unit));
      }
      run(s, 200);
      return { ids, view: viewFor(s, 0).entities.filter((e) => e.side === 0).map((e) => e.id) };
    };
    const quiet = ownIds(0);
    const busy = ownIds(3);
    expect(quiet.ids).toHaveLength(3);
    expect(busy).toEqual(quiet);
  });

  it("hands out small, unique, positive ids, starting pieces included", () => {
    const s = createMatch("scroll-1", 1);
    const ids = s.entities.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => Number.isSafeInteger(id) && id > 0 && id < 100)).toBe(true);
    expect(ids).toEqual(ids.slice().sort((a, b) => a - b));
  });

  // round 2: a route into fog planned on the true map bent around a hidden
  // enemy building, and so showed where it was
  it("routes a unit into fog the same whether or not an enemy barracks hides in the way, until it comes into view", () => {
    const route = (hidden: boolean) => {
      const s = createMatch("scroll-1", 1);
      clearUnits(s);
      if (hidden) placeBuilding(s, "barracks", 1, 71, 13);
      const u = place(s, "spearman", 0, 92, 16);
      command(s, 0, { type: "move", units: [u.id], x: 70, y: 16 });
      const steps: string[] = [];
      for (let t = 0; t < 120; t++) {
        const seen = viewFor(s, 0).entities.some((e) => e.side === 1 && e.kind === "barracks");
        if (seen) break;
        steps.push(`${u.x},${u.y}`);
        run(s, 1);
      }
      return { steps, x: u.x };
    };
    const open = route(false);
    const blocked = route(true);
    expect(blocked.steps.length).toBeGreaterThan(5);
    expect(blocked.steps).toEqual(open.steps.slice(0, blocked.steps.length));
    // and once it does come into view, the unit goes round it and arrives
    const s = createMatch("scroll-1", 1);
    clearUnits(s);
    placeBuilding(s, "barracks", 1, 71, 13);
    const u = place(s, "labourer", 0, 92, 16); // a labourer doesn't turn on the barracks once there
    command(s, 0, { type: "move", units: [u.id], x: 70, y: 16 }, 200);
    expect([u.x, u.y, u.task]).toEqual([70, 16, "idle"]);
  });
});
