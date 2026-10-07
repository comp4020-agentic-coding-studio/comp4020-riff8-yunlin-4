import { expect, it } from "vitest";
import { ABANDON_AFTER_MS, isAbandoned, parseStroke } from "../src/strokes.ts";
import { brushPath } from "../public/ink.js";

// The rules that don't need a running app: abandonment with an injected clock
// (the app's own clock can't be fast-forwarded), and the stroke format.

it("a draft is abandoned once it has gone the whole window without a stroke", () => {
  const last = 1_000_000;
  expect(ABANDON_AFTER_MS).toBe(10 * 60 * 1000);
  expect(isAbandoned(last, last)).toBe(false);
  expect(isAbandoned(last, last + ABANDON_AFTER_MS - 1)).toBe(false);
  expect(isAbandoned(last, last + ABANDON_AFTER_MS)).toBe(true);
  expect(isAbandoned(last, last + 5_000, 5_000)).toBe(true);
});

it("parses a v1 stroke", () => {
  expect(parseStroke({ v: 1, points: [0, 0, 240, 400], c: "ab12" })).toEqual({ points: [0, 0, 240, 400], nonce: "ab12" });
  expect(typeof parseStroke({ v: 1, points: [0, 0, 240, 401] })).toBe("string");
});

it("renders a stroke as one closed brush outline, a dot included", () => {
  const line = brushPath([10, 10, 20, 12, 30, 15, 40, 20]);
  expect(line).toMatch(/^M[\d. -]+(L[\d. -]+)+A.*Z$/);
  expect(line).not.toMatch(/NaN|Infinity/);
  expect(brushPath([5, 6])).toMatch(/^M0 6a5 5 0 1 0 10 0a5 5 0 1 0 -10 0Z$/);
  expect(brushPath([5, 6, 5, 6, 5, 6])).toBe(brushPath([5, 6]));
  expect(brushPath([1, 1, 1, 1, 9, 9])).not.toMatch(/NaN/);
});
