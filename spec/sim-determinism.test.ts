import { describe, expect, it } from "vitest";
import { createMatch, step, validateCommand, viewFor, type Command, type Seat, type SimState } from "../src/sim/index.ts";

// A fixed script of raw commands by tick, some valid, some not, for both
// seats, run twice from scratch.
function script(s: SimState): { tick: number; seat: Seat; raw: unknown }[] {
  const own = (seat: Seat) => s.entities.filter((e) => e.side === seat && e.kind === "labourer").map((e) => e.id);
  const [a, b] = [own(0), own(1)];
  return [
    { tick: 1, seat: 0, raw: { type: "gather", units: a.slice(0, 3), x: 108, y: 8 } },
    { tick: 1, seat: 1, raw: { type: "gather", units: b.slice(0, 3), x: 3, y: 8 } },
    { tick: 2, seat: 0, raw: { type: "train", building: 1, unit: "labourer" } },
    { tick: 2, seat: 1, raw: { type: "train", building: 2, unit: "labourer" } },
    { tick: 3, seat: 0, raw: { type: "move", units: [a[3]], x: 70, y: 16 } },
    { tick: 3, seat: 1, raw: { type: "move", units: [b[3]], x: 41, y: 16 } },
    { tick: 5, seat: 1, raw: { type: "attack", units: [b[0]], target: a[0] } },
    { tick: 200, seat: 0, raw: { type: "build", units: [a[0]], building: "barracks", x: 100, y: 18 } },
    { tick: 200, seat: 1, raw: { type: "build", units: [b[0]], building: "barracks", x: 10, y: 18 } },
    { tick: 300, seat: 0, raw: { type: "move", units: [a[3]], x: 56, y: 15 } },
  ];
}

function play(ticks: number) {
  const s = createMatch("scroll-1", 42);
  const cmds = script(s);
  const events = [];
  for (let t = 1; t <= ticks; t++) {
    const now: { seat: Seat; command: Command }[] = [];
    for (const c of cmds.filter((c) => c.tick === t)) {
      const v = validateCommand(s, c.seat, c.raw);
      if (v.ok) now.push({ seat: c.seat, command: v.command });
    }
    events.push(...step(s, now));
  }
  return { s, events };
}

describe("determinism", () => {
  it("gives the same state, views and events for the same map, seed and commands", () => {
    const one = play(600);
    const two = play(600);
    expect(one.s.tick).toBe(600);
    expect(two.s).toEqual(one.s);
    expect(two.events).toEqual(one.events);
    expect(viewFor(two.s, 0)).toEqual(viewFor(one.s, 0));
    expect(viewFor(two.s, 1)).toEqual(viewFor(one.s, 1));
    // the script did something
    expect(one.events.some((e) => e.type === "unit.trained")).toBe(true);
    expect(JSON.parse(JSON.stringify(one.s))).toEqual(one.s);
  });

  it("plays both seats the same way from mirrored commands", () => {
    const { s } = play(150);
    // both halls trained a labourer at the same tick from mirrored orders
    const g = s.grain;
    expect(g[0]).toBe(g[1]);
  });
});
