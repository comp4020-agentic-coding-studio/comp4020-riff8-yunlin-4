// A playtester's text client for 山海: one shell command per action, stateless
// except a small state file. `node scripts/play.ts help` for usage.

import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RULES_TEXT } from "../src/rules-text.ts";
import type { Command, SeatView } from "../src/sim/types.ts";
import { attackWarnings, describeEvent, diffSnapshots, headings as headingsOf, sightings, ownBuildingHp, renderView, seatName, snapshot, type Snapshot } from "./lib/render-view.ts";

const argv = process.argv.slice(2);
function flag(name: string): string | undefined {
  const i = argv.indexOf(`--${name}`);
  if (i < 0) return undefined;
  const v = argv[i + 1];
  argv.splice(i, 2);
  return v;
}
const server = (flag("server") ?? process.env.PLAY_SERVER ?? "http://localhost:3000").replace(/\/$/, "");
const as = (flag("as") ?? "a").replace(/[^\w-]/g, "_");
const around = flag("around");
const [sub = "look", ...args] = argv;
const port = new URL(server).port || "80";
const stateFile = join(process.env.TMPDIR ?? "/tmp", `shanhai-play-${as}-${port}.json`);

interface Saved { cookie?: string; snap?: Snapshot; matchId?: number | null; seed?: number; lastTick?: number; bhp?: Record<number, { kind: string; hp: number; maxHp: number }> }
let saved: Saved = {};
try { saved = JSON.parse(readFileSync(stateFile, "utf8")); } catch { /* first call */ }
const save = () => writeFileSync(stateFile, JSON.stringify(saved));

function die(msg: string): never {
  console.error(msg);
  process.exit(1);
}

async function call(method: "GET" | "POST", path: string, body?: unknown): Promise<{ code: number; json: any }> {
  let res: Response;
  try {
    res = await fetch(server + path, {
      method,
      headers: { ...(saved.cookie ? { Cookie: `seal=${saved.cookie}` } : {}), ...(method === "POST" ? { "Content-Type": "application/json" } : {}) },
      body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
    });
  } catch (e) {
    die(`could not reach ${server}: ${(e as Error).cause ? String((e as any).cause.code ?? (e as any).cause.message) : (e as Error).message}`);
  }
  const m = /(?:^|,\s*)seal=([^;,\s]+)/.exec(res.headers.get("set-cookie") ?? "");
  if (m) { saved.cookie = m[1]; save(); }
  let json: any = null;
  try { json = await res.json(); } catch { /* non-JSON */ }
  return { code: res.status, json };
}

async function status(): Promise<any> {
  let r = await call("GET", "/api/match");
  if (r.code !== 200) die(`server answered ${r.code} to GET /api/match`);
  return r.json;
}

function say(s: any): string[] {
  const out: string[] = [];
  const seats = s.you === null ? "you hold no seat" : `you are ${seatName(s.you)} (seat ${s.you})`;
  const open = (s.seatsOpen ?? []).length ? `; seat ${s.seatsOpen.join(",")} open (type: join, or: bot)` : "";
  out.push(`match: ${s.status}${s.matchId ? ` #${s.matchId} on ${s.mapId}${s.seed !== undefined ? ` · seed ${s.seed}` : ""}` : ""} · ${seats}${open}${s.manualTicks ? " · manual ticks (use: step N)" : ""}`);
  if (s.result) {
    const r = s.result;
    const how = r.reason === "yielded" ? "yielded to another visitor after ten minutes against the bot" : r.reason === "lapsed" ? "lapsed: nobody took the second seat" : `by ${r.reason} after ${r.ticks} ticks`;
    out.push(`result: ${r.winner === null ? "no winner" : `${seatName(r.winner)} won`} ${how} · you ${r.youWon ? "won" : "did not win"}`);
    out.push(`chronicle${r.chronicleSealed ? " (sealed)" : " (not yet sealed; seal-chronicle)"}:`, r.chronicle);
  }
  return out;
}

function printRefusal(r: { code: number; json: any }): void {
  console.log(`refused (${r.code} ${r.json?.error ?? ""}): ${r.json?.message ?? "no reason given"}`);
}

async function look(s?: any, quiet = false): Promise<void> {
  s ??= await status();
  const v: SeatView | null = s.view;
  if (!v) { console.log(say(s).join("\n")); return; }
  const same = saved.matchId === s.matchId && saved.seed === s.seed;
  const prev = same && saved.snap && saved.snap.tick <= v.tick ? saved.snap : undefined;
  const heads = headingsOf(prev, v);
  const out = renderView(v, { around: around === undefined ? undefined : Number(around), headings: heads });
  const idle = v.entities.filter((e) => e.side === v.seat && e.kind === "labourer" && e.task === "idle").length;
  out[0] += `${idle > 0 ? ` · ${idle} idle labourer${idle === 1 ? "" : "s"}` : ""} · match ${s.matchId} · ${s.mapId} · seed ${s.seed}`;
  const now = snapshot(v);
  const bhp = ownBuildingHp(v);
  const warn: string[] = [];
  for (const [id, b] of Object.entries(bhp)) {
    const was = same ? saved.bhp?.[Number(id)] : undefined;
    if (was && b.hp < was.hp) warn.push(`YOUR ${b.kind.toUpperCase()} ${id} IS UNDER ATTACK: ${b.hp}/${b.maxHp} (−${was.hp - b.hp})`);
  }
  const lastTick = same && saved.snap && saved.snap.tick <= v.tick ? (saved.lastTick ?? -1) : -1;
  const evs: any[] = (s.recentEvents ?? []).filter((e: any) => e.tick > lastTick);
  warn.push(...attackWarnings(prev, now, evs, v.seat), ...sightings(prev, v, evs));
  // A unit that vanished without a death event in the log (older than the
  // server's recent-event window) is still reported, from the snapshot diff.
  const told = new Set(evs.filter((e) => e.type === "unit.died").map((e) => e.unit));
  const gone = Object.entries(prev?.ownUnits ?? {}).filter(([id]) => !(id in (now.ownUnits ?? {})) && !told.has(Number(id)));
  out.push(...warn);
  out.push("events since your last look:");
  const lines = evs.map((e) => describeEvent(e, v.seat)).filter((x): x is string => x !== null);
  const d = prev ? diffSnapshots(prev, now) : [];
  const lost = gone.map(([id, u]) => `your ${u.kind} ${id} is gone (last seen at (${u.x},${u.y}); the server's event window no longer holds why)`);
  const all = [...lines, ...lost, ...d];
  out.push(...(all.length ? all.map((x) => `  ${x}`) : [prev ? "  nothing new" : "  (first look)"]));
  const maxTick = Math.max(lastTick, ...evs.map((e) => e.tick));
  saved.lastTick = maxTick;
  saved.bhp = bhp;
  if (s.status === "ended") out.push(...say(s));
  saved.snap = now; saved.matchId = s.matchId; saved.seed = s.seed; save();
  if (!quiet) console.log(out.join("\n"));
}

function resolveIds(token: string, v: SeatView | null): number[] {
  const own = (v?.entities ?? []).filter((e) => e.side === v!.seat);
  const pick = (f: (e: (typeof own)[0]) => boolean) => own.filter(f).map((e) => e.id);
  let ids: number[];
  if (token === "all-labourers") ids = pick((e) => e.kind === "labourer");
  else if (token === "all-spearmen") ids = pick((e) => e.kind === "spearman");
  else if (token === "idle-labourers") ids = pick((e) => e.kind === "labourer" && e.task === "idle");
  else if (token === "all-units") ids = pick((e) => e.kind === "labourer" || e.kind === "spearman");
  else ids = token.split(",").map((x) => Number(x));
  if (ids.length === 0 || ids.some((n) => !Number.isInteger(n))) die(`no units for "${token}"; selectors: ${SELECTORS}`);
  return ids;
}

const SELECTORS = "4,5,6 | all-labourers | all-spearmen | idle-labourers | all-units";

const num = (s: string | undefined, what: string): number => {
  const n = Number(s);
  if (s === undefined || !Number.isInteger(n)) die(`${what} must be a whole number, got "${s}"`);
  return n;
};

async function order(): Promise<void> {
  const s = await status();
  const [a, b, c, d, e] = args;
  let cmd: Command;
  switch (sub) {
    case "move": case "gather":
      cmd = { type: sub, units: resolveIds(a, s.view), x: num(b, "x"), y: num(c, "y") }; break;
    case "build":
      if (b !== "barracks") die("build <ids> barracks <x> <y>");
      cmd = { type: "build", units: resolveIds(a, s.view), building: "barracks", x: num(c, "x"), y: num(d, "y") }; break;
    case "attack":
      cmd = { type: "attack", units: resolveIds(a, s.view), target: num(b, "target") }; break;
    case "train":
      if (b !== "labourer" && b !== "spearman") die("train <buildingId> labourer|spearman");
      cmd = { type: "train", building: num(a, "buildingId"), unit: b }; break;
    default:
      cmd = { type: "stop", units: resolveIds(a, s.view) };
  }
  void e;
  const r = await call("POST", "/api/match/command", cmd);
  if (r.code === 202) console.log(`accepted for tick ${r.json.tick}  ${JSON.stringify(cmd)}`);
  else printRefusal(r);
}

async function main(): Promise<void> {
  switch (sub) {
    case "help":
      console.log(RULES_TEXT + "\n\n" + HELP);
      return;
    case "status": console.log(say(await status()).join("\n")); return;
    case "look": await look(); return;
    case "new": case "join": case "bot": case "forfeit": {
      await status(); // ensures a seal cookie
      const r = await call("POST", sub === "new" ? "/api/match" : `/api/match/${sub}`, {});
      if (r.code >= 400) printRefusal(r); else console.log(say(r.json).join("\n"));
      return;
    }
    case "seal-chronicle": {
      const s = await status();
      if (!s.matchId) die("no match to seal");
      const r = await call("POST", "/api/match/chronicle", { matchId: s.matchId });
      if (r.code === 201) console.log(`sealed as colophon ${r.json.id}`); else printRefusal(r);
      return;
    }
    case "step": {
      await status();
      const r = await call("POST", "/api/match/step", { ticks: args[0] === undefined ? 1 : num(args[0], "ticks") });
      if (r.code >= 400) { printRefusal(r); return; }
      await look(r.json);
      return;
    }
    case "move": case "gather": case "build": case "attack": case "train": case "stop":
      await order(); return;
    default:
      die(`unknown command "${sub}"; try: help`);
  }
}

const HELP = `play.ts commands (node scripts/play.ts [--server URL] [--as NAME] [--around X] <command>):
  status | look                      the board as you may see it, plus what changed since your last look
  new | join | bot | forfeit         start a match (seat 0), take seat 1, fill seat 1 with the bot, give up
  step N                             (manual-tick servers) advance N ticks, then look
  move <ids> <x> <y>                 gather <ids> <x> <y>        build <ids> barracks <x> <y>
  attack <ids> <targetId>            train <buildingId> labourer|spearman        stop <ids>
  <ids>: 4,5,6 | all-labourers | all-spearmen | idle-labourers | all-units
  seal-chronicle                     seal an ended match's chronicle as your colophon
  --around X shows a 60-column window centred on column X. Orders print the tick they apply at.`;

main().catch((e) => die(`error: ${(e as Error).message}`));
