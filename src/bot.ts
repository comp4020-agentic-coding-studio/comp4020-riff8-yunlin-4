// The computer opponent. A pure function of the fogged SeatView a human would
// be shown: no state, no randomness, no clock. The server calls
// botCommands(viewFor(state, seat)) every four ticks; createBot(opts) gives
// the same player with different temperament (used by the soak spec).
// It imports only types and balance numbers, never the simulation's internals.

import { BOT, BUILDINGS, MAX_UNITS_PER_COMMAND, UNITS } from "./sim/balance.ts";
import type { Command, SeatView, VisibleEntity } from "./sim/types.ts";

export interface BotOptions {
  // spearmen at home before the first attack
  attackAt?: number;
  // labourers it trains before spearmen take priority
  labourers?: number;
}

// west-side coordinates (seat 1's own half) of one tile of each safe grove
// beyond the sight of the hall, nearest first: [grove tile x, y]. Seat 0 mirrors.
// The nian's grove (x >= 51) and the glade's (x 46..47, y >= 28) are left out.
const FAR_GROVES: [number, number][] = [
  [12, 6],
  [12, 26],
  [21, 2],
  [21, 30],
  [31, 15],
  [45, 13],
  [45, 19],
];

const cheb = (ax: number, ay: number, bx: number, by: number) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));

function chunk<T>(xs: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += MAX_UNITS_PER_COMMAND) out.push(xs.slice(i, i + MAX_UNITS_PER_COMMAND));
  return out;
}

export function createBot(opts: BotOptions = {}): (view: SeatView) => Command[] {
  const attackAt = opts.attackAt ?? BOT.attackAt;
  const labourerTarget = opts.labourers ?? BOT.labourers;

  return function bot(view: SeatView): Command[] {
    const { width: W, height: H, seat } = view;
    const mine = view.entities.filter((e) => e.side === seat);
    const foes = view.entities.filter((e) => e.side === 1 - seat);
    const hall = mine.find((e) => e.kind === "hall");
    if (!hall) return [];
    const barracks = mine.filter((e) => e.kind === "barracks");
    const labourers = mine.filter((e) => e.kind === "labourer");
    const spears = mine.filter((e) => e.kind === "spearman");
    const hx = hall.x + 1;
    const hy = hall.y + 1;
    const dir = seat === 1 ? 1 : -1; // inland: towards the river
    const ground = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? "" : view.ground[y * W + x]);
    const mirror = (x: number) => (seat === 1 ? x : W - 1 - x);

    const train: Command[] = [];
    const build: Command[] = [];
    const army: Command[] = [];
    const work: Command[] = [];

    // ---- economy: training ----
    const spend = { grain: view.grain, pop: view.pop };
    const tryTrain = (b: VisibleEntity, unit: "labourer" | "spearman", cost: number) => {
      if (spend.grain < cost || spend.pop >= view.popCap) return;
      spend.grain -= cost;
      spend.pop++;
      train.push({ type: "train", building: b.id, unit });
    };
    const hallBusy = hall.progress !== undefined;
    const wantLabourers = labourers.length + (hallBusy ? 1 : 0) < labourerTarget;
    const needBarracks = barracks.length === 0 && labourers.length >= BOT.barracksAt;
    if (wantLabourers && !hallBusy && !(needBarracks && spend.grain < BOT.saveForBarracks)) tryTrain(hall, "labourer", UNITS.labourer.cost);
    // a barracks shows progress only while it is training, so keep each one
    // busy: train at the idle ones, and queue a second only when grain piles up
    for (const b of barracks) {
      if (b.task === "building") continue;
      if (b.progress === undefined || (b.progress >= 60 && spend.grain >= BOT.queueSecondGrain)) tryTrain(b, "spearman", UNITS.spearman.cost);
    }

    // ---- economy: the barracks ----
    const wantBarracks = barracks.length === 0 ? labourers.length >= BOT.barracksAt : barracks.length === 1 && barracks[0].task !== "building" && view.grain >= BOT.secondBarracksGrain && labourers.length >= labourerTarget;
    if (wantBarracks && view.grain >= BUILDINGS.barracks.cost) {
      const foot = view.entities.filter((e) => e.side !== "wild" || true).map((e) => {
        const s = e.kind === "hall" ? 3 : e.kind === "barracks" ? 2 : 1;
        return { x: e.x, y: e.y, s };
      });
      const free = (x: number, y: number) => {
        for (let dy = 0; dy < 2; dy++)
          for (let dx = 0; dx < 2; dx++) if (ground(x + dx, y + dy) !== "P") return false;
        return !foot.some((f) => x < f.x + f.s && f.x < x + 2 && y < f.y + f.s && f.y < y + 2);
      };
      const offs = [-4, 4, -5, 5, -3, 3, -6, 6, 0];
      let site: [number, number] | null = null;
      for (const dx of [5, 6, 4, 7]) {
        for (const dy of offs) {
          const x = dir > 0 ? hall.x + dx : hall.x - dx - 1;
          const y = hall.y + dy;
          if (free(x, y)) {
            site = [x, y];
            break;
          }
        }
        if (site) break;
      }
      if (site) {
        const [sx, sy] = site;
        const pick = labourers
          .filter((l) => (l.carrying ?? 0) === 0 || labourers.length < 8)
          .sort((a, b) => cheb(a.x, a.y, sx, sy) - cheb(b.x, b.y, sx, sy) || a.id - b.id)
          .slice(0, 2);
        if (pick.length > 0) build.push({ type: "build", units: pick.map((p) => p.id), building: "barracks", x: sx, y: sy });
      }
    }

    // ---- economy: gathering ----
    const idle = labourers.filter((l) => l.task === "idle");
    if (idle.length > 0) {
      const tiles: [number, number][] = [];
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const c = ground(x, y);
          if (c !== "g" && c !== "G") continue;
          const wx = Math.min(x, W - 1 - x);
          if (wx >= 46) continue; // the nian's grove and the glade's groves
          if (seat === 1 ? x > 55 : x < 56) continue; // own half only
          tiles.push([x, y]);
        }
      }
      const load = new Map<number, number>();
      const byTile = new Map<number, number[]>();
      for (const l of idle) {
        let best = -1;
        let bestScore = Infinity;
        for (const [x, y] of tiles) {
          const k = y * W + x;
          const score = cheb(l.x, l.y, x, y) + 1.5 * (load.get(k) ?? 0) + 0.3 * cheb(hx, hy, x, y);
          if (score < bestScore) {
            bestScore = score;
            best = k;
          }
        }
        if (best >= 0) {
          load.set(best, (load.get(best) ?? 0) + 1);
          byTile.set(best, [...(byTile.get(best) ?? []), l.id]);
        }
      }
      for (const [k, units] of byTile) work.push({ type: "gather", units, x: k % W, y: Math.floor(k / W) });
      // nothing known to gather from (or little): send one idle labourer to look at the next grove
      if (tiles.length < 4) {
        const unseen = FAR_GROVES.find(([x, y]) => ground(mirror(x), y) === " ");
        const scout = idle.find((l) => !byTile.size || !(byTile.get([...byTile.keys()][0])?.includes(l.id) && idle.length > 1)) ?? idle[0];
        if (unseen && scout) {
          const [gx, gy] = unseen;
          work.push({ type: "move", units: [scout.id], x: mirror(gx - 3), y: gy });
        }
      }
    }

    // ---- the army ----
    const hallDist = (e: VisibleEntity) => cheb(e.x, e.y, hx, hy);
    const enemyUnits = foes.filter((e) => e.kind === "spearman" || e.kind === "labourer");
    const intruders = enemyUnits.filter((e) => hallDist(e) <= BOT.intruderRadius);
    const nearestTo = (x: number, y: number, list: VisibleEntity[]) =>
      list.slice().sort((a, b) => cheb(a.x, a.y, x, y) - cheb(b.x, b.y, x, y) || a.id - b.id)[0];
    const sendAttack = (units: VisibleEntity[], target: VisibleEntity) => {
      for (const c of chunk(units.map((u) => u.id))) army.push({ type: "attack", units: c, target: target.id });
    };
    const sendMove = (units: VisibleEntity[], x: number, y: number) => {
      for (const c of chunk(units.map((u) => u.id))) army.push({ type: "move", units: c, x, y });
    };
    const rally = { x: hx + dir * BOT.rallyDist, y: hy };

    const home = spears.filter((s) => hallDist(s) <= BOT.homeRadius);
    const away = spears.filter((s) => hallDist(s) > BOT.homeRadius);
    const soldiersSeen = foes.filter((e) => e.kind === "spearman");
    const enemyHall = foes.find((e) => e.kind === "hall");
    // the home guard: the spearmen nearest the hall never march
    const guard = home
      .slice()
      .sort((a, b) => hallDist(a) - hallDist(b) || a.id - b.id)
      .slice(0, BOT.homeGuard);
    const field = home.filter((s) => !guard.includes(s));
    // the hall is under attack: enemy soldiers at home, or anyone at its walls
    const besieged = intruders.some((e) => e.kind === "spearman" || hallDist(e) <= BOT.wallRadius);
    // a wave beating on a hall that's nearly down finishes the job instead
    const finishing = (s: VisibleEntity) =>
      !!enemyHall && enemyHall.hp * 3 < enemyHall.maxHp && cheb(s.x, s.y, enemyHall.x + 1, enemyHall.y + 1) <= 3;

    if (intruders.length > 0 && (besieged || spears.length > 0)) {
      // defend: the nearest intruder (soldiers first); when the hall itself
      // is under attack, every spearman comes home for it
      const soldiers = intruders.filter((e) => e.kind === "spearman");
      const pool = soldiers.length > 0 ? soldiers : intruders;
      const t = nearestTo(hx, hy, pool);
      const reach = (s: VisibleEntity) => (besieged ? !finishing(s) : hallDist(s) <= BOT.defendRadius);
      const guards = spears.filter((s) => reach(s) && (s.task !== "attacking" || cheb(s.x, s.y, t.x, t.y) > 1));
      if (guards.length > 0) sendAttack(guards, t);
    } else if (away.length > 0 && away.length < BOT.regroupBelow && soldiersSeen.length >= away.length) {
      // regroup: the wave is nearly spent
      sendMove(away, rally.x, rally.y);
    } else {
      const waveGo = away.length === 0 ? field.length >= attackAt : field.length >= Math.max(BOT.laterWaveAt, attackAt - 2);
      const marchers = [...away, ...(waveGo ? field : [])];
      // hold the home group (and always the guard) at the rally point
      const holding = waveGo ? guard : home;
      const loose = holding.filter((s) => s.task === "idle" && cheb(s.x, s.y, rally.x, rally.y) > 4);
      if (loose.length > 0) sendMove(loose, rally.x, rally.y);
      if (marchers.length > 0) {
        // retarget fighters only when a soldier is nearby; otherwise only idle ones need orders
        const prey = (m: VisibleEntity) => {
          const near = soldiersSeen.filter((e) => cheb(e.x, e.y, m.x, m.y) <= BOT.preyRadius);
          if (near.length > 0) return nearestTo(m.x, m.y, near);
          if (m.task !== "idle" && m.task !== "moving") return undefined;
          if (enemyHall) return enemyHall;
          const rest = foes.filter((e) => e.kind === "labourer");
          if (rest.length > 0) return nearestTo(m.x, m.y, rest);
          const bs = foes.filter((e) => e.kind === "barracks");
          if (bs.length > 0) return nearestTo(m.x, m.y, bs);
          return undefined;
        };
        const groups = new Map<number, VisibleEntity[]>();
        const walkers: VisibleEntity[] = [];
        for (const m of marchers) {
          const t = prey(m);
          if (t && (m.task !== "attacking" || soldiersSeen.some((e) => e.id === t.id))) {
            groups.set(t.id, [...(groups.get(t.id) ?? []), m]);
          } else if (!t && m.task !== "attacking") walkers.push(m);
        }
        for (const [id, us] of groups) {
          const t = view.entities.find((e) => e.id === id)!;
          sendAttack(us, t);
        }
        // the march: gather at the muster point on this bank of the north
        // ford, cross together once nobody is straggling, then on to where
        // the enemy hall must be
        const riverLo = 54;
        const riverHi = 57;
        const across = (m: VisibleEntity) => (seat === 1 ? m.x > riverHi : m.x < riverLo);
        const muster = { x: seat === 1 ? riverLo - BOT.musterDist : riverHi + BOT.musterDist, y: 10 };
        const farBank = { x: seat === 1 ? riverHi + 3 : riverLo - 3, y: 10 };
        const enemyX = seat === 1 ? W - 1 - 6 : 6;
        const atMuster = (m: VisibleEntity) => cheb(m.x, m.y, muster.x, muster.y) <= BOT.musterRadius;
        const behind = marchers.filter((m) => !across(m) && m.task !== "attacking");
        const ready = behind.every(atMuster);
        const idleW = walkers.filter((m) => m.task === "idle");
        const over = idleW.filter(across);
        if (over.length > 0) sendMove(over, enemyX, hy);
        const here = idleW.filter((m) => !across(m));
        if (ready) {
          if (here.length > 0) sendMove(here, farBank.x, farBank.y);
        } else {
          const toMuster = here.filter((m) => !atMuster(m));
          if (toMuster.length > 0) sendMove(toMuster, muster.x, muster.y);
        }
      }
    }

    // never poke creatures: nothing above targets a "wild" piece
    return [...train, ...build, ...army, ...work].slice(0, BOT.maxCommands);
  };
}

export const botCommands = createBot();
