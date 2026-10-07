import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

// /data is the one thing that survives a restart or redeploy (fly.toml mounts
// a volume there). Locally and in CI (which mounts a throwaway /data of its
// own, per checks.yml) it exists too; only a bare local checkout falls back
// to a repo-relative path.
const DB_PATH = process.env.DB_PATH ?? (existsSync("/data") ? "/data/colophon.db" : "./data/colophon.db");
mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS colophons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )
`);

// Crit 9 adds drafts and drawings. Existing rows are typed colophons that were
// sealed the moment they were written, so the new columns default to exactly
// that and no old row is rewritten. body stays NOT NULL: a drawing with no
// typed line stores "".
const columns = new Set((db.prepare("PRAGMA table_info(colophons)").all() as { name: string }[]).map((c) => c.name));
if (!columns.has("state")) db.exec("ALTER TABLE colophons ADD COLUMN state TEXT NOT NULL DEFAULT 'sealed'");
if (!columns.has("sealed_at")) db.exec("ALTER TABLE colophons ADD COLUMN sealed_at INTEGER");
if (!columns.has("last_activity")) db.exec("ALTER TABLE colophons ADD COLUMN last_activity INTEGER");

db.exec(`
  CREATE TABLE IF NOT EXISTS strokes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    colophon_id INTEGER NOT NULL REFERENCES colophons(id),
    v INTEGER NOT NULL,
    points TEXT NOT NULL,
    t INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS strokes_by_colophon ON strokes (colophon_id, id);
  CREATE INDEX IF NOT EXISTS colophons_by_state ON colophons (state, token);
`);

export type State = "drafting" | "sealed" | "abandoned";

export interface Colophon {
  id: number;
  token: string;
  body: string;
  created_at: number;
  state: State;
  sealed_at: number | null;
  last_activity: number | null;
}

export interface Stroke {
  id: number;
  colophon_id: number;
  v: number;
  points: number[];
  t: number;
}

interface StrokeRow {
  id: number;
  colophon_id: number;
  v: number;
  points: string;
  t: number;
}

const selectSealed = db.prepare(
  "SELECT * FROM colophons WHERE state = 'sealed' ORDER BY COALESCE(sealed_at, created_at) ASC, id ASC",
);
const selectDrafts = db.prepare("SELECT * FROM colophons WHERE state = 'drafting' ORDER BY id ASC");
const selectById = db.prepare("SELECT * FROM colophons WHERE id = ?");
const selectOpenDraft = db.prepare("SELECT * FROM colophons WHERE state = 'drafting' AND token = ? LIMIT 1");
const countDrafts = db.prepare("SELECT COUNT(*) AS n FROM colophons WHERE state = 'drafting'");
const insertTyped = db.prepare(
  "INSERT INTO colophons (token, body, created_at, state, sealed_at) VALUES (?, ?, ?, 'sealed', ?)",
);
const insertDraft = db.prepare(
  "INSERT INTO colophons (token, body, created_at, state, last_activity) VALUES (?, '', ?, 'drafting', ?)",
);
const insertStroke = db.prepare("INSERT INTO strokes (colophon_id, v, points, t) VALUES (?, ?, ?, ?)");
const touchDraft = db.prepare("UPDATE colophons SET last_activity = ? WHERE id = ?");
const countStrokes = db.prepare("SELECT COUNT(*) AS n FROM strokes WHERE colophon_id = ?");
const selectStrokesFor = db.prepare("SELECT * FROM strokes WHERE colophon_id = ? ORDER BY id ASC");
const sealIfDrafting = db.prepare(
  "UPDATE colophons SET state = 'sealed', sealed_at = ?, body = ? WHERE id = ? AND token = ? AND state = 'drafting'",
);
const abandonIfDrafting = db.prepare(
  "UPDATE colophons SET state = 'abandoned' WHERE id = ? AND token = ? AND state = 'drafting'",
);
const abandonById = db.prepare("UPDATE colophons SET state = 'abandoned' WHERE id = ? AND state = 'drafting'");

const toStroke = (r: StrokeRow): Stroke => ({ ...r, points: JSON.parse(r.points) as number[] });

export function listColophons(): Colophon[] {
  return selectSealed.all() as unknown as Colophon[];
}

export function listDrafts(): Colophon[] {
  return selectDrafts.all() as unknown as Colophon[];
}

export function getColophon(id: number): Colophon | undefined {
  return selectById.get(id) as unknown as Colophon | undefined;
}

export function addColophon(token: string, body: string): number {
  const now = Date.now();
  return Number(insertTyped.run(token, body, now, now).lastInsertRowid);
}

export function openDraftFor(token: string): Colophon | undefined {
  return selectOpenDraft.get(token) as unknown as Colophon | undefined;
}

export function draftCount(): number {
  return (countDrafts.get() as { n: number }).n;
}

export function createDraft(token: string): Colophon {
  const now = Date.now();
  const id = Number(insertDraft.run(token, now, now).lastInsertRowid);
  return getColophon(id)!;
}

export function strokeCount(colophonId: number): number {
  return (countStrokes.get(colophonId) as { n: number }).n;
}

export function strokesFor(colophonId: number): Stroke[] {
  return (selectStrokesFor.all(colophonId) as unknown as StrokeRow[]).map(toStroke);
}

// Synchronous node:sqlite calls, so nothing else runs between the count the
// caller checked and this insert.
export function addStroke(colophonId: number, v: number, points: number[]): Stroke {
  const t = Date.now();
  const id = Number(insertStroke.run(colophonId, v, JSON.stringify(points), t).lastInsertRowid);
  touchDraft.run(t, colophonId);
  return { id, colophon_id: colophonId, v, points, t };
}

// One conditional UPDATE: of two seal requests racing, only one can still
// find the row in 'drafting', so a colophon is sealed exactly once.
export function sealDraft(id: number, token: string, body: string): boolean {
  return Number(sealIfDrafting.run(Date.now(), body, id, token).changes) === 1;
}

export function abandonDraft(id: number, token: string): boolean {
  return Number(abandonIfDrafting.run(id, token).changes) === 1;
}

// The sweeper's half of abandonment: false if the draft was sealed meanwhile.
export function abandonStaleDraft(id: number): boolean {
  return Number(abandonById.run(id).changes) === 1;
}
