import { describe, expect, it } from "vitest";
import { BUILDINGS, createMatch, POP_CAP, step, UNITS, validateCommand, type SimEvent, type SimState } from "../src/sim/index.ts";
import { MAPS } from "../src/sim/map.ts";
import { command, place } from "../src/sim/testing.ts";

const def = MAPS["scroll-1"];

function invariants(s: SimState) {
  for (const seat of [0, 1] as const) {
    expect(s.grain[seat]).toBeGreaterThanOrEqual(0);
    const pop = s.entities.filter((e) => e.side === seat && (e.kind === "labourer" || e.kind === "spearman")).length;
    expect(pop).toBeLessThanOrEqual(POP_CAP);
  }
  for (const e of s.entities) {
    expect(e.hp).toBeGreaterThan(0);
    if (e.size !== 1) continue;
    const i = e.y * s.width + e.x;
    if (e.side === "wild" && e.kind === "jiaolong") {
      expect("rf").toContain(def.terrain[i]);
      continue;
    }
    // an exhausted grove is plain ground
    const ground = def.terrain[i] === "g" && s.groveGrain[i] === 0 ? "p" : def.terrain[i];
    expect("pflx", `${e.kind} ${e.id} at ${e.x},${e.y}`).toContain(ground);
    expect(s.occ[i]).toBe(0);
  }
  expect(s.groveGrain.every((g) => g >= 0)).toBe(true);
}

describe("economy", () => {
  it("gathers grain, trains a labourer, builds a barracks and trains a spearman", () => {
    const s = createMatch("scroll-1", 3);
    const labs = s.entities.filter((e) => e.side === 0 && e.kind === "labourer").map((e) => e.id);
    const start = s.grain[0];
    const events: SimEvent[] = [];
    events.push(...command(s, 0, { type: "gather", units: labs.slice(0, 3), x: 108, y: 8 }));
    events.push(...command(s, 0, { type: "train", building: 1, unit: "labourer" }));
    expect(s.grain[0]).toBe(start - UNITS.labourer.cost);
    for (let t = 0; t < 200; t++) {
      events.push(...step(s, []));
      invariants(s);
    }
    expect(s.grain[0]).toBeGreaterThan(start - UNITS.labourer.cost);
    expect(events.filter((e) => e.type === "unit.trained")).toEqual([
      expect.objectContaining({ seat: 0, kind: "labourer" }),
    ]);
    expect(s.groveGrain[8 * s.width + 108]).toBeLessThan(def.grove[8 * s.width + 108]);

    // the fourth labourer builds a barracks
    s.grain[0] = 1000;
    events.push(...command(s, 0, { type: "build", units: [labs[3]], building: "barracks", x: 100, y: 18 }));
    const start1 = events.find((e) => e.type === "build.start");
    expect(start1).toMatchObject({ seat: 0, kind: "barracks", x: 100, y: 18 });
    const bid = (start1 as { building: number }).building;
    // not ready to train yet
    expect(validateCommand(s, 0, { type: "train", building: bid, unit: "spearman" })).toMatchObject({ ok: false, reason: "invalid" });
    for (let t = 0; t < BUILDINGS.barracks.buildTicks + 20; t++) {
      events.push(...step(s, []));
      invariants(s);
    }
    expect(events.some((e) => e.type === "build.done" && e.building === bid)).toBe(true);
    events.push(...command(s, 0, { type: "train", building: bid, unit: "spearman" }, UNITS.spearman.trainTicks + 2));
    expect(events.filter((e) => e.type === "unit.trained" && e.kind === "spearman")).toHaveLength(1);
    // the builder went back to idle
    expect(s.entities.find((e) => e.id === labs[3])!.task).toBe("idle");
  });

  it("moves on to the next grove tile when one runs out", () => {
    const s = createMatch("scroll-1", 3);
    const lab = s.entities.find((e) => e.side === 0 && e.kind === "labourer")!;
    s.groveGrain[8 * s.width + 108] = 3;
    command(s, 0, { type: "gather", units: [lab.id], x: 108, y: 8 }, 300);
    expect(s.groveGrain[8 * s.width + 108]).toBe(0);
    expect(lab.task === "gathering" || lab.task === "carrying").toBe(true);
    expect(s.grain[0]).toBeGreaterThan(200 + 10);
  });

  it("holds its invariants through a long two-sided match", () => {
    const s = createMatch("scroll-1", 9);
    const labs = (seat: 0 | 1) => s.entities.filter((e) => e.side === seat && e.kind === "labourer").map((e) => e.id);
    command(s, 0, { type: "gather", units: labs(0), x: 108, y: 8 });
    command(s, 1, { type: "gather", units: labs(1), x: 3, y: 8 });
    for (let t = 0; t < 2400; t++) {
      const cmds = [];
      for (const seat of [0, 1] as const) {
        if (t % 40 === 0) {
          const v = validateCommand(s, seat, { type: "train", building: seat + 1, unit: "labourer" });
          if (v.ok) cmds.push({ seat, command: v.command });
        }
        if (t % 120 === 60) {
          const v = validateCommand(s, seat, { type: "gather", units: labs(seat).slice(0, 40), x: seat === 0 ? 98 : 13, y: 25 });
          if (v.ok) cmds.push({ seat, command: v.command });
        }
      }
      step(s, cmds);
      if (t % 50 === 0) invariants(s);
    }
    invariants(s);
    expect(labs(0).length).toBeGreaterThan(10);
    expect(labs(0).length).toBe(labs(1).length);
  });
});

describe("the end", () => {
  it("ends the match when a hall falls, with a death and a winner", () => {
    const s = createMatch("scroll-1", 3);
    const hall = s.entities.find((e) => e.kind === "hall" && e.side === 1)!;
    const sp = Array.from({ length: 10 }, (_, i) => place(s, "spearman", 0, 9, 11 + i));
    const ev = command(s, 0, { type: "attack", units: sp.map((e) => e.id), target: hall.id }, 2000);
    expect(ev.find((e) => e.type === "unit.died" && e.unit === hall.id)).toMatchObject({ kind: "hall", side: 1, cause: "soldier", bySide: 0 });
    expect(ev.filter((e) => e.type === "match.end")).toEqual([expect.objectContaining({ winner: 0, reason: "hall" })]);
    expect(s.winner).toBe(0);
    const t = s.tick;
    expect(step(s, [])).toEqual([]);
    expect(s.tick).toBe(t);
  });
});
