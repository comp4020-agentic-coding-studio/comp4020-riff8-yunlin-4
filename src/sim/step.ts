// One tick of the match. step() applies the tick's (already validated)
// commands in the order given, re-checking each cheaply since the world may
// have moved since validation, then advances every piece once, in id order.
// Nothing here is random, so (map, seed, command log) always gives the same
// match.

import {
  ACQUIRE_RADIUS,
  DEFEND_RADIUS,
  BUILDINGS,
  CARRY,
  GATHER_TICKS,
  JIAOLONG,
  MAX_QUEUE,
  NIAN,
  PATH_BUDGET,
  PATH_MAX_NODES,
  PIXIU,
  POP_CAP,
  QILIN,
  QILIN_GATHER_MULT,
  REGROVE_FAR_RADIUS,
  REGROVE_RADIUS,
  RETALIATE_RADIUS,
  RELIC_BONUS,
  REPATH_TICKS,
  UNITS,
} from "./balance.ts";
import { distToRect, findPath, type Goal } from "./path.ts";
import {
  findEntity,
  getMap,
  isBuilding,
  isUnit,
  isWater,
  newBuilding,
  newUnit,
  popOf,
  seenBy,
  terrainAt,
  updateRevealed,
  visibleTiles,
  walkable,
  type Entity,
  type SimState,
} from "./state.ts";
import type { Command, Seat, SimEvent, UnitKind } from "./types.ts";
import { canPlace, ownUnfinished } from "./validate.ts";

interface Ctx {
  state: SimState;
  events: SimEvent[];
  budget: number;
  vis: [Uint8Array, Uint8Array];
  known: [Known, Known];
}

const G = "g".charCodeAt(0);

function dist(e: Entity, t: Entity): number {
  return distToRect(e.x, e.y, t.x, t.y, t.size, t.size);
}

// ---- damage and death ----

function hit(ctx: Ctx, by: Entity, target: Entity, damage: number): void {
  if (target.hp <= 0) return;
  target.hp -= damage;
  target.hitByKind = by.kind;
  target.hitBySide = by.side;
  if (target.kind === "qilin" && by.side !== "wild") target.provoked[by.side] = true;
  if (target.hp > 0) {
    retaliate(ctx, target, by);
    return;
  }
  target.hp = 0;
  const s = ctx.state;
  ctx.events.push({
    type: "unit.died",
    tick: s.tick,
    side: target.side,
    unit: target.id,
    kind: target.kind,
    cause: by.side === "wild" ? "creature" : "soldier",
    byKind: by.kind,
    bySide: by.side,
    x: target.x,
    y: target.y,
  });
  if (isBuilding(target.kind)) {
    for (let dy = 0; dy < target.size; dy++)
      for (let dx = 0; dx < target.size; dx++) s.occ[(target.y + dy) * s.width + target.x + dx] = 0;
    if (target.kind === "hall" && s.winner === null && target.side !== "wild") {
      const winner: Seat = target.side === 0 ? 1 : 0;
      s.winner = winner;
      ctx.events.push({ type: "match.end", tick: s.tick, winner, reason: "hall" });
    }
  }
}

// A unit struck by the other seat turns on its attacker, if the attacker is
// within RETALIATE_RADIUS, when it is beating on a building, or is an idle
// spearman. A unit on any other order (a move, gathering, building, a chosen
// unit or creature to fight) keeps to it: the player decided.
function retaliate(ctx: Ctx, target: Entity, by: Entity): void {
  if (!isUnit(target.kind) || target.side === "wild" || by.side === "wild" || by.side === target.side) return;
  if (dist(target, by) > RETALIATE_RADIUS) return;
  const o = target.order;
  if (o === null) {
    if (target.kind !== "spearman") return;
  } else {
    if (o.type !== "attack" || o.target === by.id) return;
    const current = findEntity(ctx.state, o.target);
    if (current && !isBuilding(current.kind)) return;
  }
  target.order = { type: "attack", target: by.id, auto: true };
  target.path = [];
  target.pathKey = "";
}

// ---- movement ----

// What a seat knows of the ground, for planning its units' routes: tiles in
// view as they truly are; tiles out of view as it last saw them (never seen:
// open plain), with no buildings. A route through fog therefore says nothing
// about hidden enemy buildings; a real blocker is met when it comes into view
// (blockedAhead), and the unit re-plans then. Its own buildings are always in
// view (each sees its own footprint).
interface Known {
  vis: Uint8Array;
  plan: (i: number) => boolean;
}

const OPEN = new Set(["p", "f", "l", "x"].map((c) => c.charCodeAt(0)));

function knownFor(s: SimState, seat: Seat, vis: Uint8Array): Known {
  const rev = s.revealed[seat];
  return { vis, plan: (i) => (vis[i] ? walkable(s, i) : rev[i] === 0 || OPEN.has(rev[i])) };
}

// Whether the planned route, as far as it runs through tiles in view, now
// crosses something the seat can see is in the way.
function blockedAhead(path: number[], known: Known): boolean {
  for (const i of path) {
    if (!known.vis[i]) return false;
    if (!known.plan(i)) return true;
  }
  return false;
}

type StepResult = "arrived" | "moving" | "stuck" | "wait";

function stepToward(
  ctx: Ctx,
  e: Entity,
  goal: Goal,
  key: string,
  speed: number,
  passable: (i: number) => boolean,
  repath: boolean,
  known?: Known,
): StepResult {
  if (distToRect(e.x, e.y, goal.x, goal.y, goal.w, goal.h) <= goal.range) {
    e.path = [];
    return "arrived";
  }
  if (e.moveCd > 0) return "moving";
  const s = ctx.state;
  const stale =
    e.path.length === 0 ||
    e.pathKey !== key ||
    !passable(e.path[0]) ||
    (known !== undefined && blockedAhead(e.path, known)) ||
    (repath && e.pathAge >= REPATH_TICKS);
  if (stale) {
    if (ctx.budget <= 0) return "wait";
    const r = findPath(s.width, s.height, e.x, e.y, goal, known ? known.plan : passable, Math.min(PATH_MAX_NODES, ctx.budget));
    ctx.budget -= r.expanded;
    e.path = r.path;
    e.pathKey = key;
    e.pathAge = 0;
    if (e.path.length === 0) return "stuck";
  }
  const next = e.path.shift()!;
  e.x = next % s.width;
  e.y = Math.floor(next / s.width);
  e.moveCd = speed;
  return "moving";
}

function tileGoal(x: number, y: number, range: number): Goal {
  return { x, y, w: 1, h: 1, range };
}
function rectGoal(t: Entity, range: number): Goal {
  return { x: t.x, y: t.y, w: t.size, h: t.size, range };
}

// ---- units ----

function setIdle(e: Entity): void {
  e.order = null;
  e.path = [];
  e.pathKey = "";
  e.task = "idle";
}

function ownHall(s: SimState, side: Seat): Entity | undefined {
  return s.entities.find((h) => h.kind === "hall" && h.side === side && h.hp > 0);
}

function nearGlade(s: SimState, x: number, y: number, reach: number): boolean {
  for (const [gx, gy] of getMap(s).glade) if (Math.max(Math.abs(gx - x), Math.abs(gy - y)) <= reach) return true;
  return false;
}

function qilinPeaceful(s: SimState): boolean {
  const q = s.entities.find((c) => c.kind === "qilin" && c.hp > 0);
  return !!q && !q.provoked[0] && !q.provoked[1] && q.targetId === 0;
}

// The next grove tile to work: the given one if it has grain, else the
// nearest with grain within REGROVE_RADIUS that this seat has seen as a grove,
// else the one with the shortest round trip within REGROVE_FAR_RADIUS of
// it or of the hall that isn't inside the nian's leash. -1 if there is none.
function groveFor(s: SimState, seat: Seat, tile: number): number {
  if (s.groveGrain[tile] > 0) return tile;
  const near = nearestGrove(s, seat, tile, REGROVE_RADIUS, false);
  return near >= 0 ? near : nearestGrove(s, seat, tile, REGROVE_FAR_RADIUS, true);
}

function inNianLeash(s: SimState, x: number, y: number): boolean {
  const [dx0, dy0] = getMap(s).nianDen;
  return distToRect(x, y, dx0, dy0, 2, 3) <= NIAN.leash;
}

function nearestGrove(s: SimState, seat: Seat, tile: number, radius: number, far: boolean): number {
  const tx = tile % s.width;
  const ty = Math.floor(tile / s.width);
  // the hall's centre, where it was raised (a fallen hall ends the match)
  const [hx0, hy0] = getMap(s).halls[seat];
  const hx = hx0 + 1;
  const hy = hy0 + 1;
  let best = -1;
  let bestKey: number[] = [];
  // the near search only needs its own box; the far one scans the map
  const [y0, y1, x0, x1] = far
    ? [0, s.height - 1, 0, s.width - 1]
    : [Math.max(0, ty - radius), Math.min(s.height - 1, ty + radius), Math.max(0, tx - radius), Math.min(s.width - 1, tx + radius)];
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const near = Math.max(Math.abs(x - tx), Math.abs(y - ty));
      const home = Math.max(Math.abs(x - hx), Math.abs(y - hy));
      // the far search also looks around the hall, so a dry grove at the
      // edge of the home ground doesn't strand its labourers
      if (near > radius && !(far && home <= radius)) continue;
      const i = y * s.width + x;
      if (s.groveGrain[i] <= 0 || s.revealed[seat][i] !== G) continue;
      if (far && inNianLeash(s, x, y)) continue;
      // nearest first (the far search: shortest round trip, there and back
      // to the hall); ties go nearer home, then north, then towards the
      // seat's own edge: the same choice both seats would make on their
      // mirrored halves, and never drifting riverward, towards the enemy,
      // when a grove as good lies homeward
      const edge = seat === 0 ? s.width - 1 - x : x;
      const key = far ? [near + home, home, y, edge] : [near, home, y, edge];
      if (best < 0 || less(key, bestKey)) {
        bestKey = key;
        best = i;
      }
    }
  }
  return best;
}

function less(a: number[], b: number[]): boolean {
  for (let k = 0; k < a.length; k++) if (a[k] !== b[k]) return a[k] < b[k];
  return false;
}

function attackStep(
  ctx: Ctx,
  e: Entity,
  target: Entity,
  damage: number,
  attackTicks: number,
  speed: number,
  passable: (i: number) => boolean,
  known?: Known,
): StepResult {
  if (dist(e, target) <= 1) {
    e.path = [];
    if (e.attackCd === 0) {
      hit(ctx, e, target, damage);
      e.attackCd = attackTicks;
    }
    return "arrived";
  }
  return stepToward(ctx, e, rectGoal(target, 1), `a${target.id}`, speed, passable, true, known);
}

// The nearest enemy this unit's seat can see within ACQUIRE_RADIUS: the other
// seat's units first, then its buildings, then a creature. Creatures count
// only if they are attacking one of this seat's pieces (`onlyMe`: this unit).
function acquire(ctx: Ctx, e: Entity, seat: Seat, onlyMe = false): Entity | undefined {
  const s = ctx.state;
  let best: Entity | undefined;
  let bestRank = Infinity;
  let bestD = Infinity;
  for (const t of s.entities) {
    if (t.hp <= 0 || t.side === seat) continue;
    if (t.side === "wild") {
      const tt = t.targetId ? findEntity(s, t.targetId) : undefined;
      if (!tt || tt.side !== seat || (onlyMe && tt.id !== e.id)) continue;
    }
    if (!seenBy(s, ctx.vis[seat], seat, t)) continue;
    const d = dist(e, t);
    if (d > ACQUIRE_RADIUS) continue;
    const rank = t.side === "wild" ? 2 : isBuilding(t.kind) ? 1 : 0;
    if (rank < bestRank || (rank === bestRank && d < bestD)) {
      best = t;
      bestRank = rank;
      bestD = d;
    }
  }
  return best;
}

// An enemy unit of the other seat, in view and within the auto-attack leash,
// that is attacking one of this seat's units within DEFEND_RADIUS of `e`.
// Creatures never count. Nearest first; ties go to the lower id.
function attackerOfMine(ctx: Ctx, e: Entity, seat: Seat): Entity | undefined {
  const s = ctx.state;
  let best: Entity | undefined;
  let bestD = Infinity;
  for (const t of s.entities) {
    if (t.hp <= 0 || t.side === seat || t.side === "wild" || !isUnit(t.kind)) continue;
    if (t.order?.type !== "attack" || t.task !== "attacking") continue;
    const victim = findEntity(s, t.order.target);
    if (!victim || victim.hp <= 0 || victim.side !== seat || !isUnit(victim.kind) || dist(e, victim) > DEFEND_RADIUS) continue;
    if (!seenBy(s, ctx.vis[seat], seat, t)) continue;
    const d = dist(e, t);
    if (d >= ACQUIRE_RADIUS * 2 || d >= bestD) continue;
    best = t;
    bestD = d;
  }
  return best;
}

function unitTick(ctx: Ctx, e: Entity): void {
  const s = ctx.state;
  const seat = e.side as Seat;
  const stats = UNITS[e.kind as UnitKind];
  const walk = (i: number) => walkable(s, i);
  const known = ctx.known[seat];

  if (e.order === null && e.kind === "spearman") {
    const t = acquire(ctx, e, seat) ?? attackerOfMine(ctx, e, seat);
    if (t) e.order = { type: "attack", target: t.id, auto: true };
  }
  const o = e.order;
  if (o === null) {
    e.task = "idle";
    return;
  }
  switch (o.type) {
    case "move": {
      e.task = "moving";
      const r = stepToward(ctx, e, tileGoal(o.x, o.y, 0), `m${o.x},${o.y}`, stats.speed, walk, false, known);
      if (r === "arrived" || r === "stuck") setIdle(e);
      return;
    }
    case "attack": {
      let t = findEntity(s, o.target);
      if (!t || !seenBy(s, ctx.vis[seat], seat, t) || (o.auto && dist(e, t) > ACQUIRE_RADIUS * 2)) {
        // an explicit attack whose target is gone moves on to the next enemy in view
        const next = o.auto ? undefined : acquire(ctx, e, seat, true);
        if (!next) {
          setIdle(e);
          return;
        }
        o.target = next.id;
        e.path = [];
        e.pathKey = "";
        t = next;
      }
      e.task = "attacking";
      const r = attackStep(ctx, e, t, stats.damage, stats.attackTicks, stats.speed, walk, known);
      if (r === "stuck") setIdle(e);
      return;
    }
    case "build": {
      const b = findEntity(s, o.target);
      if (!b || b.complete) {
        setIdle(e);
        return;
      }
      e.task = "building";
      const r = stepToward(ctx, e, rectGoal(b, 1), `b${b.id}`, stats.speed, walk, false, known);
      if (r === "stuck") setIdle(e);
      if (r !== "arrived") return;
      const bs = BUILDINGS[b.kind as "barracks"];
      b.work++;
      b.hp = Math.min(b.maxHp, b.hp + Math.ceil((b.maxHp * 0.9) / bs.buildTicks));
      if (b.work >= bs.buildTicks) {
        b.complete = true;
        b.task = "idle";
        ctx.events.push({ type: "build.done", tick: s.tick, seat, building: b.id, kind: "barracks" });
      }
      return;
    }
    case "gather": {
      const hall = ownHall(s, seat);
      const tile = groveFor(s, seat, o.tile);
      if (e.carrying >= CARRY || (tile < 0 && e.carrying > 0)) {
        if (!hall) {
          setIdle(e);
          return;
        }
        e.task = "carrying";
        const r = stepToward(ctx, e, rectGoal(hall, 1), `h${hall.id}`, stats.speed, walk, false, known);
        if (r === "stuck") setIdle(e);
        if (r === "arrived") {
          s.grain[seat] += e.carrying;
          e.carrying = 0;
        }
        return;
      }
      if (tile < 0) {
        setIdle(e);
        return;
      }
      o.tile = tile;
      const gx = tile % s.width;
      const gy = Math.floor(tile / s.width);
      const r = stepToward(ctx, e, tileGoal(gx, gy, 1), `g${tile}`, stats.speed, walk, false, known);
      if (r === "stuck") setIdle(e);
      if (r !== "arrived") {
        e.task = "gathering";
        return;
      }
      e.task = "gathering";
      if (e.gatherCd > 0) return;
      s.groveGrain[tile]--;
      e.carrying++;
      const fast = qilinPeaceful(s) && nearGlade(s, gx, gy, QILIN.groveReach);
      e.gatherCd = Math.ceil(GATHER_TICKS / (fast ? QILIN_GATHER_MULT : 1));
      return;
    }
  }
}

// ---- buildings ----

function spawnTile(s: SimState, b: Entity): [number, number] | null {
  for (let y = b.y - 1; y <= b.y + b.size; y++) {
    for (let x = b.x - 1; x <= b.x + b.size; x++) {
      if (x < 0 || y < 0 || x >= s.width || y >= s.height) continue;
      if (distToRect(x, y, b.x, b.y, b.size, b.size) !== 1) continue;
      if (walkable(s, y * s.width + x)) return [x, y];
    }
  }
  return null;
}

function buildingTick(ctx: Ctx, b: Entity): void {
  if (!b.complete || b.queue.length === 0) {
    if (b.complete) b.task = "idle";
    return;
  }
  b.task = "training";
  const kind = b.queue[0];
  if (b.trainTicks < UNITS[kind].trainTicks) b.trainTicks++;
  if (b.trainTicks < UNITS[kind].trainTicks) return;
  const at = spawnTile(ctx.state, b);
  if (!at) return; // hemmed in: wait
  b.queue.shift();
  b.trainTicks = 0;
  const u = newUnit(ctx.state, kind, b.side as Seat, at[0], at[1]);
  ctx.events.push({ type: "unit.trained", tick: ctx.state.tick, seat: b.side as Seat, unit: u.id, kind });
}

// ---- creatures ----

function engage(ctx: Ctx, c: Entity, t: Entity): void {
  c.targetId = t.id;
  if (c.engagedSeat !== t.side) {
    c.engagedSeat = t.side as Seat;
    ctx.events.push({
      type: "creature.aggro",
      tick: ctx.state.tick,
      creature: c.id,
      kind: c.kind as "nian",
      targetSeat: t.side as Seat,
      target: t.id,
    });
  }
}

function disengage(c: Entity): void {
  c.targetId = 0;
  c.engagedSeat = -1;
}

// The nearest live seat unit passing `ok`, ties to the lower id.
function nearestUnit(s: SimState, from: Entity, ok: (u: Entity) => boolean): Entity | undefined {
  let best: Entity | undefined;
  let bestD = Infinity;
  for (const u of s.entities) {
    if (u.hp <= 0 || u.side === "wild" || !isUnit(u.kind) || !ok(u)) continue;
    const d = dist(from, u);
    if (d < bestD) {
      best = u;
      bestD = d;
    }
  }
  return best;
}

function cheb(ax: number, ay: number, bx: number, by: number): number {
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}

function nianTick(ctx: Ctx, c: Entity): void {
  const s = ctx.state;
  const [dx0, dy0] = getMap(s).nianDen;
  const leashOf = (x: number, y: number) => distToRect(x, y, dx0, dy0, 2, 3) <= NIAN.leash;
  const inLeash = (u: Entity) => leashOf(u.x, u.y);
  let t = c.targetId ? findEntity(s, c.targetId) : undefined;
  if (!t || !inLeash(t)) t = nearestUnit(s, c, inLeash);
  const walk = (i: number) => walkable(s, i) && leashOf(i % s.width, Math.floor(i / s.width));
  if (t) {
    engage(ctx, c, t);
    c.task = "attacking";
    attackStep(ctx, c, t, NIAN.damage, NIAN.attackTicks, NIAN.speed, walk);
    return;
  }
  disengage(c);
  c.hp = c.maxHp;
  const r = stepToward(ctx, c, tileGoal(c.postX, c.postY, 0), "post", NIAN.speed, walk, false);
  c.task = r === "arrived" || r === "stuck" ? "asleep" : "returning";
}

// "On or beside" the river: on a river/ford tile or next to one.
function waterside(s: SimState, x: number, y: number): boolean {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < s.width && ny < s.height && isWater(s, ny * s.width + nx)) return true;
    }
  }
  return false;
}

function jiaolongTick(ctx: Ctx, c: Entity): void {
  const s = ctx.state;
  if (c.phase > 0) {
    c.task = "attacking";
    c.phase--;
    if (c.phase === 0) c.phase = -JIAOLONG.diveTicks;
    return;
  }
  if (c.phase < 0) {
    c.phase++;
    c.task = "idle";
    disengage(c);
    return;
  }
  c.task = "idle";
  const prey = (r: number) => (u: Entity) => dist(c, u) <= r && waterside(s, u.x, u.y);
  const t = nearestUnit(s, c, prey(JIAOLONG.strikeRadius));
  if (t) {
    engage(ctx, c, t);
    hit(ctx, c, t, JIAOLONG.strikeDamage);
    c.phase = JIAOLONG.surfacedTicks;
    c.task = "attacking";
    return;
  }
  const h = nearestUnit(s, c, prey(JIAOLONG.huntRadius));
  if (h) {
    stepToward(ctx, c, tileGoal(h.x, h.y, JIAOLONG.strikeRadius), `j${h.id}`, JIAOLONG.speed, (i) => isWater(s, i), true);
  }
}

function inQilinZone(s: SimState, x: number, y: number): boolean {
  return nearGlade(s, x, y, QILIN.area);
}

function qilinTick(ctx: Ctx, c: Entity): void {
  const s = ctx.state;
  const terrain = getMap(s).terrain;
  for (const seat of [0, 1] as const) {
    let present = false;
    for (const u of s.entities) {
      if (u.hp <= 0 || u.side !== seat || !isUnit(u.kind)) continue;
      if (u.kind === "spearman" && terrain[u.y * s.width + u.x] === "l") c.provoked[seat] = true;
      if (inQilinZone(s, u.x, u.y)) present = true;
    }
    if (!present) c.provoked[seat] = false;
  }
  const zone = (u: Entity) => u.side !== "wild" && c.provoked[u.side] && inQilinZone(s, u.x, u.y);
  let t = c.targetId ? findEntity(s, c.targetId) : undefined;
  if (!t || !zone(t)) t = nearestUnit(s, c, zone);
  const walk = (i: number) => walkable(s, i) && inQilinZone(s, i % s.width, Math.floor(i / s.width));
  if (t) {
    engage(ctx, c, t);
    c.task = "attacking";
    attackStep(ctx, c, t, QILIN.damage, QILIN.attackTicks, QILIN.speed, walk);
    return;
  }
  disengage(c);
  const r = stepToward(ctx, c, tileGoal(c.postX, c.postY, 0), "post", QILIN.speed, walk, false);
  c.task = r === "moving" ? "returning" : "idle";
}

function relicDist(s: SimState, x: number, y: number): number {
  let d = Infinity;
  for (const [rx, ry] of getMap(s).relic) d = Math.min(d, cheb(x, y, rx, ry));
  return d;
}

function pixiuTick(ctx: Ctx, c: Entity): void {
  const s = ctx.state;
  const terrain = getMap(s).terrain;
  const leashed = (u: Entity) => cheb(u.x, u.y, c.chaseX, c.chaseY) <= PIXIU.leash;
  let t = c.targetId ? findEntity(s, c.targetId) : undefined;
  if (t && !leashed(t)) t = undefined;
  if (!t) {
    // it notices units near it, and anyone on the relic while it is near
    t = nearestUnit(
      s,
      c,
      (u) => dist(c, u) <= PIXIU.range || (terrain[u.y * s.width + u.x] === "x" && dist(c, u) <= PIXIU.away),
    );
    if (t && c.targetId === 0 && c.task === "patrolling") {
      c.chaseX = c.x;
      c.chaseY = c.y;
    }
    if (t && !leashed(t)) t = undefined;
  }
  const walk = (i: number) => walkable(s, i);
  if (t) {
    engage(ctx, c, t);
    c.task = "attacking";
    attackStep(ctx, c, t, PIXIU.damage, PIXIU.attackTicks, PIXIU.speed, walk);
    return;
  }
  disengage(c);
  if (c.x !== c.chaseX || c.y !== c.chaseY) {
    c.task = "returning";
    const r = stepToward(ctx, c, tileGoal(c.chaseX, c.chaseY, 0), "route", PIXIU.speed, walk, false);
    if (r === "stuck") {
      c.chaseX = c.x;
      c.chaseY = c.y;
    }
    return;
  }
  c.task = "patrolling";
  if (c.moveCd > 0) return;
  const next = s.pixiuLoop[c.phase];
  c.phase = (c.phase + 1) % s.pixiuLoop.length;
  c.x = next % s.width;
  c.y = Math.floor(next / s.width);
  c.chaseX = c.x;
  c.chaseY = c.y;
  c.moveCd = PIXIU.speed;
}

function relicCheck(ctx: Ctx): void {
  const s = ctx.state;
  if (s.relicClaimed) return;
  const pixiu = s.entities.find((c) => c.kind === "pixiu" && c.hp > 0);
  if (pixiu && relicDist(s, pixiu.x, pixiu.y) <= PIXIU.away) return;
  const terrain = getMap(s).terrain;
  for (const u of s.entities) {
    if (u.hp <= 0 || u.kind !== "labourer" || terrain[u.y * s.width + u.x] !== "x") continue;
    const seat = u.side as Seat;
    s.relicClaimed = true;
    s.grain[seat] += RELIC_BONUS;
    ctx.events.push({ type: "relic.claimed", tick: s.tick, seat, grain: RELIC_BONUS });
    return;
  }
}

// ---- commands ----

function ownUnit(s: SimState, seat: Seat, id: number): Entity | undefined {
  const e = findEntity(s, id);
  return e && e.side === seat && isUnit(e.kind) ? e : undefined;
}

function order(e: Entity, o: Entity["order"]): void {
  e.order = o;
  e.path = [];
  e.pathKey = "";
}

function apply(ctx: Ctx, seat: Seat, c: Command): void {
  const s = ctx.state;
  if (c.type === "train") {
    const b = findEntity(s, c.building);
    if (!b || b.side !== seat || !b.complete || UNITS[c.unit].trainedAt !== b.kind) return;
    if (b.queue.length >= MAX_QUEUE || s.grain[seat] < UNITS[c.unit].cost || popOf(s, seat) + 1 > POP_CAP) return;
    s.grain[seat] -= UNITS[c.unit].cost;
    b.queue.push(c.unit);
    return;
  }
  const units = c.units.map((id) => ownUnit(s, seat, id)).filter((e): e is Entity => !!e);
  switch (c.type) {
    case "stop":
      for (const e of units) setIdle(e);
      return;
    case "move":
      for (const e of units) order(e, { type: "move", x: c.x, y: c.y });
      return;
    case "gather": {
      const tile = c.y * s.width + c.x;
      for (const e of units) if (e.kind === "labourer") order(e, { type: "gather", tile });
      return;
    }
    case "attack": {
      const t = findEntity(s, c.target);
      if (!t || t.side === seat || !seenBy(s, ctx.vis[seat], seat, t)) return;
      for (const e of units) order(e, { type: "attack", target: t.id, auto: false });
      return;
    }
    case "build": {
      const builders = units.filter((e) => e.kind === "labourer");
      if (builders.length === 0) return;
      const half = ownUnfinished(s, seat, c.x, c.y);
      if (half) {
        for (const e of builders) order(e, { type: "build", target: half.id });
        return;
      }
      if (s.grain[seat] < BUILDINGS.barracks.cost) return;
      if (!canPlace(s, seat, "barracks", c.x, c.y, ctx.vis[seat])) return;
      s.grain[seat] -= BUILDINGS.barracks.cost;
      const b = newBuilding(s, "barracks", seat, c.x, c.y, false);
      ctx.events.push({ type: "build.start", tick: s.tick, seat, building: b.id, kind: "barracks", x: c.x, y: c.y });
      for (const e of builders) order(e, { type: "build", target: b.id });
      return;
    }
  }
}

// ---- the tick ----

export function step(state: SimState, commands: { seat: Seat; command: Command }[]): SimEvent[] {
  if (state.winner !== null) return [];
  state.tick++;
  const vis: [Uint8Array, Uint8Array] = [visibleTiles(state, 0), visibleTiles(state, 1)];
  const ctx: Ctx = {
    state,
    events: [],
    budget: PATH_BUDGET,
    vis,
    known: [knownFor(state, 0, vis[0]), knownFor(state, 1, vis[1])],
  };
  for (const { seat, command } of commands) apply(ctx, seat, command);

  // snapshot: pieces made this tick start acting next tick
  for (const e of state.entities.slice()) {
    if (e.hp <= 0) continue;
    if (e.moveCd > 0) e.moveCd--;
    if (e.attackCd > 0) e.attackCd--;
    if (e.gatherCd > 0) e.gatherCd--;
    e.pathAge++;
    if (isBuilding(e.kind)) buildingTick(ctx, e);
    else if (isUnit(e.kind)) unitTick(ctx, e);
    else if (e.kind === "nian") nianTick(ctx, e);
    else if (e.kind === "jiaolong") jiaolongTick(ctx, e);
    else if (e.kind === "qilin") qilinTick(ctx, e);
    else pixiuTick(ctx, e);
  }
  relicCheck(ctx);
  state.entities = state.entities.filter((e) => e.hp > 0);
  updateRevealed(state);
  return ctx.events;
}
