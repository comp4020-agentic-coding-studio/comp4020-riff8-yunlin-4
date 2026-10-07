import { expect, it } from "vitest";
import { ABANDON_AFTER_MS, isAbandoned, parseStroke, pathData } from "../src/strokes.ts";

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

it("parses a v1 stroke and renders it as a path", () => {
  expect(parseStroke({ v: 1, points: [0, 0, 240, 400], c: "ab12" })).toEqual({ points: [0, 0, 240, 400], nonce: "ab12" });
  expect(typeof parseStroke({ v: 1, points: [0, 0, 240, 401] })).toBe("string");
  expect(pathData([1, 2, 3, 4])).toBe("M1 2L3 4");
  expect(pathData([5, 6])).toBe("M5 6L5 6");
});
