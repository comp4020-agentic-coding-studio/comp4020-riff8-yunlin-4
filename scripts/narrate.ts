// Crit narrator: read a match from the server's logs alone.
//
//   flyctl logs -a <app> | node scripts/narrate.ts [--quiet]
//
// Each JSON log line (src/log.ts; Fly's `<time> app[id] region [info]` prefix
// is skipped by parsing from the first `{`) becomes one plain sentence:
// `HH:MM:SS <sentence>`. The time is the time part of the line's `ts`, in UTC.
// Lines that are not JSON objects pass through unchanged. Never throws.
//
// People are named by mark (`who`), "the bot", or "someone new". Seats 0/1 are
// east/west; a match.start line teaches the narrator who sits where, per match.
//
// Flags:
//   --quiet, -q   hide request, stream.open/close and visitor.new lines
//   --help, -h    this text
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

export interface NarrateMemory {
  matches: Map<string, { east?: string; west?: string }>;
}
export interface NarrateOptions {
  quiet?: boolean;
}

export function newMemory(): NarrateMemory {
  return { matches: new Map() };
}

const CAP = 80;
const SEATS = ["east", "west"];
const CREATURES: Record<string, string> = { nian: "年 nian", jiaolong: "蛟龍 jiaolong", qilin: "麒麟 qilin", pixiu: "貔貅 pixiu" };
const QUIET = new Set(["request", "stream.open", "stream.close", "visitor.new"]);
const DENIED: Record<string, string> = {
  rate: "sent commands too fast: refused",
  "match-full": "tried to join a match that is already full: refused",
  "match-busy": "tried to start a match while one is on: refused",
  "no-match": "asked for a match when there is none: refused",
  "already-seated": "tried to take a second seat: refused",
  "not-seated": "acted without a seat in the match: refused",
  malformed: "sent a malformed request: refused",
  "too-many": "sent too many at once: refused",
  invalid: "sent an invalid command: refused",
  grain: "couldn't afford it: refused",
  "pop-cap": "was at the population cap: refused",
  large: "sent something too large: refused",
  sealed: "tried to seal something already sealed: refused",
  "not-ended": "asked for a chronicle before the match ended: refused",
  missing: "asked for something that isn't there: refused",
  "no-seal": "arrived without a seal: refused",
  busy: "tried to open another draft while one was open: refused",
  long: "wrote too long a colophon: refused",
  empty: "tried to seal an empty colophon: refused",
  full: "tried to add to a full draft: refused",
  abandoned: "tried to use an abandoned draft: refused",
};

function str(v: unknown): string | undefined {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return undefined;
}
function tidy(v: unknown): string {
  let s = str(v);
  if (s === undefined) {
    try {
      s = JSON.stringify(v) ?? "";
    } catch {
      s = "?";
    }
  }
  s = s.replace(/[\r\n\u2028\u2029]+/g, " ").replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "");
  return s.length > CAP ? `${s.slice(0, CAP)}…` : s;
}
function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}
function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function narrateLine(line: string, memory: NarrateMemory, opts: NarrateOptions = {}): string | null {
  try {
    return narrate(line, memory, opts);
  } catch {
    return line;
  }
}

function narrate(line: string, memory: NarrateMemory, opts: NarrateOptions): string | null {
  const start = line.indexOf("{");
  if (start < 0 || line.length > 1_000_000) return line;
  let obj: unknown;
  try {
    obj = JSON.parse(line.slice(start));
  } catch {
    return line;
  }
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) return line;
  const e = obj as Record<string, unknown>;
  const event = typeof e.event === "string" ? e.event : undefined;
  if (event === undefined) return line;
  if (opts.quiet && QUIET.has(event)) return null;

  const time = typeof e.ts === "string" ? (/T(\d\d:\d\d:\d\d)/.exec(e.ts)?.[1] ?? "--:--:--") : "--:--:--";
  return `${time} ${sentence(event, e, memory)}`;
}

function sentence(event: string, e: Record<string, unknown>, memory: NarrateMemory): string {
  const matchKey = e.match === undefined ? undefined : tidy(e.match);
  const seats = matchKey === undefined ? undefined : memory.matches.get(matchKey);
  const markOf = (m: unknown): string => {
    if (m === "bot") return "the bot";
    const s = str(m);
    return s === undefined || s === "" || s === "-" ? "someone new" : tidy(s);
  };
  const seatName = (s: unknown): string | undefined => {
    const n = num(s);
    return n === 0 || n === 1 ? SEATS[n] : undefined;
  };
  // Person at a seat: "mark (east)" when known, else "the east player".
  const atSeat = (s: unknown): string => {
    const name = seatName(s);
    if (name === undefined) return "someone";
    const m = seats?.[name as "east" | "west"];
    return m === undefined ? `the ${name} player` : `${markOf(m)} (${name})`;
  };
  // The actor: `who` plus a seat annotation when we know it.
  const actor = (): string => {
    const who = markOf(e.who);
    const name = seatName(e.seat);
    return name !== undefined && who !== "someone new" ? `${who} (${name})` : name !== undefined ? atSeat(e.seat) : who;
  };
  const who = markOf(e.who);
  const kind = (k: unknown): string => (str(k) === undefined ? "piece" : tidy(k));
  const creature = (k: unknown): string => CREATURES[str(k) ?? ""] ?? (str(k) === undefined ? "creature" : tidy(k));

  switch (event) {
    case "request": {
      const route = tidy(e.route);
      if (route === "GET /") return `${who} opened the scroll`;
      if (route === "GET /match") return `${who} opened the match page`;
      const ms = num(e.ms);
      return `${who} ${route} → ${tidy(e.status)}${ms === undefined ? "" : ` (${ms} ms)`}`;
    }
    case "visitor.new":
      return `a new visitor arrived, sealed ${who}`;
    case "draft.open":
      return `${who} opened draft ${tidy(e.id)}`;
    case "draft.strokes":
      return `${who} brushed ${plural(num(e.count) ?? 0, "stroke")} on draft ${tidy(e.id)}`;
    case "colophon.seal":
      return `${who} sealed colophon ${tidy(e.id)} (${e.kind === undefined ? "unknown kind" : tidy(e.kind)})`;
    case "colophon.typed":
      return `${who} typed colophon ${tidy(e.id)}`;
    case "draft.abandon":
      return e.by === "timeout"
        ? `draft ${tidy(e.id)} timed out${e.owner === undefined ? "" : ` (${markOf(e.owner)}'s)`}`
        : `${who} abandoned draft ${tidy(e.id)}`;
    case "stream.open":
      return `${who} opened the live stream${e.replayed === undefined ? "" : ` (replayed ${tidy(e.replayed)})`}`;
    case "stream.close":
      return `${who} closed the live stream after ${tidy(e.ms)} ms (${tidy(e.events)} events)`;
    case "server.start":
      return `the server started${e.msg === undefined ? "" : `: ${tidy(e.msg)}`}`;
    case "error":
      return `the server hit an error on ${tidy(e.route)}: ${tidy(e.message)}`;
    case "log.dropped":
      return `the log dropped ${tidy(e.count)} lines under load`;
    case "log.file-error":
      return `the log file failed (${tidy(e.code)}); file logging paused`;
    case "denied": {
      const reason = str(e.reason) ?? "unknown";
      const owner = e.owner === undefined ? undefined : markOf(e.owner);
      if (reason === "not-yours") {
        const route = str(e.route) ?? "";
        const what = route.includes("command") ? "a unit" : route.includes("chronicle") ? "a chronicle" : "something";
        return `${who} tried to ${route.includes("command") ? "command" : "touch"} ${what} that is not theirs${owner ? ` (it is ${owner}'s)` : ""}: refused`;
      }
      const text = DENIED[reason];
      const base = text ? `${who} ${text}` : `${who} was refused (${tidy(reason)})`;
      return owner ? `${base} [${owner}'s]` : base;
    }

    case "match.create":
      return `${who} created a match and took the east seat`;
    case "match.join":
      return `${who} joined the match and took the west seat`;
    case "match.bot":
      return `${who} called in the bot to take the west seat`;
    case "match.start": {
      const east = e.east === undefined ? undefined : tidy(e.east);
      const west = e.west === undefined ? undefined : tidy(e.west);
      if (matchKey !== undefined) memory.matches.set(matchKey, { east, west });
      return `match ${matchKey ?? "?"} began: ${markOf(east)} in the east against ${markOf(west)} in the west`;
    }
    case "command": {
      const n = num(e.n) ?? 1;
      const units = num(e.units);
      const type = str(e.type) ?? "";
      const verb: Record<string, string> = {
        move: "move",
        attack: "attack",
        gather: "gather",
        stop: "stop",
        build: "build a barracks",
        train: "train a labourer",
      };
      const noun: Record<string, string> = { move: "move orders", attack: "attack orders", gather: "gather orders", stop: "stop orders" };
      if (n > 1) {
        const label = noun[type] ?? `${type === "build" ? "build" : type === "train" ? "train" : tidy(type)} orders`;
        return `${actor()} gave ${n} ${label}${units === undefined ? "" : ` to ${units} units`}`;
      }
      const what = verb[type] ?? (type === "" ? "do something" : tidy(type));
      const target = units === undefined || units === 0 ? "" : `${units} ${units === 1 ? "unit" : "units"} `;
      if (type === "build" || type === "train") return `${actor()} ordered ${type === "build" ? "a barracks built" : "a labourer trained"}${units ? ` (${units} units)` : ""}`;
      return `${actor()} ordered ${target}${target ? "to " : "to "}${what}`.replace("ordered to", "ordered");
    }
    case "build.start":
      return `${actor()} began building a ${kind(e.kind)}`;
    case "build.done":
      return `${actor()} finished building a ${kind(e.kind)}`;
    case "unit.trained":
      return `${actor()} trained a ${kind(e.kind)}`;
    case "creature.aggro":
      return `the ${creature(e.creature)} turned on ${markOf(e.owner)}'s unit ${tidy(e.target)}`.replace("'s unit", `'s ${e.kind ? kind(e.kind) : "unit"}`);
    case "unit.died": {
      const count = num(e.count) ?? 1;
      const owner = e.owner === undefined ? atSeat(e.seat) : markOf(e.owner);
      const what = count > 1 ? `${count} of ${owner}'s ${kind(e.kind)}s` : `${owner}'s ${kind(e.kind)}`;
      if (e.cause === "creature") {
        return count > 1
          ? `a ${creature(e.by)} took ${count} of ${owner}'s ${kind(e.kind)}s`
          : `a ${creature(e.by)} took ${owner}'s ${kind(e.kind)}`;
      }
      return `${what} fell to ${atSeat(e.bySeat)}'s ${kind(e.by)}`;
    }
    case "relic.claimed":
      return `${actor()} claimed a relic${num(e.grain) === undefined ? "" : ` worth ${num(e.grain)} grain`}`;
    case "match.forfeit":
      return `${actor()} ${e.why === "idle" ? "went idle and forfeited" : e.why === "chose" ? "chose to forfeit" : "forfeited"}`;
    case "match.end": {
      const ticks = num(e.ticks);
      let dur = "";
      if (ticks !== undefined) {
        const secs = Math.floor(ticks / 4);
        dur = ` after ${Math.floor(secs / 60)}m ${secs % 60}s (${ticks} ticks at 4 a second)`;
      }
      const reason = str(e.reason) ?? "";
      const wseat = seatName(e.winnerSeat);
      let result: string;
      if (e.winner === null || e.winner === undefined) result = "no winner";
      else {
        const by: Record<string, string> = {
          hall: "by taking the hall",
          forfeit: "by forfeit",
          abandoned: "because the other side abandoned it",
          restart: "when the server restarted",
          time: "on time",
        };
        result = `${markOf(e.winner)}${wseat ? ` (${wseat})` : ""} won ${by[reason] ?? `(${tidy(reason)})`}`;
      }
      if (e.winner === null || e.winner === undefined) result += reason ? ` (${tidy(reason)})` : "";
      return `match ${matchKey ?? "?"} ended${dur}: ${result}`;
    }
    case "chronicle.seal":
      return `the chronicle of match ${matchKey ?? "?"} was sealed as colophon ${tidy(e.colophon)}`;
    default: {
      const rest = Object.entries(e)
        .filter(([k, v]) => k !== "ts" && k !== "event" && k !== "who" && (typeof v === "string" || typeof v === "number" || typeof v === "boolean" || v === null))
        .slice(0, 8)
        .map(([k, v]) => `${tidy(k)}=${tidy(v)}`);
      return [who, tidy(event), ...rest].join(" ");
    }
  }
}

const HELP = `usage: flyctl logs -a <app> | node scripts/narrate.ts [--quiet]
  --quiet, -q   hide request, stream.open/close and visitor.new lines
  --help, -h    show this text
Times are the time part of each line's ts (UTC). Non-JSON lines pass through.`;

function main(): void {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    return;
  }
  const quiet = args.includes("--quiet") || args.includes("-q");
  const memory = newMemory();
  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
  rl.on("line", (line) => {
    const out = narrateLine(line, memory, { quiet });
    if (out !== null) process.stdout.write(`${out.replace(/[\r\n]+/g, " ")}\n`);
  });
  process.stdout.on("error", () => process.exit(0));
}

const direct = (import.meta as { main?: boolean }).main ?? process.argv[1] === fileURLToPath(import.meta.url);
if (direct) main();
