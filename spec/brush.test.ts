import { JSDOM } from "jsdom";
import { expect, inject, it } from "vitest";
import { draft, page, post, stroke, visitor, type Visitor } from "./helpers.ts";
import { brushPath } from "../public/ink.js";

// Brushed colophons: the stroke format and caps from ADR 0001, who may touch a
// draft, sealing exactly once, and what a page with no script shows.
const baseUrl = inject("baseUrl");

const abandon = (who: Visitor, id: number) => post(baseUrl, `/api/colophons/${id}/abandon`, {}, who);
const seal = (who: Visitor, id: number, body?: string) =>
  post(baseUrl, `/api/colophons/${id}/seal`, body === undefined ? {} : { body }, who);

function panelFor(html: string, id: number): Element | null {
  return new JSDOM(html).window.document.querySelector(`.scroll-track [data-colophon-id="${id}"]`);
}

it("a visitor has one draft at a time", async () => {
  const me = await visitor(baseUrl);
  const a = await draft(baseUrl, me);
  expect(await draft(baseUrl, me)).toBe(a);
  await abandon(me, a);
  expect(await draft(baseUrl, me)).not.toBe(a);
  await abandon(me, await draft(baseUrl, me));
});

it("strokes persist, and a sealed colophon is in / as SVG ink with no script needed", async () => {
  const me = await visitor(baseUrl);
  const id = await draft(baseUrl, me);
  await stroke(baseUrl, me, id, [10, 20, 30, 40]);
  await stroke(baseUrl, me, id, [200, 380]);
  expect((await seal(me, id)).status).toBe(200);

  const panel = panelFor(await page(baseUrl), id)!;
  expect(panel).not.toBeNull();
  expect(panel.hasAttribute("hidden")).toBe(false);
  expect(panel.getAttribute("data-state")).toBe("sealed");
  const paths = [...panel.querySelectorAll("svg path")].map((p) => p.getAttribute("d"));
  expect(paths).toEqual([brushPath([10, 20, 30, 40]), brushPath([200, 380])]);
  expect(panel.getAttribute("aria-label")).toMatch(/^A brushed inscription, sealed ., /);
});

it("malformed, out-of-range and over-cap strokes are rejected, never clamped", async () => {
  const me = await visitor(baseUrl);
  const id = await draft(baseUrl, me);
  const bad: unknown[] = [
    { v: 1, points: [1] },
    { v: 1, points: [] },
    { v: 1, points: [1, 2, 3] },
    { v: 1, points: [241, 10] },
    { v: 1, points: [10, 401] },
    { v: 1, points: [-1, 10] },
    { v: 1, points: [1.5, 10] },
    { v: 1, points: ["1", 10] },
    { v: 2, points: [1, 1] },
    { points: [1, 1] },
    { v: 1, points: Array(802).fill(1) },
    { v: 1, points: [1, 1], c: "<script>" },
    [1, 2],
  ];
  for (const body of bad) {
    expect((await post(baseUrl, `/api/colophons/${id}/strokes`, body, me)).status, JSON.stringify(body).slice(0, 60)).toBe(400);
  }
  expect((await post(baseUrl, `/api/colophons/${id}/strokes`, "not json", me)).status).toBe(400);
  expect((await stroke(baseUrl, me, id, Array(800).fill(3))).status).toBe(201);

  for (let i = 1; i < 48; i++) expect((await stroke(baseUrl, me, id, [i, i])).status).toBe(201);
  const over = await stroke(baseUrl, me, id, [1, 1]);
  expect(over.status).toBe(422);
  await abandon(me, id);
});

it("only the writer's own cookie can add strokes to a draft or seal it", async () => {
  const writer = await visitor(baseUrl);
  const stranger = await visitor(baseUrl);
  const id = await draft(baseUrl, writer);
  await stroke(baseUrl, writer, id, [1, 1]);

  expect((await stroke(baseUrl, stranger, id, [2, 2])).status).toBe(403);
  expect((await seal(stranger, id)).status).toBe(403);
  expect((await abandon(stranger, id)).status).toBe(403);
  expect((await stroke(baseUrl, writer, id, [3, 3])).status).toBe(201);
  expect((await seal(writer, id)).status).toBe(200);

  const panel = panelFor(await page(baseUrl), id)!;
  expect(panel.querySelectorAll("path")).toHaveLength(2);
});

it("a sealed colophon takes no more ink, and two seals at once seal it exactly once", async () => {
  const me = await visitor(baseUrl);
  const id = await draft(baseUrl, me);
  await stroke(baseUrl, me, id, [4, 4, 8, 8]);

  const results = await Promise.all(Array.from({ length: 10 }, (_, i) => seal(me, id, `race ${i}`)));
  expect(results.filter((r) => r.status === 200)).toHaveLength(1);
  expect(results.filter((r) => r.status === 409)).toHaveLength(9);

  const before = panelFor(await page(baseUrl), id)!.outerHTML;
  const late = await stroke(baseUrl, me, id, [9, 9]);
  expect(late.status).toBe(409);
  expect(late.data.error).toBe("sealed");
  expect((await seal(me, id, "again")).status).toBe(409);
  expect(panelFor(await page(baseUrl), id)!.outerHTML).toBe(before);
});

it("an empty or over-length seal is rejected rather than truncated", async () => {
  const me = await visitor(baseUrl);
  const id = await draft(baseUrl, me);
  expect((await seal(me, id)).status).toBe(400);
  expect((await seal(me, id, "   ")).status).toBe(400);
  await stroke(baseUrl, me, id, [1, 1]);
  expect((await seal(me, id, "x".repeat(321))).status).toBe(400);
  expect((await seal(me, id, "a line to read it by")).status).toBe(200);
  expect(panelFor(await page(baseUrl), id)!.getAttribute("aria-label")).toBe("a line to read it by");
});

it("a brushed colophon is marked as yours only for its writer, and no page carries anyone's token", async () => {
  const writer = await visitor(baseUrl);
  const stranger = await visitor(baseUrl);
  const id = await draft(baseUrl, writer);
  await stroke(baseUrl, writer, id, [1, 1]);
  await seal(writer, id);

  const own = await page(baseUrl, writer);
  expect(panelFor(own, id)!.classList.contains("colophon--mine")).toBe(true);
  const theirs = await page(baseUrl, stranger);
  expect(panelFor(theirs, id)!.classList.contains("colophon--mine")).toBe(false);
  expect(theirs).not.toContain(writer.token);
  expect(own).not.toContain(writer.token);
});

it("someone else's open draft is in the HTML but hidden until the script runs", async () => {
  const writer = await visitor(baseUrl);
  const id = await draft(baseUrl, writer);
  await stroke(baseUrl, writer, id, [1, 1]);
  const panel = panelFor(await page(baseUrl), id)!;
  expect(panel.getAttribute("data-state")).toBe("drafting");
  expect(panel.hasAttribute("hidden")).toBe(true);
  await abandon(writer, id);
  expect(panelFor(await page(baseUrl), id)).toBeNull();
  expect((await stroke(baseUrl, writer, id, [2, 2])).status).toBe(410);
});

it("with no script, / still has the painting, the scroll, the transcript and the typed form", async () => {
  const doc = new JSDOM(await page(baseUrl)).window.document;
  expect(doc.querySelector(".scroll-track img.scroll-painting")).not.toBeNull();
  expect(doc.querySelector(".scroll-scroller")!.getAttribute("tabindex")).toBe("0");
  expect(doc.querySelector(".scroll-scroller")!.getAttribute("aria-label")).toBeTruthy();
  expect(doc.querySelector('form[method="post"][action="/colophons"] textarea[name="body"]')).not.toBeNull();
  for (const p of doc.querySelectorAll(".panel--sealed")) expect(p.hasAttribute("hidden")).toBe(false);
  expect(doc.querySelectorAll(".colophon-list > li").length).toBe(doc.querySelectorAll(".panel--sealed").length);
});
