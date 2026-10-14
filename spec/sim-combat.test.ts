import { describe, expect, it } from "vitest";
import { createMatch, UNITS, type SimEvent, type SimState } from "../src/sim/index.ts";
import { clearUnits, command, place, run } from "../src/sim/testing.ts";

// Fights between the two seats' pieces: who answers whom, and what a group
// does once its target falls (feedback F-2, F-8).

const fresh = (): SimState => {
  const s = createMatch("scroll-1", 1);
  clearUnits(s);
  s.entities = s.entities.filter((e) => e.side !== "wild"); // no creatures in the way
  return s;
};
const alive = (s: SimState, ids: number[]) => ids.filter((id) => s.entities.some((e) => e.id === id));
const hallOf = (s: SimState, seat: 0 | 1) => s.entities.find((e) => e.kind === "hall" && e.side === seat)!;

describe("spearmen against a labourer mob (F-2)", () => {
  // the repro: spearmen beating on the west hall, every labourer sent at them
  function mob(labourers: number, spearmen: number) {
    const s = fresh();
    const hall = hallOf(s, 1); // top-left (5,14), 3×3
    const sp = Array.from({ length: spearmen }, (_, i) => place(s, "spearman", 0, 8, 13 + i));
    command(s, 0, { type: "attack", units: sp.map((e) => e.id), target: hall.id }, 10);
    const labs = Array.from({ length: labourers }, (_, i) => place(s, "labourer", 1, 11 + (i % 2), 11 + Math.floor(i / 2)));
    const events: SimEvent[] = [];
    // the economist's orders: everyone at the first spearman, again and again
    for (let round = 0; round < 8; round++) {
      const target = alive(s, sp.map((e) => e.id))[0];
      const mine = alive(s, labs.map((e) => e.id));
      if (target === undefined || mine.length === 0) break;
      events.push(...command(s, 1, { type: "attack", units: mine, target }, 30));
    }
    events.push(...run(s, 200));
    return { s, sp: alive(s, sp.map((e) => e.id)), labs: alive(s, labs.map((e) => e.id)), events };
  }

  it("an even-cost fight goes to the spearmen", () => {
    expect(8 * UNITS.labourer.cost).toBe(5 * UNITS.spearman.cost);
    const { sp, labs } = mob(8, 5);
    expect(labs).toEqual([]);
    expect(sp.length).toBeGreaterThanOrEqual(3);
  });

  it("spearmen hit while beating on a building turn on their attackers", () => {
    const { events } = mob(8, 5);
    const killed = events.filter((e) => e.type === "unit.died" && e.kind === "labourer");
    expect(killed.length).toBe(8);
    expect(killed.every((e) => e.type === "unit.died" && e.byKind === "spearman" && e.bySide === 0)).toBe(true);
  });

  it("a unit on an explicit order to fight a unit keeps to it when someone else strikes it", () => {
    const s = fresh();
    const a = place(s, "spearman", 0, 30, 10);
    const chosen = place(s, "labourer", 1, 33, 10);
    const pest = place(s, "labourer", 1, 29, 10);
    command(s, 0, { type: "attack", units: [a.id], target: chosen.id });
    command(s, 1, { type: "attack", units: [pest.id], target: a.id }, 12);
    expect(a.order).toMatchObject({ type: "attack", target: chosen.id });
  });
});

describe("defending nearby people", () => {
  function raid(order: boolean, byCreature = false) {
    const s = fresh();
    const lab = place(s, "labourer", 0, 30, 10);
    const guard = place(s, "spearman", 0, 40, 10);
    if (order) command(s, 0, { type: "move", units: [guard.id], x: 40, y: 20 });
    const foe = byCreature ? place(s, "labourer", 1, 29, 10) : place(s, "spearman", 1, 29, 10);
    if (byCreature) {
      foe.side = "wild";
      foe.kind = "pixiu";
    }
    foe.order = { type: "attack", target: lab.id, auto: false };
    run(s, 3);
    return { s, guard, foe };
  }
  it("an idle spearman ten tiles off goes to and attacks the attacker", () => {
    const { s, guard, foe } = raid(false);
    expect(guard.order).toMatchObject({ type: "attack", target: foe.id });
    const x0 = guard.x;
    run(s, 20);
    expect(guard.x).toBeLessThan(x0);
  });
  it("a spearman on an explicit move order is not pulled", () => {
    const { guard } = raid(true);
    expect(guard.order).toMatchObject({ type: "move" });
  });
  it("a labourer hit by a creature does not pull it", () => {
    const { guard } = raid(false, true);
    expect(guard.order).toBeNull();
  });
});

describe("after the target falls (F-8)", () => {
  it("a group sent to attack moves on to the nearest enemy in view, units before buildings", () => {
    const s = fresh();
    const sp = [0, 1, 2].map((i) => place(s, "spearman", 0, 30, 10 + i));
    const first = place(s, "labourer", 1, 32, 11);
    const next = place(s, "labourer", 1, 34, 13);
    const ev = command(s, 0, { type: "attack", units: sp.map((e) => e.id), target: first.id }, 80);
    const died = ev.filter((e) => e.type === "unit.died").map((e) => (e as { unit: number }).unit);
    expect(died).toEqual([first.id, next.id]);
    expect(sp.every((e) => e.task === "idle")).toBe(true);
  });

  it("goes idle when nothing is left in reach, and never picks a peaceful creature", () => {
    const s = createMatch("scroll-1", 1);
    clearUnits(s);
    const q = s.entities.find((e) => e.kind === "qilin")!;
    // beside the glade: the qilin is in view and close, but not fighting them
    const sp = [0, 1].map((i) => place(s, "spearman", 0, 62 + i, 26));
    const prey = place(s, "labourer", 1, 64, 25);
    command(s, 0, { type: "attack", units: sp.map((e) => e.id), target: prey.id }, 40);
    expect(s.entities.includes(prey)).toBe(false);
    expect(sp.every((e) => e.order === null)).toBe(true);
    expect(q.targetId).toBe(0);
  });

  it("labourers sent to attack move on too", () => {
    const s = fresh();
    const labs = [0, 1, 2, 3].map((i) => place(s, "labourer", 0, 30, 10 + i));
    const a = place(s, "labourer", 1, 31, 11);
    const b = place(s, "labourer", 1, 32, 14);
    command(s, 0, { type: "attack", units: labs.map((e) => e.id), target: a.id }, 200);
    expect(s.entities.includes(a)).toBe(false);
    expect(s.entities.includes(b)).toBe(false);
  });
});
