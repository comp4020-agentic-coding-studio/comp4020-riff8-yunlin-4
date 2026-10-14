// 山海's simulation: a pure, deterministic function of (map, seed, commands).
// The server owns a SimState, validates each seat's commands with
// validateCommand, feeds them to step four times a second, and sends each
// seat only viewFor(state, seat).

export { createMatch, type SimState, type Entity } from "./state.ts";
export { validateCommand, NOT_YOURS, NOT_IN_VIEW } from "./validate.ts";
export { step } from "./step.ts";
export { viewFor, visibleIds, ownerOf, summary } from "./view.ts";
export { MAP_IDS, MAPS, mapText } from "./map.ts";
export * from "./balance.ts";
export * as balance from "./balance.ts";
export type * from "./types.ts";
