// The match's shared vocabulary: what the simulation holds, what a seat may
// send, and what a seat is shown. Everything that leaves the server about a
// match is built from SeatView and SimEvent, which carry only ids, small
// integers and fixed keys (kinds, terrain codes) — never a token or any text a
// player typed. ADR 0002 and 0003 say why.

// Seat 0 starts at the east (right-hand) end. The scroll is read right to
// left, like the painting, so the first seat is the first thing read.
export type Seat = 0 | 1;
export type Side = Seat | "wild";

export type UnitKind = "labourer" | "spearman";
export type BuildingKind = "hall" | "barracks";
export type CreatureKind = "nian" | "jiaolong" | "qilin" | "pixiu";
export type Kind = UnitKind | BuildingKind | CreatureKind;

export type Task =
  | "idle"
  | "moving"
  | "gathering"
  | "carrying"
  | "building"
  | "attacking"
  | "training"
  | "asleep"
  | "returning"
  | "patrolling";

// A command names unit ids. Ids are small integers handed out in order; they
// are not secret, but a command is only ever accepted for the commanding
// seat's own pieces (validateCommand).
export type Command =
  | { type: "move"; units: number[]; x: number; y: number }
  | { type: "gather"; units: number[]; x: number; y: number }
  | { type: "build"; units: number[]; building: "barracks"; x: number; y: number }
  | { type: "attack"; units: number[]; target: number }
  | { type: "train"; building: number; unit: UnitKind }
  | { type: "stop"; units: number[] };

// "not-yours" covers an enemy id, a creature id and an id that doesn't exist
// alike, with the same detail text: a fogged enemy's existence must not be
// probeable through the answer.
export type Rejection = "malformed" | "not-yours" | "too-many" | "invalid" | "grain" | "pop-cap";
export type Validated = { ok: true; command: Command } | { ok: false; reason: Rejection; detail: string };

export interface VisibleEntity {
  id: number;
  kind: Kind;
  side: Side;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  task: Task;
  // Own labourers only: grain in hand.
  carrying?: number;
  // 0–100: a building under construction, or the item a building is training.
  progress?: number;
}

export interface SeatView {
  tick: number;
  seat: Seat;
  width: number;
  height: number;
  // width*height chars, row-major from the top-left. " " is unpainted silk
  // (never seen). A lowercase terrain code is ground this seat has seen but
  // can't see now; the same code uppercase is ground in view. Codes: p plain,
  // r river, f ford, g grove, h hill, l glade, x relic.
  ground: string;
  // Only pieces in view. Own pieces are always included.
  entities: VisibleEntity[];
  // Grain left on grove tiles in view: [x, y, amount].
  groves: [number, number, number][];
  grain: number;
  pop: number;
  popCap: number;
  // Whether the relic has been claimed (by anyone); who claimed it is only
  // told to the claimer, through their events.
  relicClaimed: boolean;
}

export type SimEvent =
  | { type: "build.start"; tick: number; seat: Seat; building: number; kind: BuildingKind; x: number; y: number }
  | { type: "build.done"; tick: number; seat: Seat; building: number; kind: BuildingKind }
  | { type: "unit.trained"; tick: number; seat: Seat; unit: number; kind: UnitKind }
  | { type: "creature.aggro"; tick: number; creature: number; kind: CreatureKind; targetSeat: Seat; target: number }
  | {
      type: "unit.died";
      tick: number;
      side: Side;
      unit: number;
      kind: Kind;
      // what killed it: a soldier (or labourer) of the other seat, or a creature
      cause: "soldier" | "creature";
      byKind: Kind;
      bySide: Side;
      x: number;
      y: number;
    }
  | { type: "relic.claimed"; tick: number; seat: Seat; grain: number }
  | { type: "match.end"; tick: number; winner: Seat; reason: "hall" };
