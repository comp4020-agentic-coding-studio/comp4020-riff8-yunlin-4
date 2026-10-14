// Commands arrive as untrusted JSON. validateCommand checks shape first, then
// ownership, and only then anything that could depend on what the enemy has:
// every id that isn't the commanding seat's own live piece gets the same
// answer, and a target outside the seat's view gets the same answer as one
// that doesn't exist. Nothing is clamped: a bad command is rejected whole.

import { BUILDINGS, MAX_QUEUE, MAX_UNITS_PER_COMMAND, POP_CAP, UNITS } from "./balance.ts";
import { findEntity, isBuilding, isUnit, popOf, seenBy, terrainAt, visibleTiles, type Entity, type SimState } from "./state.ts";
import type { Command, Rejection, Seat, Validated } from "./types.ts";

export const NOT_YOURS = "no such unit of yours";
export const NOT_IN_VIEW = "no such target in view";

const KEYS: Record<Command["type"], string[]> = {
  move: ["type", "units", "x", "y"],
  gather: ["type", "units", "x", "y"],
  build: ["type", "units", "building", "x", "y"],
  attack: ["type", "units", "target"],
  train: ["type", "building", "unit"],
  stop: ["type", "units"],
};

class Reject {
  reason: Rejection;
  detail: string;
  constructor(reason: Rejection, detail: string) {
    this.reason = reason;
    this.detail = detail;
  }
}

function fail(reason: Rejection, detail: string): never {
  throw new Reject(reason, detail);
}

function isId(v: unknown): v is number {
  return typeof v === "number" && Number.isSafeInteger(v) && v > 0;
}

function coord(state: SimState, o: Record<string, unknown>): [number, number] {
  const { x, y } = o;
  if (typeof x !== "number" || typeof y !== "number" || !Number.isInteger(x) || !Number.isInteger(y)) {
    fail("malformed", "x and y must be integers");
  }
  if (x < 0 || y < 0 || x >= state.width || y >= state.height) fail("invalid", "off the map");
  return [x, y];
}

function ownUnits(state: SimState, seat: Seat, ids: number[]): Entity[] {
  // every id's ownership first, so the answer never depends on what else
  // was named alongside a foreign id
  const mine = ids.map((id) => {
    const e = findEntity(state, id);
    if (!e || e.side !== seat) fail("not-yours", NOT_YOURS);
    return e;
  });
  if (!mine.every((e) => isUnit(e.kind))) fail("invalid", "a building can't do that");
  return mine;
}

// Why a building of this kind can't go down at x,y for this seat now, or
// null if it can. The view is checked over the whole footprint before
// anything else, so every other answer is only ever about tiles the seat can
// see now, and the answer can never reveal anything it can't.
export function placeProblem(state: SimState, seat: Seat, kind: "barracks", x: number, y: number, vis?: Uint8Array): string | null {
  const size = BUILDINGS[kind].size;
  const need = `a ${kind} needs ${size}×${size} open plain ground`;
  if (x < 0 || y < 0 || x + size > state.width || y + size > state.height) return `${need}, all on the map`;
  const v = vis ?? visibleTiles(state, seat);
  for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) if (!v[(y + dy) * state.width + x + dx]) return "not open ground in view";
  for (let dy = 0; dy < size; dy++) {
    for (let dx = 0; dx < size; dx++) {
      const i = (y + dy) * state.width + x + dx;
      if (state.occ[i] !== 0) return `${need}: a building is in the way`;
      if (terrainAt(state, i) !== "p") return need;
    }
  }
  // nobody this seat can see may be standing there (every tile is in view, so
  // a piece it can't see there, a diving jiaolong, isn't on plain ground)
  for (const e of state.entities) {
    if (e.hp > 0 && e.size === 1 && e.x >= x && e.x < x + size && e.y >= y && e.y < y + size && seenBy(state, v, seat, e)) {
      return `${need}: someone is standing there`;
    }
  }
  return null;
}

export function canPlace(state: SimState, seat: Seat, kind: "barracks", x: number, y: number, vis?: Uint8Array): boolean {
  return placeProblem(state, seat, kind, x, y, vis) === null;
}

function check(state: SimState, seat: Seat, raw: unknown): Command {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) fail("malformed", "not an object");
  const o = raw as Record<string, unknown>;
  const type = o.type;
  if (typeof type !== "string" || !Object.hasOwn(KEYS, type)) fail("malformed", "unknown command");
  const t = type as Command["type"];
  for (const k of Object.keys(o)) if (!KEYS[t].includes(k)) fail("malformed", `unexpected field ${k}`);
  for (const k of KEYS[t]) if (!(k in o)) fail("malformed", `missing field ${k}`);

  if (t === "train") {
    if (!isId(o.building)) fail("malformed", "building must be an id");
    if (o.unit !== "labourer" && o.unit !== "spearman") fail("malformed", "unknown unit kind");
    const b = findEntity(state, o.building);
    if (!b || b.side !== seat) fail("not-yours", NOT_YOURS);
    if (!isBuilding(b.kind)) fail("invalid", "only a building trains");
    const unit = o.unit;
    if (!b.complete) fail("invalid", "still being built");
    if (UNITS[unit].trainedAt !== b.kind) fail("invalid", `a ${b.kind} can't train that`);
    if (b.queue.length >= MAX_QUEUE) fail("invalid", "queue full");
    if (state.grain[seat] < UNITS[unit].cost) fail("grain", "not enough grain");
    if (popOf(state, seat) + 1 > POP_CAP) fail("pop-cap", "at the population cap");
    return { type: "train", building: b.id, unit };
  }

  const units = o.units;
  if (!Array.isArray(units) || units.length === 0) fail("malformed", "units must be a non-empty list");
  if (units.length > MAX_UNITS_PER_COMMAND) fail("too-many", `at most ${MAX_UNITS_PER_COMMAND} units`);
  if (!units.every(isId)) fail("malformed", "unit ids must be positive integers");
  if (new Set(units).size !== units.length) fail("malformed", "duplicate unit id");
  const ids = units.slice() as number[];
  const mine = ownUnits(state, seat, ids);

  switch (t) {
    case "stop":
      return { type: "stop", units: ids };
    case "move": {
      const [x, y] = coord(state, o);
      return { type: "move", units: ids, x, y };
    }
    case "gather": {
      const [x, y] = coord(state, o);
      if (!mine.every((e) => e.kind === "labourer")) fail("invalid", "only labourers gather");
      if (state.revealed[seat][y * state.width + x] !== "g".charCodeAt(0)) fail("invalid", "no grove there");
      return { type: "gather", units: ids, x, y };
    }
    case "build": {
      if (o.building !== "barracks") fail("malformed", "unknown building kind");
      const [x, y] = coord(state, o);
      if (!mine.every((e) => e.kind === "labourer")) fail("invalid", "only labourers build");
      const problem = placeProblem(state, seat, "barracks", x, y);
      if (problem) fail("invalid", problem);
      if (state.grain[seat] < BUILDINGS.barracks.cost) fail("grain", "not enough grain");
      return { type: "build", units: ids, building: "barracks", x, y };
    }
    case "attack": {
      if (!isId(o.target)) fail("malformed", "target must be an id");
      const target = findEntity(state, o.target);
      if (!target || !seenBy(state, visibleTiles(state, seat), seat, target)) fail("invalid", NOT_IN_VIEW);
      if (target.side === seat) fail("invalid", "that is yours");
      return { type: "attack", units: ids, target: target.id };
    }
  }
  return fail("malformed", "unknown command");
}

export function validateCommand(state: SimState, seat: Seat, raw: unknown): Validated {
  try {
    return { ok: true, command: check(state, seat, raw) };
  } catch (err) {
    if (err instanceof Reject) return { ok: false, reason: err.reason, detail: err.detail };
    throw err;
  }
}
