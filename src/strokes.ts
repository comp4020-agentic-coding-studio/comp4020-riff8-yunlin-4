// Stroke format v1 and the draft lifecycle rules, as pure functions so spec/
// can test them without a running clock. docs/adr/0001-*.md is the written
// version of everything here.

export const PANEL_WIDTH = 240;
export const PANEL_HEIGHT = 400;
export const MAX_STROKES = 48;
export const MAX_POINTS = 400;
export const STROKE_VERSION = 1;
export const ABANDON_AFTER_MS = 10 * 60 * 1000;

export interface StrokeInput {
  points: number[];
  nonce?: string;
}

const NONCE_RE = /^[a-z0-9]{1,16}$/;

// Rejects rather than clamps: a stroke that arrives out of range was never
// drawn on this panel, and quietly moving it would be writing ink nobody put
// there.
export function parseStroke(input: unknown): StrokeInput | string {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return "not an object";
  const { v, points, c } = input as Record<string, unknown>;
  if (v !== STROKE_VERSION) return "unknown version";
  if (!Array.isArray(points)) return "points must be an array";
  if (points.length < 2 || points.length % 2 !== 0) return "points must be x,y pairs";
  if (points.length > MAX_POINTS * 2) return "too many points";
  for (let i = 0; i < points.length; i++) {
    const n = points[i];
    const max = i % 2 === 0 ? PANEL_WIDTH : PANEL_HEIGHT;
    if (typeof n !== "number" || !Number.isInteger(n) || n < 0 || n > max) return "point out of range";
  }
  if (c !== undefined && (typeof c !== "string" || !NONCE_RE.test(c))) return "bad nonce";
  return { points: points as number[], nonce: c as string | undefined };
}

export function pathData(points: readonly number[]): string {
  let d = `M${points[0]} ${points[1]}`;
  // A single point still needs a segment for the round cap to draw a dot.
  if (points.length === 2) return `${d}L${points[0]} ${points[1]}`;
  for (let i = 2; i < points.length; i += 2) d += `L${points[i]} ${points[i + 1]}`;
  return d;
}

export function isAbandoned(lastActivity: number, now: number, after = ABANDON_AFTER_MS): boolean {
  return now - lastActivity >= after;
}
