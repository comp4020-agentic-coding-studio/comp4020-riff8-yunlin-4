import { createHash, randomInt } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  createMatchRow,
  endMatchRow,
  getMatchRow,
  insertMatchCommands,
  lastCommandTick,
  latestMatchRow,
  sealChronicle,
  startMatchRow,
  unfinishedMatchRows,
} from "./db.ts";
import type { MatchRow } from "./db.ts";
import { log, logError } from "./log.ts";
import { markOf } from "./mark.ts";
import { sealGlyph } from "./seal.ts";
import { publish } from "./events.ts";
import { BOT, createMatch, MAP_IDS, MAX_TICKS, ownerOf, step, TICKS_PER_SECOND, validateCommand, viewFor } from "./sim/index.ts";
import type { SimState } from "./sim/index.ts";
import type { Command, Seat, SeatView, SimEvent } from "./sim/types.ts";
import { botCommands } from "./bot.ts";

// The one match slot (ADR 0003) and the fog boundary (ADR 0002). Seat tokens
// live in memory only; the row keeps marks and a full SHA-256 of each token.
// Everything sent to a client is a SeatView, a filtered SimEvent list or a
// status object: ids, small integers and fixed keys, never a token or a mark.

export const MANUAL = process.env.MATCH_MANUAL_TICKS === "1";
if (MANUAL && process.env.FLY_APP_NAME) {
  logError(new Error("MATCH_MANUAL_TICKS=1 is for local playtests only; refusing to start with FLY_APP_NAME set"));
  process.exit(1);
}

const TICK_MS = 250;
const FORFEIT_MS = Number(process.env.MATCH_IDLE_FORFEIT_MS ?? 5 * 60_000);
const ABANDON_MS = Number(process.env.MATCH_ABANDON_MS ?? 10 * 60_000);
const RATE_PER_SECOND = 10;
const COMMAND_LOG_MS = 2000;
const MAX_STREAMS = 100;
const MAX_STREAMS_PER_IP = 10;
const HEARTBEAT_MS = 20_000;
const MAX_STREAM_MS = 15 * 60_000;
const CHRONICLE_MAX = 320;
const NOT_YOURS = { error: "not-yours", message: "no such unit of yours" };

export type Reason = "hall" | "forfeit" | "abandoned" | "restart" | "time";

export interface Outcome {
  status: number;
  body: unknown;
  deny?: { reason: string; extra?: Record<string, unknown> };
}

interface Chron {
  barracks: [number | null, number | null];
  labourers: [number, number];
  spearmen: [number, number];
  lostTo: [Record<string, number>, Record<string, number>];
  slain: [number, number];
  crossed: [{ tick: number; kind: string } | null, { tick: number; kind: string } | null];
  relic: { seat: Seat; tick: number } | null;
  forfeit: { seat: Seat; why: "idle" | "chose" } | null;
}

interface Live {
  id: number;
  mapId: string;
  seed: number;
  status: "waiting" | "playing";
  tokens: [string, string | null];
  bot: boolean;
  state: SimState | null;
  queue: { seat: Seat; command: Command }[];
  lastCmd: [number, number];
  lastAny: number;
  rate: [number[], number[]];
  chron: Chron;
  // the last RECENT fog-filtered events per seat, for the status object
  recent: [SimEvent[], SimEvent[]];
}

let live: Live | null = null;
// The final state of the most recent match this process ran, for its players' last view.
let finished: { id: number; state: SimState | null; recent: [SimEvent[], SimEvent[]] } | null = null;
const RECENT = 200;
let tickTimer: NodeJS.Timeout | undefined;
let idleTimer: NodeJS.Timeout | undefined;
let waitTimer: NodeJS.Timeout | undefined;

const hashOf = (token: string): string => createHash("sha256").update(token).digest("hex");

function seatMark(m: Live, seat: Seat): string {
  if (seat === 0) return markOf(m.tokens[0]);
  if (m.bot) return "bot";
  return m.tokens[1] ? markOf(m.tokens[1]) : "-";
}

function sideMark(m: Live, side: Seat | "wild" | undefined): string {
  if (side === undefined) return "-";
  if (side === "wild") return "wild";
  return seatMark(m, side);
}

function seatOfLive(token: string): Seat | null {
  if (!live) return null;
  if (live.tokens[0] === token) return 0;
  if (live.tokens[1] === token) return 1;
  return null;
}

function seatOfRow(row: MatchRow, token: string): Seat | null {
  const h = hashOf(token);
  if (row.east_hash === h) return 0;
  if (row.west_hash === h) return 1;
  return null;
}

// ---- restart: an in-flight match is ended, not rebuilt (ADR 0003) ----

for (const row of unfinishedMatchRows()) {
  const ticks = lastCommandTick(row.id);
  const names = namesFrom(row.east.charAt(0), row.west === "bot" ? null : (row.west ?? "").charAt(0) || null, row.west === "bot");
  const chronicle = clipChronicle([`${names[0]} held the east${row.west ? ` and ${names[1]} the west` : ""}`], "the server restarted and the match was broken off");
  endMatchRow(row.id, { winner: null, reason: "restart", ticks, chronicle });
  log("match.end", { match: row.id, ticks, winner: null, winnerSeat: null, reason: "restart", east: row.east, west: row.west ?? "-" });
}

// ---- status ----

export interface StatusObject {
  status: "none" | "waiting" | "playing" | "ended";
  matchId: number | null;
  mapId: string | null;
  seed?: number;
  seatsOpen: number[];
  you: Seat | null;
  manualTicks: boolean;
  view: SeatView | null;
  recentEvents?: SimEvent[];
  result: {
    winner: Seat | null;
    reason: string;
    ticks: number;
    youWon: boolean;
    chronicle: string;
    chronicleSealed: boolean;
  } | null;
}

export function statusFor(token: string | null, withView = true): StatusObject {
  const base = { manualTicks: MANUAL, view: null, result: null };
  if (live) {
    const you = token ? seatOfLive(token) : null;
    return {
      ...base,
      status: live.status,
      matchId: live.id,
      mapId: live.mapId,
      seed: live.seed,
      seatsOpen: live.status === "waiting" ? [1] : [],
      you,
      view: withView && you !== null && live.state ? viewFor(live.state, you) : null,
      ...(withView && you !== null && live.state ? { recentEvents: live.recent[you] } : {}),
    };
  }
  const row = latestMatchRow();
  if (!row) return { ...base, status: "none", matchId: null, mapId: null, seatsOpen: [], you: null };
  const you = token ? seatOfRow(row, token) : null;
  const view = withView && you !== null && finished?.id === row.id && finished.state ? viewFor(finished.state, you) : null;
  return {
    ...base,
    status: "ended",
    matchId: row.id,
    mapId: row.map_id,
    seed: row.seed,
    seatsOpen: [],
    you,
    view,
    ...(view && you !== null && finished ? { recentEvents: finished.recent[you] } : {}),
    result:
      you === null
        ? null
        : {
            winner: row.winner === 0 || row.winner === 1 ? row.winner : null,
            reason: row.reason ?? "abandoned",
            ticks: row.ticks ?? 0,
            youWon: row.winner === you,
            chronicle: row.chronicle ?? "",
            chronicleSealed: (you === 0 ? row.sealed_0 : row.sealed_1) === 1,
          },
  };
}

// ---- lifecycle ----

export function create(token: string): Outcome {
  if (live) {
    if (seatOfLive(token) !== null) return refuse(409, "already-seated", "You already hold a seat in this match.", { match: live.id });
    return refuse(409, "match-busy", "A match is already under way; only one runs at a time.", { match: live.id });
  }
  const mapId = MAP_IDS[0]!;
  const seed = randomInt(0, 2 ** 31 - 1);
  const id = createMatchRow(mapId, seed, markOf(token), hashOf(token));
  live = {
    id,
    mapId,
    seed,
    status: "waiting",
    tokens: [token, null],
    bot: false,
    state: null,
    queue: [],
    lastCmd: [0, 0],
    lastAny: 0,
    rate: [[], []],
    chron: emptyChron(),
    recent: [[], []],
  };
  log("match.create", { who: markOf(token), match: id, seat: 0 });
  waitTimer = setTimeout(() => {
    if (live?.id === id && live.status === "waiting") end(null, "abandoned");
  }, ABANDON_MS);
  broadcastStatus();
  return { status: 201, body: statusFor(token) };
}

export function join(token: string): Outcome {
  if (!live) return refuse(409, "no-match", "There is no match to join.");
  if (seatOfLive(token) !== null) return refuse(409, "already-seated", "You already hold a seat in this match.", { match: live.id });
  if (live.status !== "waiting") return refuse(409, "match-full", "Both seats are taken.", { match: live.id });
  live.tokens[1] = token;
  log("match.join", { who: markOf(token), match: live.id, seat: 1 });
  start(markOf(token), hashOf(token));
  return { status: 200, body: statusFor(token) };
}

export function bot(token: string): Outcome {
  if (!live) return refuse(409, "no-match", "There is no match.");
  if (live.tokens[0] !== token) {
    return refuse(403, "not-yours", "Only the east seat can call in the bot.", { match: live.id, owner: markOf(live.tokens[0]) });
  }
  if (live.status !== "waiting") return refuse(409, "match-full", "Both seats are taken.", { match: live.id });
  live.bot = true;
  log("match.bot", { who: markOf(token), match: live.id });
  start("bot", null);
  return { status: 200, body: statusFor(token) };
}

function start(westMark: string, westHash: string | null): void {
  const m = live!;
  clearTimeout(waitTimer);
  waitTimer = undefined;
  startMatchRow(m.id, westMark, westHash);
  m.state = createMatch(m.mapId, m.seed);
  m.status = "playing";
  const now = Date.now();
  m.lastCmd = [now, now];
  m.lastAny = now;
  log("match.start", { who: markOf(m.tokens[0]), match: m.id, map: m.mapId, seed: m.seed, east: seatMark(m, 0), west: seatMark(m, 1) });
  if (MANUAL) idleTimer = setInterval(checkIdle, Math.max(20, Math.min(1000, Math.floor(FORFEIT_MS / 5))));
  else tickTimer = setInterval(tick, TICK_MS);
  broadcastStatus();
}

export function forfeit(token: string): Outcome {
  if (!live) return refuse(409, "no-match", "There is no match.");
  const seat = seatOfLive(token);
  if (seat === null) return refuse(403, "not-seated", "You don't hold a seat in this match.", { match: live.id });
  if (live.status === "waiting") {
    end(null, "abandoned");
  } else {
    forfeitSeat(seat, "chose");
  }
  return { status: 200, body: statusFor(token) };
}

function forfeitSeat(seat: Seat, why: "idle" | "chose"): void {
  const m = live!;
  m.chron.forfeit = { seat, why };
  log("match.forfeit", { who: seatMark(m, seat), match: m.id, tick: m.state?.tick ?? 0, seat, why });
  end(seat === 0 ? 1 : 0, "forfeit");
}

function checkIdle(now = Date.now()): void {
  const m = live;
  if (!m || m.status !== "playing") return;
  if (now - m.lastAny >= ABANDON_MS) {
    end(null, "abandoned");
    return;
  }
  // One seat gone while the other is still playing forfeits; both gone waits for abandonment.
  const humans: Seat[] = m.bot ? [0] : [0, 1];
  const idle = humans.filter((s) => now - m.lastCmd[s] >= FORFEIT_MS);
  if (idle.length === 1) forfeitSeat(idle[0]!, "idle");
}

function end(winner: Seat | null, reason: Reason): void {
  const m = live;
  if (!m) return;
  clearInterval(tickTimer);
  clearInterval(idleTimer);
  clearTimeout(waitTimer);
  tickTimer = idleTimer = waitTimer = undefined;
  flushCommandLogs(m.id);
  flushRateLogs();
  const ticks = m.state?.tick ?? 0;
  const chronicle = chronicleText(m, winner, reason, ticks);
  endMatchRow(m.id, { winner, reason, ticks, chronicle });
  log("match.end", {
    match: m.id,
    ticks,
    winner: winner === null ? null : seatMark(m, winner),
    winnerSeat: winner,
    reason,
    east: seatMark(m, 0),
    west: m.status === "waiting" ? "-" : seatMark(m, 1),
  });
  finished = { id: m.id, state: m.state, recent: m.recent };
  live = null;
  broadcastStatus();
}

// ---- commands ----

function refuse(status: number, reason: string, message: string, extra: Record<string, unknown> = {}): Outcome {
  return { status, body: { error: reason, message }, deny: { reason, extra } };
}

export function command(token: string, who: string, raw: Record<string, unknown>, route: string): Outcome {
  if (!live || live.status !== "playing" || !live.state) return refuse(409, "no-match", "No match is being played.");
  const m = live;
  const state = live.state;
  const seat = seatOfLive(token);
  if (seat === null) return refuse(403, "not-seated", "You don't hold a seat in this match.", { match: m.id });

  const now = Date.now();
  const window = m.rate[seat].filter((t) => now - t < 1000);
  m.rate[seat] = window;
  if (window.length >= RATE_PER_SECOND) {
    noteRateDenied(seat, who, route, m.id);
    return { status: 429, body: { error: "rate", message: "Too many commands; at most ten a second." } };
  }
  window.push(now);

  const type = typeof raw.type === "string" ? raw.type.slice(0, 16) : "-";
  const v = validateCommand(state, seat, raw);
  if (!v.ok) {
    if (v.reason === "not-yours") {
      return { status: 422, body: NOT_YOURS, deny: { reason: "not-yours", extra: { match: m.id, type, owner: trueOwner(m, seat, raw) } } };
    }
    const status = v.reason === "malformed" ? 400 : 422;
    return { status, body: { error: v.reason, message: v.detail }, deny: { reason: v.reason, extra: { match: m.id, type } } };
  }
  m.queue.push({ seat, command: v.command });
  m.lastCmd[seat] = now;
  m.lastAny = now;
  return { status: 202, body: { tick: state.tick + 1 } };
}

// The first id named that isn't the commander's own, for the log only.
function trueOwner(m: Live, seat: Seat, raw: Record<string, unknown>): string {
  const ids: unknown[] = [...(Array.isArray(raw.units) ? raw.units : []), raw.building, raw.target];
  for (const id of ids) {
    if (typeof id !== "number" || !Number.isInteger(id)) continue;
    const side = ownerOf(m.state!, id);
    if (side !== seat) return sideMark(m, side);
  }
  return "-";
}

// At most one rate-denied line per seat per second, with a count.
const rateLog = new Map<Seat, { count: number; who: string; route: string; match: number; timer: NodeJS.Timeout }>();

function noteRateDenied(seat: Seat, who: string, route: string, match: number): void {
  const open = rateLog.get(seat);
  if (open) {
    open.count++;
    return;
  }
  const timer = setTimeout(() => flushRate(seat), 1000);
  timer.unref();
  rateLog.set(seat, { count: 1, who, route, match, timer });
}

function flushRate(seat: Seat): void {
  const open = rateLog.get(seat);
  if (!open) return;
  clearTimeout(open.timer);
  rateLog.delete(seat);
  log("denied", { who: open.who, reason: "rate", route: open.route, match: open.match, count: open.count });
}

function flushRateLogs(): void {
  for (const seat of [...rateLog.keys()]) flushRate(seat);
}

// One `command` line per seat per type per two seconds.
const commandLog = new Map<string, { who: string; match: number; tick: number; seat: Seat; type: string; n: number; units: number; timer: NodeJS.Timeout }>();

function noteCommand(m: Live, seat: Seat, c: Command, tick: number): void {
  const key = `${m.id}:${seat}:${c.type}`;
  const units = "units" in c ? c.units.length : 0;
  const open = commandLog.get(key);
  if (open) {
    open.n++;
    open.units += units;
    return;
  }
  const timer = setTimeout(() => flushCommand(key), COMMAND_LOG_MS);
  timer.unref();
  commandLog.set(key, { who: seatMark(m, seat), match: m.id, tick, seat, type: c.type, n: 1, units, timer });
}

function flushCommand(key: string): void {
  const open = commandLog.get(key);
  if (!open) return;
  clearTimeout(open.timer);
  commandLog.delete(key);
  const { timer: _t, ...fields } = open;
  log("command", fields);
}

function flushCommandLogs(match: number): void {
  for (const key of [...commandLog.keys()]) if (key.startsWith(`${match}:`)) flushCommand(key);
}

// ---- the tick ----

function tick(): void {
  try {
    advance();
  } catch (err) {
    logError(err, { route: "match.tick" });
    end(null, "abandoned");
  }
}

function advance(): void {
  const m = live;
  if (!m || m.status !== "playing" || !m.state) return;
  const state = m.state;
  const t = state.tick;

  // seat 0's commands in arrival order, then seat 1's; re-checked against
  // this tick's state, since a unit named on arrival may have died since.
  const ordered = [...m.queue.filter((q) => q.seat === 0), ...m.queue.filter((q) => q.seat === 1)];
  m.queue = [];
  const applied: { seat: Seat; command: Command }[] = [];
  for (const q of ordered) {
    const v = validateCommand(state, q.seat, q.command);
    if (v.ok) applied.push({ seat: q.seat, command: v.command });
  }
  insertMatchCommands(m.id, t + 1, applied);
  for (const a of applied) noteCommand(m, a.seat, a.command, t + 1);

  const events = step(state, applied);
  const views: [SeatView, SeatView] = [viewFor(state, 0), viewFor(state, 1)];
  logEvents(m, events);
  noteChronicle(m, events, views);

  // Each seat's frame is filtered once per tick, against that tick's view.
  const known: [SimEvent[], SimEvent[]] = [eventsFor(events, 0, views[0]), eventsFor(events, 1, views[1])];
  for (const seat of [0, 1] as const) {
    if (known[seat].length === 0) continue;
    m.recent[seat].push(...known[seat]);
    if (m.recent[seat].length > RECENT) m.recent[seat].splice(0, m.recent[seat].length - RECENT);
  }
  if (batch) {
    batch.known[0].push(...known[0]);
    batch.known[1].push(...known[1]);
  } else {
    sendTick(views, known);
  }

  if (m.bot && state.tick % BOT.everyTicks === 0 && state.winner === null) {
    let botCmds: Command[] = [];
    try {
      botCmds = botCommands(views[1]).slice(0, BOT.maxCommands);
    } catch (err) {
      logError(err, { route: "match.bot" });
    }
    for (const c of botCmds) {
      const v = validateCommand(state, 1, c);
      if (v.ok) m.queue.push({ seat: 1, command: v.command });
    }
  }

  if (state.winner !== null && state.winner !== undefined) end(state.winner, "hall");
  else if (state.tick >= MAX_TICKS) end(null, "time");
  else checkIdle();
}

function sendTick(views: [SeatView, SeatView], known: [SimEvent[], SimEvent[]]): void {
  for (const v of [...viewers]) {
    if (v.seat === null) continue;
    sendFrame(v, "view", views[v.seat]);
    sendFrame(v, "events", known[v.seat]);
  }
}

// In manual-tick mode a step's ticks are sent as one view and one events
// frame, after the step (docs/match-api.md).
let batch: { known: [SimEvent[], SimEvent[]] } | null = null;

export function manualStep(token: string, raw: Record<string, unknown>): Outcome {
  if (!live || live.status !== "playing") return refuse(409, "no-match", "No match is being played.");
  if (seatOfLive(token) === null) return refuse(403, "not-seated", "You don't hold a seat in this match.", { match: live.id });
  const n = raw.ticks;
  if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > 400) {
    return refuse(400, "malformed", "ticks must be a whole number from 1 to 400.");
  }
  const state = live.state!;
  batch = { known: [[], []] };
  try {
    for (let i = 0; i < n && live?.status === "playing"; i++) tick();
  } finally {
    const { known } = batch;
    batch = null;
    sendTick([viewFor(state, 0), viewFor(state, 1)], known);
  }
  return { status: 200, body: statusFor(token) };
}

// What a seat may know of a tick's events: its own pieces', and others' only
// where the piece or tile is in its view after the tick.
export function eventsFor(events: SimEvent[], seat: Seat, view: SeatView): SimEvent[] {
  const ids = new Set(view.entities.map((e) => e.id));
  const tileSeen = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x >= view.width || y >= view.height) return false;
    const ch = view.ground.charAt(y * view.width + x);
    return ch !== " " && ch !== ch.toLowerCase();
  };
  return events.filter((e) => {
    switch (e.type) {
      case "build.start":
        return e.seat === seat || tileSeen(e.x, e.y);
      case "build.done":
        return e.seat === seat || ids.has(e.building);
      case "unit.trained":
        return e.seat === seat || ids.has(e.unit);
      case "creature.aggro":
        return e.targetSeat === seat || (ids.has(e.creature) && ids.has(e.target));
      case "unit.died":
        return e.side === seat || tileSeen(e.x, e.y);
      case "relic.claimed":
        return e.seat === seat;
      case "match.end":
        return true;
      default:
        return false;
    }
  });
}

function logEvents(m: Live, events: SimEvent[]): void {
  const died = new Map<string, { e: Extract<SimEvent, { type: "unit.died" }>; count: number }>();
  for (const e of events) {
    switch (e.type) {
      case "build.start":
      case "build.done":
        log(e.type, { who: seatMark(m, e.seat), match: m.id, tick: e.tick, seat: e.seat, kind: e.kind, building: e.building });
        break;
      case "unit.trained":
        log("unit.trained", { who: seatMark(m, e.seat), match: m.id, tick: e.tick, seat: e.seat, kind: e.kind, unit: e.unit });
        break;
      case "creature.aggro":
        log("creature.aggro", { who: "-", match: m.id, tick: e.tick, creature: e.kind, target: e.target, targetSeat: e.targetSeat, owner: seatMark(m, e.targetSeat) });
        break;
      case "unit.died": {
        const key = `${e.side}:${e.kind}:${e.cause}:${e.byKind}:${e.bySide}`;
        const open = died.get(key);
        if (open) open.count++;
        else died.set(key, { e, count: 1 });
        break;
      }
      case "relic.claimed":
        log("relic.claimed", { who: seatMark(m, e.seat), match: m.id, tick: e.tick, seat: e.seat, grain: e.grain });
        break;
      default:
        break;
    }
  }
  for (const { e, count } of died.values()) {
    log("unit.died", {
      who: e.side === "wild" ? "-" : seatMark(m, e.side),
      match: m.id,
      tick: e.tick,
      seat: e.side,
      kind: e.kind,
      unit: e.unit,
      cause: e.cause,
      by: e.byKind,
      bySeat: e.bySide,
      owner: sideMark(m, e.side),
      ...(count > 1 ? { count } : {}),
    });
  }
}

// ---- chronicle ----

function emptyChron(): Chron {
  return {
    barracks: [null, null],
    labourers: [0, 0],
    spearmen: [0, 0],
    lostTo: [{}, {}],
    slain: [0, 0],
    crossed: [null, null],
    relic: null,
    forfeit: null,
  };
}

function noteChronicle(m: Live, events: SimEvent[], views: [SeatView, SeatView]): void {
  const c = m.chron;
  for (const e of events) {
    if (e.type === "build.done" && e.kind === "barracks" && c.barracks[e.seat] === null) c.barracks[e.seat] = e.tick;
    else if (e.type === "unit.trained") {
      if (e.kind === "labourer") c.labourers[e.seat]++;
      else c.spearmen[e.seat]++;
    } else if (e.type === "unit.died" && e.side !== "wild") {
      if (e.cause === "creature") c.lostTo[e.side][e.byKind] = (c.lostTo[e.side][e.byKind] ?? 0) + 1;
      else c.slain[e.side]++;
    } else if (e.type === "relic.claimed" && !c.relic) c.relic = { seat: e.seat, tick: e.tick };
  }
  // A seat has crossed when one of its people stands past the river's middle.
  for (const seat of [0, 1] as const) {
    if (c.crossed[seat]) continue;
    const mid = views[seat].width / 2;
    const over = views[seat].entities.find(
      (e) => e.side === seat && (e.kind === "labourer" || e.kind === "spearman") && (seat === 0 ? e.x < mid - 2 : e.x > mid + 1),
    );
    if (over) c.crossed[seat] = { tick: views[seat].tick, kind: over.kind };
  }
}

const NUMBERS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const words = (n: number): string => NUMBERS[n] ?? String(n);
const CREATURES: Record<string, string> = { nian: "the 年 nian", jiaolong: "the 蛟龍 jiaolong", qilin: "the 麒麟 qilin", pixiu: "the 貔貅 pixiu" };

function clock(ticks: number): string {
  const secs = Math.floor(ticks / TICKS_PER_SECOND);
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
}

function ordinal(n: number): string {
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th");
  return `${n}${s}`;
}

const minuteOf = (ticks: number): string => `the ${ordinal(Math.floor(ticks / TICKS_PER_SECOND / 60) + 1)} minute`;

function namesFrom(east: string, west: string | null, isBot: boolean): [string, string] {
  const w = isBot ? "the bot" : (west ?? "nobody");
  if (!isBot && west && west === east) return [`${east} of the east`, `${west} of the west`];
  return [east, w];
}

function clipChronicle(clauses: string[], ending: string): string {
  let text = "";
  for (const c of clauses) {
    const next = text ? `${text}; ${c}` : c;
    if (`${next}; ${ending}.`.length > CHRONICLE_MAX) break;
    text = next;
  }
  const out = text ? `${text}; ${ending}.` : `${ending.charAt(0).toUpperCase()}${ending.slice(1)}.`;
  return out.length > CHRONICLE_MAX ? `${out.slice(0, CHRONICLE_MAX - 1)}…` : out;
}

// Deterministic, from the match's own events: glyphs or "the bot", no player text.
function chronicleText(m: Live, winner: Seat | null, reason: Reason, ticks: number): string {
  const names = namesFrom(sealGlyph(m.tokens[0]), m.tokens[1] ? sealGlyph(m.tokens[1]) : null, m.bot);
  const c = m.chron;
  if (m.status === "waiting") return clipChronicle([], `${names[0]} unrolled the second scroll and waited, and nobody came`);
  const clauses = [`${names[0]} raised its hall in the east and ${names[1]} in the west`];
  for (const s of [0, 1] as const) {
    const b = c.barracks[s];
    if (b !== null) clauses.push(`${names[s]} built a barracks in ${minuteOf(b)}`);
  }
  for (const s of [0, 1] as const) {
    if (c.labourers[s] + c.spearmen[s] > 0) {
      clauses.push(`${names[s]} trained ${words(c.labourers[s])} labourers and ${words(c.spearmen[s])} spears`);
    }
  }
  for (const s of [0, 1] as const) {
    for (const [kind, n] of Object.entries(c.lostTo[s]).sort(([a], [b]) => a.localeCompare(b))) {
      clauses.push(`${CREATURES[kind] ?? kind} took ${words(n)} of ${names[s]}'s people`);
    }
  }
  for (const s of [0, 1] as const) {
    const x = c.crossed[s];
    if (x) clauses.push(`${names[s]}'s ${x.kind === "spearman" ? "spears" : "labourers"} crossed the river in ${minuteOf(x.tick)}`);
  }
  if (c.relic) clauses.push(`${names[c.relic.seat]} claimed the relic at ${clock(c.relic.tick)}`);
  for (const s of [0, 1] as const) if (c.slain[s] > 0) clauses.push(`${names[s]} lost ${words(c.slain[s])} to the other side's spears`);

  let ending: string;
  if (reason === "hall" && winner !== null) ending = `${names[winner]} took the hall at ${clock(ticks)}`;
  else if (reason === "forfeit" && c.forfeit) {
    ending =
      c.forfeit.why === "chose"
        ? `${names[c.forfeit.seat]} yielded the field to ${names[winner ?? 0]} at ${clock(ticks)}`
        : `${names[c.forfeit.seat]} left the field and ${names[winner ?? 0]} held it at ${clock(ticks)}`;
  } else if (reason === "time") ending = `the scroll ran out at ${clock(ticks)} with neither hall taken`;
  else ending = `both sides left the field and the match was abandoned at ${clock(ticks)}`;
  return clipChronicle(clauses, ending);
}

export function sealOwnChronicle(token: string, raw: Record<string, unknown>): Outcome {
  const id = raw.matchId;
  if (typeof id !== "number" || !Number.isInteger(id) || id < 1) return refuse(400, "malformed", "matchId must be a match's number.");
  const row = getMatchRow(id);
  if (!row) return refuse(404, "missing", "No such match.", { match: id });
  const seat = seatOfRow(row, token);
  if (seat === null) {
    return refuse(403, "not-yours", "Only the two players can seal a match's chronicle.", { match: id, owner: row.east, west: row.west ?? "-" });
  }
  if (row.ended_at === null || !row.chronicle) return refuse(409, "not-ended", "The match isn't over yet.", { match: id });
  const colophon = sealChronicle(id, seat, token, row.chronicle);
  if (colophon === undefined) return refuse(409, "sealed", "You have already sealed this chronicle.", { match: id });
  log("chronicle.seal", { who: markOf(token), match: id, colophon });
  publish({ type: "sealed", data: { id: colophon } });
  broadcastStatus();
  return { status: 201, body: { id: colophon } };
}

// ---- per-viewer streams ----

interface Viewer {
  res: ServerResponse;
  token: string;
  ip: string;
  seat: Seat | null;
  frames: number;
}

const viewers = new Set<Viewer>();
const perIp = new Map<string, number>();

// A view is several KiB, so write() returning false (past the 16 KiB
// high-water mark) is too twitchy; a reader is dropped once its unsent
// backlog passes this, and reconnects to a fresh full view.
const MAX_BACKLOG = 256 * 1024;

function write(v: Viewer, frame: string): void {
  if (!viewers.has(v)) return;
  v.res.write(frame);
  if (v.res.writableLength <= MAX_BACKLOG) return;
  viewers.delete(v);
  v.res.destroy();
}

function sendFrame(v: Viewer, event: string, data: unknown): void {
  v.frames++;
  write(v, `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

// A viewer's seat counts only while a match is being played or has just ended
// with their seat in it; anyone else gets status frames alone.
function resolveSeat(token: string): Seat | null {
  if (live) return live.status === "playing" ? seatOfLive(token) : null;
  return null;
}

function broadcastStatus(): void {
  for (const v of [...viewers]) {
    const before = v.seat;
    v.seat = resolveSeat(v.token);
    const status = statusFor(v.token, false);
    sendFrame(v, "status", status);
    if (v.seat !== null && before === null && live?.state) sendFrame(v, "view", viewFor(live.state, v.seat));
  }
}

export function openMatchStream(req: IncomingMessage, res: ServerResponse, token: string, ip: string, who: string): void {
  if (viewers.size >= MAX_STREAMS || (perIp.get(ip) ?? 0) >= MAX_STREAMS_PER_IP) {
    log("denied", { who, reason: "busy", route: "GET /match/events" });
    res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8", "Retry-After": "10" });
    res.end("too many open pages");
    return;
  }
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-store",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.write("retry: 2000\n\n");
  const v: Viewer = { res, token, ip, seat: resolveSeat(token), frames: 0 };
  viewers.add(v);
  perIp.set(ip, (perIp.get(ip) ?? 0) + 1);
  const status = statusFor(token, true);
  const { view, recentEvents: _recent, ...rest } = status;
  sendFrame(v, "status", { ...rest, view: null });
  if (view) sendFrame(v, "view", view);

  const openedAt = Date.now();
  log("stream.open", { who, route: "GET /match/events" });
  const heartbeat = setInterval(() => write(v, ": hb\n\n"), HEARTBEAT_MS);
  const lifetime = setTimeout(() => res.end(), MAX_STREAM_MS);
  let closed = false;
  const close = (): void => {
    if (closed) return;
    closed = true;
    clearInterval(heartbeat);
    clearTimeout(lifetime);
    viewers.delete(v);
    log("stream.close", { who, route: "GET /match/events", ms: Date.now() - openedAt, events: v.frames });
    const left = (perIp.get(ip) ?? 1) - 1;
    if (left > 0) perIp.set(ip, left);
    else perIp.delete(ip);
  };
  req.on("close", close);
  res.on("close", close);
}
