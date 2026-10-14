import { describe, expect, it } from "vitest";
import { createBot } from "../src/bot.ts";
import { MAP_IDS, MAPS, MAX_TICKS, POP_CAP, createMatch, popOfSeat, step, validateCommand, viewFor } from "./soak-helpers.ts";
import type { Command, Seat } from "../src/sim/index.ts";

// Bot against bot on every map: nothing may break, and every match must end.
// Each match logs its outcome so a regression in the bot's pace is visible.

const SEEDS = [1, 2, 3];

function play(mapId: string, seed: number) {
  const state = createMatch(mapId, seed);
  const bots = seed % 2 === 0 ? [createBot({ attackAt: 6 }), createBot({ attackAt: 9 })] : [createBot(), createBot({ attackAt: 7 })];
  const def = MAPS[mapId];
  for (let t = 0; t < MAX_TICKS && state.winner === null; t++) {
    const cmds: { seat: Seat; command: Command }[] = [];
    if (t % 4 === 0) {
      for (const seat of [0, 1] as const) {
        for (const raw of bots[seat](viewFor(state, seat))) {
          const v = validateCommand(state, seat, raw);
          if (v.ok) cmds.push({ seat, command: v.command });
        }
      }
    }
    step(state, cmds);
    if (t % 20 === 0 || state.winner !== null) {
      for (const seat of [0, 1] as const) {
        expect(state.grain[seat]).toBeGreaterThanOrEqual(0);
        expect(popOfSeat(state, seat)).toBeLessThanOrEqual(POP_CAP);
      }
      for (const e of state.entities) {
        if (e.hp <= 0 || e.size !== 1 || e.side === "wild") continue;
        const c = def.terrain[e.y * def.width + e.x];
        expect("pflx").toContain(c === "g" && state.groveGrain[e.y * def.width + e.x] <= 0 ? "p" : c);
        expect(state.occ[e.y * def.width + e.x]).toBe(0);
      }
    }
  }
  return state;
}

describe("bot against bot", () => {
  for (const mapId of MAP_IDS) {
    for (const seed of SEEDS) {
      it(`${mapId} seed ${seed} ends`, { timeout: 30000 }, () => {
        const state = play(mapId, seed);
        const minutes = (state.tick / 240).toFixed(1);
        console.log(`soak ${mapId} seed ${seed}: winner ${state.winner} after ${minutes} min`);
        expect(state.winner !== null || state.tick >= MAX_TICKS).toBe(true);
      });
    }
  }
});
