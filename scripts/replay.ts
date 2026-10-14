// Rebuild a 山海 match from its command log and print the board.
//   node scripts/replay.ts --db data.db --match 3 [--tick N] [--seat 0|1|all]
//   node scripts/replay.ts --commands repro.json --map scroll-1 --seed 1 [--tick N] [--seat ..]
// A command stamped `tick` is applied by the step that makes the state tick `tick`
// (the same number play.ts prints as "accepted for tick N").

import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { createMatch, step, summary, viewFor, type Command, type Seat } from "../src/sim/index.ts";
import { renderView } from "./lib/render-view.ts";

const argv = process.argv.slice(2);
const opt = (n: string): string | undefined => {
  const i = argv.indexOf(`--${n}`);
  return i < 0 ? undefined : argv[i + 1];
};
const die = (m: string): never => { console.error(m); process.exit(1); };

interface Cmd { tick: number; seat: Seat; command: Command }
let mapId = opt("map") ?? "scroll-1";
let seed = Number(opt("seed") ?? 1);
let cmds: Cmd[];
let endTicks: number | null = null;

const file = opt("commands");
if (file) {
  cmds = JSON.parse(readFileSync(file, "utf8"));
} else {
  const dbPath = opt("db");
  const id = Number(opt("match"));
  if (!dbPath || !Number.isInteger(id)) die("usage: replay.ts --db <path> --match <id> [--tick N] [--seat 0|1|all]  |  --commands <file> --map <id> --seed <n>");
  const db = new DatabaseSync(dbPath!, { readOnly: true });
  const row = db.prepare("SELECT map_id, seed, ticks FROM matches WHERE id = ?").get(id) as any;
  if (!row) die(`no match ${id} in ${dbPath}`);
  mapId = row.map_id; seed = row.seed; endTicks = row.ticks;
  cmds = (db.prepare("SELECT tick, seat, command FROM match_commands WHERE match_id = ? ORDER BY tick, rowid").all(id) as any[]).map(
    (r) => ({ tick: r.tick, seat: r.seat, command: JSON.parse(r.command) }),
  );
}

const last = cmds.reduce((m, c) => Math.max(m, c.tick), 0);
const target = opt("tick") !== undefined ? Number(opt("tick")) : (endTicks ?? last);
const state = createMatch(mapId, seed);
while (state.tick < target && state.winner === null) {
  const t = state.tick + 1;
  step(state, cmds.filter((c) => c.tick === t).map((c) => ({ seat: c.seat, command: c.command })));
}

console.log(`replay of ${mapId} seed ${seed}: ${cmds.length} commands, now at tick ${state.tick}${state.winner !== null ? `, seat ${state.winner} has won` : ""}`);
for (const s of [0, 1] as Seat[]) {
  const sm = summary(state, s);
  console.log(`seat ${s}: grain ${sm.grain} pop ${sm.pop} ${JSON.stringify(sm.units)}`);
}
const seatOpt = opt("seat") ?? "0";
const around = opt("around");
for (const s of seatOpt === "all" ? [0, 1] : [Number(seatOpt)]) {
  console.log("");
  console.log(renderView(viewFor(state, s as Seat), { around: around === undefined ? undefined : Number(around) }).join("\n"));
}
