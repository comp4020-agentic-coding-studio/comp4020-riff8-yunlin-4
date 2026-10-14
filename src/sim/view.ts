// What a seat is shown. Built only from that seat's own sight: its own
// pieces, other pieces standing on a tile it sees now (never the lurking
// jiaolong), ground it has seen (as it last saw it), and grove amounts in
// view. Nothing about a hidden piece leaves here, not even a count.

import { POP_CAP } from "./balance.ts";
import { findEntity, isBuilding, isUnit, popOf, seenBy, visibleTiles, type Entity, type SimState } from "./state.ts";
import { BUILDINGS, UNITS } from "./balance.ts";
import type { Kind, Seat, SeatView, Side, VisibleEntity } from "./types.ts";

export function visibleIds(state: SimState, seat: Seat): Set<number> {
  const vis = visibleTiles(state, seat);
  const ids = new Set<number>();
  for (const e of state.entities) if (seenBy(state, vis, seat, e)) ids.add(e.id);
  return ids;
}

function toVisible(e: Entity, own: boolean): VisibleEntity {
  const v: VisibleEntity = { id: e.id, kind: e.kind, side: e.side, x: e.x, y: e.y, hp: e.hp, maxHp: e.maxHp, task: e.task };
  if (own && e.kind === "labourer") v.carrying = e.carrying;
  if (isBuilding(e.kind)) {
    if (!e.complete) v.progress = Math.floor((100 * e.work) / BUILDINGS[e.kind].buildTicks);
    else if (own && e.queue.length > 0) v.progress = Math.floor((100 * e.trainTicks) / UNITS[e.queue[0]].trainTicks);
  }
  return v;
}

export function viewFor(state: SimState, seat: Seat): SeatView {
  const vis = visibleTiles(state, seat);
  const rev = state.revealed[seat];
  const chars: string[] = new Array(rev.length);
  const groves: [number, number, number][] = [];
  for (let i = 0; i < rev.length; i++) {
    if (rev[i] === 0) chars[i] = " ";
    else {
      const c = String.fromCharCode(rev[i]);
      chars[i] = vis[i] ? c.toUpperCase() : c;
      if (vis[i] && c === "g") groves.push([i % state.width, Math.floor(i / state.width), state.groveGrain[i]]);
    }
  }
  const entities: VisibleEntity[] = [];
  for (const e of state.entities) if (seenBy(state, vis, seat, e)) entities.push(toVisible(e, e.side === seat));
  return {
    tick: state.tick,
    seat,
    width: state.width,
    height: state.height,
    ground: chars.join(""),
    entities,
    groves,
    grain: state.grain[seat],
    pop: popOf(state, seat),
    popCap: POP_CAP,
    relicClaimed: state.relicClaimed,
  };
}

// The true owner of any id, for server logs only (never sent to a seat).
export function ownerOf(state: SimState, id: number): Side | undefined {
  return findEntity(state, id)?.side;
}

export function summary(state: SimState, seat: Seat): { grain: number; pop: number; units: Partial<Record<Kind, number>> } {
  const units: Partial<Record<Kind, number>> = {};
  for (const e of state.entities) {
    if (e.side !== seat || e.hp <= 0) continue;
    if (isUnit(e.kind) || isBuilding(e.kind)) units[e.kind] = (units[e.kind] ?? 0) + 1;
  }
  return { grain: state.grain[seat], pop: popOf(state, seat), units };
}

