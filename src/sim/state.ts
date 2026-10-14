// The match state: plain data, so a match can be copied, compared and
// (if wanted) serialised. Nothing here is random; createMatch is a pure
// function of (mapId, seed), and the seed is only recorded, since nothing in
// the sim needs dice.

import { BUILDINGS, JIAOLONG, NIAN, PIXIU, QILIN, START_GRAIN, START_LABOURERS, UNITS } from "./balance.ts";
import { MAPS, type MapDef } from "./map.ts";
import { findPath } from "./path.ts";
import type { BuildingKind, CreatureKind, Kind, Seat, Side, Task, UnitKind } from "./types.ts";

export type Order =
  | { type: "move"; x: number; y: number }
  | { type: "gather"; tile: number }
  | { type: "build"; target: number }
  | { type: "attack"; target: number; auto: boolean };

export interface Entity {
  id: number;
  kind: Kind;
  side: Side;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  task: Task;
  size: number; // footprint side, 1 for everything but buildings
  // moving pieces
  order: Order | null;
  path: number[];
  pathKey: string; // the goal the current path was planned for
  pathAge: number; // ticks since the path was planned
  moveCd: number;
  attackCd: number;
  // labourers
  carrying: number;
  gatherCd: number;
  // buildings
  complete: boolean;
  work: number; // builder-ticks done
  queue: UnitKind[];
  trainTicks: number;
  // creatures
  postX: number;
  postY: number;
  targetId: number; // 0: none
  engagedSeat: Seat | -1; // the seat it last announced aggro against
  phase: number; // jiaolong: ticks left surfaced (>0) or diving (<0); pixiu: route index
  provoked: [boolean, boolean]; // qilin: which seats have provoked it
  chaseX: number; // pixiu: where it left its route
  chaseY: number;
  // last thing that hurt it, for the death event
  hitByKind: Kind | "";
  hitBySide: Side | -1;
}

export interface SimState {
  mapId: string;
  seed: number;
  tick: number;
  winner: Seat | null;
  width: number;
  height: number;
  // per-owner id sequences (seat 0, seat 1, wild): the k-th piece of owner o
  // gets id 3k+o+1, so one side's creations never shift another's ids and a
  // seat can't count fogged enemy production from gaps in its own
  seq: [number, number, number];
  entities: Entity[]; // ascending id
  grain: [number, number];
  groveGrain: number[]; // per tile
  occ: number[]; // per tile: id of the building standing on it, 0 if none
  // per tile, per seat: the char code of the ground as this seat last saw it
  // (0: never seen), so remembered ground never leaks later changes
  revealed: [number[], number[]];
  relicClaimed: boolean;
  pixiuLoop: number[]; // the pixiu's route as a closed loop of tiles
}

export function getMap(state: SimState): MapDef {
  return MAPS[state.mapId];
}

function nextId(state: SimState, side: Side): number {
  const o = side === "wild" ? 2 : side;
  return 3 * state.seq[o]++ + o + 1;
}

// Keeps entities in ascending id order (findEntity's binary search, and the
// tick's id-order processing, depend on it).
function insert(state: SimState, e: Entity): void {
  const es = state.entities;
  let lo = 0;
  let hi = es.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (es[mid].id < e.id) lo = mid + 1;
    else hi = mid;
  }
  es.splice(lo, 0, e);
}

function blank(id: number, kind: Kind, side: Side, x: number, y: number, hp: number, size: number): Entity {
  return {
    id,
    kind,
    side,
    x,
    y,
    hp,
    maxHp: hp,
    task: "idle",
    size,
    order: null,
    path: [],
    pathKey: "",
    pathAge: 0,
    moveCd: 0,
    attackCd: 0,
    carrying: 0,
    gatherCd: 0,
    complete: true,
    work: 0,
    queue: [],
    trainTicks: 0,
    postX: x,
    postY: y,
    targetId: 0,
    engagedSeat: -1,
    phase: 0,
    provoked: [false, false],
    chaseX: x,
    chaseY: y,
    hitByKind: "",
    hitBySide: -1,
  };
}

export function newUnit(state: SimState, kind: UnitKind, side: Seat, x: number, y: number): Entity {
  const e = blank(nextId(state, side), kind, side, x, y, UNITS[kind].hp, 1);
  insert(state, e);
  return e;
}

export function newBuilding(state: SimState, kind: BuildingKind, side: Seat, x: number, y: number, complete: boolean): Entity {
  const b = BUILDINGS[kind];
  const e = blank(nextId(state, side), kind, side, x, y, b.hp, b.size);
  e.complete = complete;
  if (!complete) e.hp = Math.max(1, Math.floor(b.hp / 10));
  e.task = complete ? "idle" : "building";
  insert(state, e);
  for (let dy = 0; dy < b.size; dy++) for (let dx = 0; dx < b.size; dx++) state.occ[(y + dy) * state.width + x + dx] = e.id;
  return e;
}

function newCreature(state: SimState, kind: CreatureKind, x: number, y: number, hp: number): Entity {
  const e = blank(nextId(state, "wild"), kind, "wild", x, y, hp, 1);
  e.task = kind === "nian" ? "asleep" : kind === "pixiu" ? "patrolling" : "idle";
  insert(state, e);
  return e;
}

export function createMatch(mapId: string, seed: number): SimState {
  const def = MAPS[mapId];
  if (!def) throw new Error(`no such map: ${mapId}`);
  const n = def.width * def.height;
  const state: SimState = {
    mapId,
    seed,
    tick: 0,
    winner: null,
    width: def.width,
    height: def.height,
    seq: [0, 0, 0],
    entities: [],
    grain: [START_GRAIN, START_GRAIN],
    groveGrain: def.grove.slice(),
    occ: new Array(n).fill(0),
    revealed: [new Array(n).fill(0), new Array(n).fill(0)],
    relicClaimed: false,
    pixiuLoop: [],
  };
  for (const seat of [0, 1] as const) {
    const [hx, hy] = def.halls[seat];
    newBuilding(state, "hall", seat, hx, hy, true);
  }
  for (const seat of [0, 1] as const) {
    const [hx, hy] = def.halls[seat];
    // labourers stand in a column on the hall's inland face
    const x = seat === 0 ? hx - 1 : hx + 3;
    for (let i = 0; i < START_LABOURERS; i++) newUnit(state, "labourer", seat, x, hy - 1 + i);
  }
  const [nx, ny] = def.nianDen;
  newCreature(state, "nian", nx, ny + 1, NIAN.hp);
  newCreature(state, "jiaolong", def.jiaolongLair[0], def.jiaolongLair[1], JIAOLONG.hp);
  newCreature(state, "qilin", def.qilinPost[0], def.qilinPost[1], QILIN.hp);
  const [px, py] = def.pixiuRoute[0];
  newCreature(state, "pixiu", px, py, PIXIU.hp);
  state.pixiuLoop = routeLoop(state, def.pixiuRoute);
  updateRevealed(state);
  return state;
}

export function findEntity(state: SimState, id: number): Entity | undefined {
  // entities are kept in ascending id order
  let lo = 0;
  let hi = state.entities.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const e = state.entities[mid];
    if (e.id === id) return e.hp > 0 ? e : undefined;
    if (e.id < id) lo = mid + 1;
    else hi = mid - 1;
  }
  return undefined;
}

export function isUnit(k: Kind): k is UnitKind {
  return k === "labourer" || k === "spearman";
}
export function isBuilding(k: Kind): k is BuildingKind {
  return k === "hall" || k === "barracks";
}

function routeLoop(state: SimState, pts: [number, number][]): number[] {
  const loop: number[] = [];
  for (let k = 0; k < pts.length; k++) {
    const [ax, ay] = pts[k];
    const [bx, by] = pts[(k + 1) % pts.length];
    const r = findPath(state.width, state.height, ax, ay, { x: bx, y: by, w: 1, h: 1, range: 0 }, (i) => walkable(state, i), 4000);
    if (!r.reached) throw new Error(`pixiu route leg ${k} is not walkable`);
    loop.push(...r.path);
  }
  return loop;
}

// The ground code at a tile now: an exhausted grove is plain ground.
export function terrainAt(state: SimState, i: number): string {
  const c = getMap(state).terrain[i];
  return c === "g" && state.groveGrain[i] <= 0 ? "p" : c;
}

// Tiles a seat sees now, from its own pieces' sight circles.
export function visibleTiles(state: SimState, seat: Seat): Uint8Array {
  const v = new Uint8Array(state.width * state.height);
  for (const e of state.entities) {
    if (e.side !== seat || e.hp <= 0) continue;
    const r = isBuilding(e.kind) ? BUILDINGS[e.kind].sight : UNITS[e.kind as UnitKind].sight;
    const cx = e.x + (e.size - 1) / 2;
    const cy = e.y + (e.size - 1) / 2;
    const r2 = (r + (e.size - 1) / 2) ** 2;
    const x0 = Math.max(0, Math.floor(cx - r - e.size));
    const x1 = Math.min(state.width - 1, Math.ceil(cx + r + e.size));
    const y0 = Math.max(0, Math.floor(cy - r - e.size));
    const y1 = Math.min(state.height - 1, Math.ceil(cy + r + e.size));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if ((x - cx) ** 2 + (y - cy) ** 2 <= r2) v[y * state.width + x] = 1;
      }
    }
  }
  return v;
}

export function updateRevealed(state: SimState): [Uint8Array, Uint8Array] {
  const vis: [Uint8Array, Uint8Array] = [visibleTiles(state, 0), visibleTiles(state, 1)];
  for (const seat of [0, 1] as const) {
    const rev = state.revealed[seat];
    const v = vis[seat];
    for (let i = 0; i < v.length; i++) if (v[i]) rev[i] = terrainAt(state, i).charCodeAt(0);
  }
  return vis;
}

// Whether any tile of a piece is in a seat's view. The jiaolong is hidden
// from everyone, even in view, unless it has surfaced to strike.
export function seenBy(state: SimState, vis: Uint8Array, seat: Seat, e: Entity): boolean {
  if (e.hp <= 0) return false;
  if (e.side === seat) return true;
  if (e.kind === "jiaolong" && e.phase <= 0) return false;
  for (let dy = 0; dy < e.size; dy++) for (let dx = 0; dx < e.size; dx++) if (vis[(e.y + dy) * state.width + e.x + dx]) return true;
  return false;
}

// Units walk on plain, ford, glade and relic, never through a building.
export function walkable(state: SimState, i: number): boolean {
  const c = terrainAt(state, i);
  return (c === "p" || c === "f" || c === "l" || c === "x") && state.occ[i] === 0;
}

export function isWater(state: SimState, i: number): boolean {
  const c = getMap(state).terrain[i];
  return c === "r" || c === "f";
}

export function popOf(state: SimState, seat: Seat): number {
  let pop = 0;
  for (const e of state.entities) {
    if (e.side !== seat || e.hp <= 0) continue;
    if (isUnit(e.kind)) pop++;
    else if (isBuilding(e.kind)) pop += e.queue.length;
  }
  return pop;
}
