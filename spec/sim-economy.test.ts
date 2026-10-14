import { describe, expect, it } from "vitest";
import { BUILDINGS, createMatch, POP_CAP, step, UNITS, validateCommand, type SimEvent, type SimState } from "../src/sim/index.ts";
import { MAPS } from "../src/sim/map.ts";
import { command, place, run } from "../src/sim/testing.ts";

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

  it("moves on to the nearest grove it has seen when its grove runs dry, never the nian's (F-5)", () => {
    const s = createMatch("scroll-1", 1);
    const lab = s.entities.find((e) => e.side === 0 && e.kind === "labourer")!;
    // the economist's home grove, (108..109, 8..10), nearly dry
    for (let y = 8; y <= 10; y++) for (let x = 108; x <= 109; x++) s.groveGrain[y * s.width + x] = 2;
    // the next grove out, (98..100, 5..6), seen but not near enough for the old 4-tile search
    for (let y = 5; y <= 6; y++) for (let x = 98; x <= 100; x++) s.revealed[0][y * s.width + x] = "g".charCodeAt(0);
    command(s, 0, { type: "gather", units: [lab.id], x: 108, y: 8 }, 400);
    expect(lab.task === "gathering" || lab.task === "carrying").toBe(true);
    const next = [5, 6].flatMap((y) => [98, 99, 100].map((x) => s.groveGrain[y * s.width + x]));
    expect(next.some((g, i) => g < def.grove[[5, 6][Math.floor(i / 3)] * s.width + 98 + (i % 3)])).toBe(true);
  });

  it("goes home and idles when the only seen grove left is inside the nian's leash", () => {
    const s = createMatch("scroll-1", 1);
    const isNian = (i: number) => i % s.width >= 56 && i % s.width <= 60 && i < 3 * s.width;
    for (let i = 0; i < s.groveGrain.length; i++) {
      if (!isNian(i)) s.groveGrain[i] = 0;
      if (def.terrain[i] === "g") s.revealed[0][i] = "g".charCodeAt(0);
    }
    const full = s.groveGrain.filter((g) => g > 0).length;
    expect(full).toBeGreaterThan(0);
    // the grove at (66..67, 12..13), ten tiles from the nian's: one grain left
    s.groveGrain[12 * s.width + 66] = 1;
    const lab = place(s, "labourer", 0, 65, 12);
    command(s, 0, { type: "gather", units: [lab.id], x: 66, y: 12 }, 20);
    expect(lab.task).toBe("carrying"); // one grain in hand, heading home, not north
    run(s, 400);
    expect(lab.task).toBe("idle");
    expect(s.groveGrain.filter((g) => g > 0).length).toBe(full);
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
    // both economies keep growing (they used to stall at 26 each, every
    // labourer idle once the home groves ran dry); path tie-breaks aren't
    // mirror-exact, so the two sides land close, not equal
    expect(labs(0).length).toBeGreaterThan(30);
    expect(Math.abs(labs(0).length - labs(1).length)).toBeLessThanOrEqual(3);
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
