// Helpers for spec/ and headless scripts: put pieces where a test needs them,
// and run the clock. Not used by the server.

import { UNITS } from "./balance.ts";
import { newBuilding, newUnit, updateRevealed, type Entity, type SimState } from "./state.ts";
import { step } from "./step.ts";
import { validateCommand } from "./validate.ts";
import type { BuildingKind, Seat, SimEvent, UnitKind } from "./types.ts";

export function place(state: SimState, kind: UnitKind, side: Seat, x: number, y: number): Entity {
  const e = newUnit(state, kind, side, x, y);
  e.hp = UNITS[kind].hp;
  updateRevealed(state);
  return e;
}

export function placeBuilding(state: SimState, kind: BuildingKind, side: Seat, x: number, y: number): Entity {
  const e = newBuilding(state, kind, side, x, y, true);
  updateRevealed(state);
  return e;
}

// Validates and steps one command (throws if it is rejected), then runs `ticks`
// more ticks with no commands. Returns every event seen.
export function command(state: SimState, seat: Seat, raw: unknown, ticks = 0): SimEvent[] {
  const v = validateCommand(state, seat, raw);
  if (!v.ok) throw new Error(`rejected: ${v.reason} ${v.detail}`);
  const events = step(state, [{ seat, command: v.command }]);
  return events.concat(run(state, ticks));
}

export function run(state: SimState, ticks: number, until?: (e: SimEvent[]) => boolean): SimEvent[] {
  const all: SimEvent[] = [];
  for (let i = 0; i < ticks; i++) {
    const ev = step(state, []);
    all.push(...ev);
    if (until?.(all)) break;
  }
  return all;
}

export function byKind(state: SimState, kind: string): Entity {
  const e = state.entities.find((x) => x.kind === kind);
  if (!e) throw new Error(`no ${kind}`);
  return e;
}

// Removes a seat's starting pieces except its hall, for creature tests.
export function clearUnits(state: SimState): void {
  state.entities = state.entities.filter((e) => e.kind !== "labourer" && e.kind !== "spearman");
}
