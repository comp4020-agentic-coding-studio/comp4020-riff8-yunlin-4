export { MAP_IDS, MAPS, createMatch, step, validateCommand, viewFor, summary } from "../src/sim/index.ts";
export { MAX_TICKS, POP_CAP } from "../src/sim/balance.ts";
import { summary } from "../src/sim/index.ts";
import type { Seat, SimState } from "../src/sim/index.ts";
export function popOfSeat(state: SimState, seat: Seat): number {
  return summary(state, seat).pop;
}
