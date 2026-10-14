import { expect, inject, it } from "vitest";
import { markOf } from "../src/mark.ts";
import { sealGlyph } from "../src/seal.ts";
import { data, draft, page, Stream, stroke, visitor } from "./helpers.ts";

const baseUrl = inject("baseUrl");

it("a mark is the seal glyph plus six hex of a hash, stable and never the token", () => {
  const t = "11111111-2222-4333-8444-555555555555";
  const m = markOf(t);
  expect(m).toMatch(/^.·[0-9a-f]{6}$/u);
  expect(m.startsWith(sealGlyph(t))).toBe(true);
  expect(markOf(t)).toBe(m);
  expect(markOf("another-token")).not.toBe(m);
  expect(m).not.toContain(t.slice(0, 8));
});

it("a visitor sees their own mark and no one else's", async () => {
  const a = await visitor(baseUrl);
  const b = await visitor(baseUrl);
  expect(await page(baseUrl, a)).toContain(markOf(a.token));
  expect(await page(baseUrl, b)).not.toContain(markOf(a.token));
  expect(await page(baseUrl, a)).not.toContain(a.token);
});

it("the live channel carries neither a mark nor a token", async () => {
  const a = await visitor(baseUrl);
  const s = new Stream(baseUrl);
  await s.opened();
  const id = await draft(baseUrl, a);
  await stroke(baseUrl, a, id, [10, 10, 20, 20]);
  await s.waitFor((e) => e.type === "stroke" && data(e).colophonId === id);
  await s.close();
  expect(s.raw).not.toContain(a.token);
  expect(s.raw).not.toContain(markOf(a.token));
  expect(s.raw).not.toContain(markOf(a.token).split("·")[1]!);
});
