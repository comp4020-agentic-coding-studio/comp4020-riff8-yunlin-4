import { describe, expect, it } from "vitest";
import { createMatch, POP_CAP, step, validateCommand, viewFor, type Command, type Seat } from "../src/sim/index.ts";
import { clearUnits, place } from "../src/sim/testing.ts";

describe("a tick at the cap", () => {
  it("runs both full armies, all walking, well inside the tick", () => {
    const s = createMatch("scroll-1", 5);
    clearUnits(s);
    for (let i = 0; i < POP_CAP; i++) {
      place(s, i < 10 ? "labourer" : "spearman", 0, 90 + (i % 10), 4 + Math.floor(i / 10));
      place(s, i < 10 ? "labourer" : "spearman", 1, 21 - (i % 10), 4 + Math.floor(i / 10));
    }
    const orders = (tick: number): { seat: Seat; command: Command }[] => {
      const out = [];
      for (const seat of [0, 1] as const) {
        const ids = s.entities.filter((e) => e.side === seat && (e.kind === "labourer" || e.kind === "spearman")).map((e) => e.id);
        // far, alternating destinations so every unit always has a long path
        const x = (tick / 40) % 2 === 0 ? (seat === 0 ? 10 : 101) : seat === 0 ? 100 : 11;
        const v = validateCommand(s, seat, { type: "move", units: ids, x, y: 27 });
        if (v.ok) out.push({ seat, command: v.command });
      }
      return out;
    };
    const ticks = 400;
    const t0 = performance.now();
    for (let t = 0; t < ticks; t++) {
      step(s, t % 40 === 0 ? orders(t) : []);
      if (t % 4 === 0) {
        viewFor(s, 0);
        viewFor(s, 1);
      }
    }
    const avg = (performance.now() - t0) / ticks;
    console.log(`average tick at the cap: ${avg.toFixed(2)}ms`);
    expect(avg).toBeLessThan(50);
    expect(s.entities.filter((e) => e.task === "moving" || e.task === "attacking").length).toBeGreaterThan(20);
  });
});
