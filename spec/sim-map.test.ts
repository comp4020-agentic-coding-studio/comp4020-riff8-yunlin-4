import { describe, expect, it } from "vitest";
import { MAPS, MAP_IDS, createMatch } from "../src/sim/index.ts";

describe("scroll-1", () => {
  const def = MAPS["scroll-1"];
  it("is the one map, a 112×32 strip", () => {
    expect(MAP_IDS).toEqual(["scroll-1"]);
    expect(def.terrain.length).toBe(def.width * def.height);
    expect([def.width, def.height]).toEqual([112, 32]);
  });

  it("mirrors left and right, terrain and grain alike", () => {
    for (let y = 0; y < def.height; y++) {
      for (let x = 0; x < def.width; x++) {
        const i = y * def.width + x;
        const m = y * def.width + (def.width - 1 - x);
        expect(def.terrain[i], `${x},${y}`).toBe(def.terrain[m]);
        expect(def.grove[i]).toBe(def.grove[m]);
      }
    }
    const [[ex, ey], [wx, wy]] = def.halls;
    expect(ex + 2).toBe(def.width - 1 - wx);
    expect(ey).toBe(wy);
  });

  it("puts seat 0 in the east and seat 1 in the west", () => {
    const s = createMatch("scroll-1", 1);
    const halls = s.entities.filter((e) => e.kind === "hall");
    expect(halls.find((h) => h.side === 0)!.x).toBeGreaterThan(80);
    expect(halls.find((h) => h.side === 1)!.x).toBeLessThan(30);
  });
});
