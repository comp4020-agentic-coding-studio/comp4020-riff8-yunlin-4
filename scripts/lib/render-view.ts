// Plain-text rendering of a SeatView, shared by scripts/play.ts and
// scripts/replay.ts. Pure: no I/O.

import { BUILDINGS } from "../../src/sim/balance.ts";
import type { Kind, SeatView, SimEvent, VisibleEntity } from "../../src/sim/types.ts";

const SEAT_NAMES = ["east", "west"];
const IN_VIEW: Record<string, string> = { p: ".", r: "~", f: "=", g: "T", h: "^", l: '"', x: "X" };
const REMEMBERED: Record<string, string> = { p: ",", r: "-", f: ":", g: "t", h: "'", l: "`", x: "x" };
const OWN: Record<Kind, string> = {
  labourer: "L", spearman: "S", hall: "H", barracks: "B", nian: "N", jiaolong: "J", qilin: "Q", pixiu: "P",
};

export const LEGEND =
  "legend: ' ' unseen · in view/remembered: plain .,  river ~-  ford =:  grove Tt  hill ^'  glade \"`  relic Xx · " +
  "yours L S H B · enemy l s h b · creatures N nian J jiaolong Q qilin P pixiu";

export function seatName(seat: number): string {
  return SEAT_NAMES[seat] ?? String(seat);
}

export function clock(tick: number): string {
  const s = Math.floor(tick / 4);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function glyph(e: VisibleEntity, seat: number): string {
  const c = OWN[e.kind];
  if (e.side === "wild" || e.kind === "nian" || e.kind === "jiaolong" || e.kind === "qilin" || e.kind === "pixiu") return c;
  return e.side === seat ? c : c.toLowerCase();
}

export function renderMap(view: SeatView, around?: number): string[] {
  const { width, height } = view;
  const grid: string[][] = [];
  for (let y = 0; y < height; y++) {
    const row: string[] = [];
    for (let x = 0; x < width; x++) {
      const ch = view.ground.charAt(y * width + x);
      row.push(ch === " " ? " " : ch === ch.toUpperCase() ? (IN_VIEW[ch.toLowerCase()] ?? "?") : (REMEMBERED[ch] ?? "?"));
    }
    grid.push(row);
  }
  for (const e of view.entities) {
    const g = glyph(e, view.seat);
    const size = e.kind === "hall" || e.kind === "barracks" ? BUILDINGS[e.kind].size : 1;
    for (let dy = 0; dy < size; dy++)
      for (let dx = 0; dx < size; dx++) if (grid[e.y + dy]?.[e.x + dx] !== undefined) grid[e.y + dy][e.x + dx] = g;
  }
  let x0 = 0;
  let x1 = width;
  if (around !== undefined) {
    x0 = Math.max(0, Math.min(width - 60, Math.round(around) - 30));
    x1 = Math.min(width, x0 + 60);
  }
  // ruler: a digit row of tens, then units
  const pad = "    ";
  let tens = "";
  let marks = "";
  for (let x = x0; x < x1; x++) {
    tens += x % 10 === 0 ? String(Math.floor(x / 10) % 10) : " ";
    marks += x % 10 === 0 ? "|" : " ";
  }
  const out = [`${pad}${tens}  (x: tens digit; | marks x=0,10,20..; first column is x=${x0})`, `${pad}${marks}`];
  for (let y = 0; y < height; y++) out.push(`${String(y).padStart(3)} ${grid[y].slice(x0, x1).join("").replace(/\s+$/, "")}`);
  return out;
}

function ids(es: VisibleEntity[]): string {
  return es.map((e) => `${e.id}(${e.x},${e.y})${e.hp < e.maxHp ? ` hp${e.hp}` : ""}`).join(" ");
}

export function renderView(view: SeatView, opts: { around?: number } = {}): string[] {
  const out: string[] = [];
  out.push(
    `tick ${view.tick} (${clock(view.tick)}) · grain ${view.grain} · pop ${view.pop}/${view.popCap} · you: ${seatName(view.seat)} (seat ${view.seat})`,
  );
  out.push(...renderMap(view, opts.around), LEGEND);
  const own = view.entities.filter((e) => e.side === view.seat);
  const lab = own.filter((e) => e.kind === "labourer");
  const spr = own.filter((e) => e.kind === "spearman");
  const group = (name: string, es: VisibleEntity[]) => {
    if (es.length === 0) return;
    const tasks = new Map<string, VisibleEntity[]>();
    for (const e of es) tasks.set(e.task, [...(tasks.get(e.task) ?? []), e]);
    out.push(`${name}: ${[...tasks].map(([t, l]) => `${l.length} ${t} [${ids(l)}]`).join(" · ")}`);
  };
  group("labourers", lab);
  group("spearmen", spr);
  for (const b of own.filter((e) => e.kind === "hall" || e.kind === "barracks")) {
    const state =
      b.progress === undefined ? "idle" : b.task === "training" ? `training ${b.progress}%` : `${b.task} ${b.progress}%`;
    out.push(`${b.kind} ${b.id} at (${b.x},${b.y}) ${b.hp}/${b.maxHp}hp: ${state}`);
  }
  const others = view.entities.filter((e) => e.side !== view.seat);
  if (others.length) {
    out.push("in view, not yours:");
    for (const e of others) {
      const who = e.side === "wild" ? "creature" : "enemy";
      out.push(`  ${who} ${e.kind} ${e.id} at (${e.x},${e.y}) ${e.hp}/${e.maxHp}hp ${e.task}`);
    }
  }
  if (view.groves.length) out.push(`groves in view: ${view.groves.map(([x, y, g]) => `(${x},${y}) ${g}`).join(" ")}`);
  out.push(`relic: ${view.relicClaimed ? "claimed" : "unclaimed"}`);
  return out;
}

// What changed between two views, in plain words (the status API carries no events).
export interface Snapshot {
  tick: number;
  grain: number;
  own: Record<number, string>; // id -> kind
  done: number[]; // own completed building ids
  seen: Record<number, string>; // visible non-own ids -> "enemy spearman" etc.
  bhp?: Record<number, { kind: string; hp: number; maxHp: number }>;
}

export function snapshot(v: SeatView): Snapshot {
  const s: Snapshot = { tick: v.tick, grain: v.grain, own: {}, done: [], seen: {} };
  for (const e of v.entities) {
    if (e.side === v.seat) {
      s.own[e.id] = e.kind;
      if ((e.kind === "hall" || e.kind === "barracks") && e.progress === undefined) s.done.push(e.id);
      else if ((e.kind === "hall" || e.kind === "barracks") && e.task !== "building" && e.task !== "training") s.done.push(e.id);
    } else s.seen[e.id] = `${e.side === "wild" ? "creature" : "enemy"} ${e.kind}`;
  }
  return s;
}

export function diffSnapshots(a: Snapshot, b: Snapshot): string[] {
  const out: string[] = [];
  for (const [id, k] of Object.entries(b.seen)) if (!(id in a.seen)) out.push(`${k} ${id} came into view`);
  for (const [id, k] of Object.entries(a.seen)) if (!(id in b.seen)) out.push(`${k} ${id} left view`);
  if (b.grain !== a.grain) out.push(`grain ${b.grain > a.grain ? "+" : ""}${b.grain - a.grain} (now ${b.grain})`);
  return out;
}

// ---- events in plain words (from status.recentEvents) ----

const CREATURE_NAMES: Record<string, string> = { nian: "年 nian", jiaolong: "蛟龍 jiaolong", qilin: "麒麟 qilin", pixiu: "貔貅 pixiu" };
const kindName = (k: string) => CREATURE_NAMES[k] ?? k;

export function describeEvent(ev: SimEvent, me: number): string | null {
  const t = `t${ev.tick}`;
  switch (ev.type) {
    case "unit.died": {
      const where = `at (${ev.x},${ev.y})`;
      if (ev.side === "wild") return `${t} the ${kindName(ev.kind)} was killed by ${ev.bySide === me ? "your" : "enemy"} ${ev.byKind}s ${where}`;
      const mine = ev.side === me;
      const owner = mine ? "your" : "enemy";
      if (ev.cause === "creature") return `${t} ${owner} ${ev.kind} ${ev.unit} was killed by the ${kindName(ev.byKind)} ${where}`;
      return mine
        ? `${t} your ${ev.kind} ${ev.unit} fell to enemy ${ev.byKind}s ${where}`
        : `${t} enemy ${ev.kind} ${ev.unit} was killed by your ${ev.byKind}s ${where}`;
    }
    case "creature.aggro":
      return `${t} the ${kindName(ev.kind)} turned on ${ev.targetSeat === me ? "your" : "an enemy"} ${ev.target === undefined ? "unit" : `unit ${ev.target}`}`;
    case "build.start": return ev.seat === me ? `${t} ${ev.kind} ${ev.building} begun at (${ev.x},${ev.y})` : null;
    case "build.done": return ev.seat === me ? `${t} ${ev.kind} ${ev.building} finished` : `${t} the enemy finished a ${ev.kind}`;
    case "unit.trained": return ev.seat === me ? `${t} new ${ev.kind} ${ev.unit}` : null;
    case "relic.claimed": return ev.seat === me ? `${t} relic claimed: +${ev.grain} grain` : `${t} the enemy claimed the relic`;
    case "match.end": return `${t} ${ev.winner === me ? "the enemy hall fell: you won" : "your hall fell"}`;
    default: return null;
  }
}

// Hp of own hall/barracks, for under-attack warnings.
export function ownBuildingHp(v: SeatView): Record<number, { kind: string; hp: number; maxHp: number }> {
  const o: Record<number, { kind: string; hp: number; maxHp: number }> = {};
  for (const e of v.entities) if (e.side === v.seat && (e.kind === "hall" || e.kind === "barracks")) o[e.id] = { kind: e.kind, hp: e.hp, maxHp: e.maxHp };
  return o;
}
