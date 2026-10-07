// Browser checks for the brush and live drafts: things the HTTP specs in
// spec/ can't see. Runs locally only (`pnpm e2e`), never in CI, which has no
// browser. Starts its own server on a scratch database, drives the installed
// Chrome (CHROME_PATH, or Playwright's "chrome" channel), asserts on the DOM
// and leaves screenshots in e2e/shots/ for a person (or agent) to look at.
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { chromium, type BrowserContext, type Page } from "playwright-core";

const PORT = Number(process.env.E2E_PORT ?? 8197);
const BASE = `http://localhost:${PORT}`;
const SHOTS = "e2e/shots";
mkdirSync(SHOTS, { recursive: true });

const server = spawn(process.execPath, ["src/server.ts"], {
  env: { ...process.env, PORT: String(PORT), DB_PATH: join(mkdtempSync(join(tmpdir(), "colophon-e2e-")), "c.db") },
  stdio: ["ignore", "pipe", "inherit"],
});
await new Promise<void>((resolve) => server.stdout!.on("data", (d: Buffer) => d.includes("listening") && resolve()));

const browser = await chromium.launch(
  process.env.CHROME_PATH
    ? { executablePath: process.env.CHROME_PATH, args: ["--no-sandbox"] }
    : { channel: "chrome", args: ["--no-sandbox"] },
);

const results: string[] = [];
async function step(name: string, fn: () => Promise<void>): Promise<void> {
  await fn();
  results.push(`✓ ${name}`);
  console.log(`✓ ${name}`);
}

async function open(context: BrowserContext): Promise<Page> {
  const page = await context.newPage();
  page.on("pageerror", (err) => {
    throw err;
  });
  page.on("console", (msg) => msg.type() === "error" && console.error(`console: ${msg.text()}`));
  await page.goto(BASE);
  return page;
}

// Draws a stroke on the brush in panel coordinates, with real mouse events.
async function brushStroke(page: Page, points: [number, number][]): Promise<void> {
  const surface = page.locator("[data-brush-surface]");
  await surface.scrollIntoViewIfNeeded();
  const box = (await surface.boundingBox())!;
  const at = ([x, y]: [number, number]) => [box.x + (x / 240) * box.width, box.y + (y / 400) * box.height] as const;
  await page.mouse.move(...at(points[0]!));
  await page.mouse.down();
  for (const p of points.slice(1)) await page.mouse.move(...at(p), { steps: 4 });
  await page.mouse.up();
}

const draftSel = (id: string) => `.panel--draft[data-colophon-id="${id}"]`;

try {
  const writerCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const readerCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const writer = await open(writerCtx);
  const reader = await open(readerCtx);
  let id = "";

  await step("the scroller starts at its right end, on the painting", async () => {
    const left = await reader.evaluate(() => document.querySelector(".scroll-scroller")!.scrollLeft);
    assert.equal(left, 0);
    const painting = await reader.locator(".scroll-painting").boundingBox();
    const scroller = await reader.locator(".scroll-scroller").boundingBox();
    assert.ok(painting!.x + painting!.width <= scroller!.x + scroller!.width + 1);
    assert.ok(painting!.x + painting!.width > scroller!.x + scroller!.width - 5);
    assert.ok(scroller!.height >= 500, `scroller is ${scroller!.height}px tall`);
    const ratio = painting!.width / painting!.height;
    assert.ok(Math.abs(ratio - 2400 / 163) < 0.1, `painting aspect ${ratio}`);
    await reader.screenshot({ path: `${SHOTS}/01-start.png` });
  });

  await step("a stroke brushed in one browser appears in another within a second", async () => {
    await brushStroke(writer, [[40, 60], [120, 80], [200, 70]]);
    await writer.waitForFunction(() => document.querySelector("[data-brush]")!.hasAttribute("data-colophon-id"));
    id = (await writer.locator("[data-brush]").getAttribute("data-colophon-id"))!;
    const t0 = Date.now();
    await reader.waitForSelector(`${draftSel(id)} path`, { timeout: 1500 });
    console.log(`  arrived in ${Date.now() - t0}ms after the writer's page had its id`);
    await brushStroke(writer, [[120, 100], [118, 200], [122, 330]]);
    await brushStroke(writer, [[60, 220], [180, 230]]);
    await reader.waitForFunction((sel) => document.querySelectorAll(`${sel} path`).length === 3, draftSel(id), {
      timeout: 1500,
    });
    assert.equal(await writer.locator("[data-brush-surface] path").count(), 3);
    assert.equal(await writer.locator(".panel--draft").count(), 0, "the writer sees their own draft as someone else's");
    // The first stroke ran from x=40 to x=200 in panel units; if the brush
    // moved under the pen mid-stroke, its ink lands somewhere else.
    const bbox = await writer.locator("[data-brush-surface] path").first().evaluate((p) => { const b = (p as SVGPathElement).getBBox(); return { x: b.x, y: b.y, width: b.width, height: b.height }; });
    assert.ok(bbox.x > 30 && bbox.x < 45 && bbox.x + bbox.width > 195 && bbox.x + bbox.width < 210, `first stroke drifted: ${JSON.stringify(bbox)}`);
    const readerD = await reader.locator(`${draftSel(id)} path`).first().getAttribute("d");
    assert.equal(readerD, await writer.locator("[data-brush-surface] path").first().getAttribute("d"));
    assert.equal(await writer.locator("[data-submit]").textContent(), "Seal it");
    await writer.locator("[data-brush]").screenshot({ path: `${SHOTS}/02-writer-brush.png` });
    await reader.locator(draftSel(id)).scrollIntoViewIfNeeded();
    await reader.screenshot({ path: `${SHOTS}/03-reader-sees-draft.png` });
  });

  await step("ink stays inside the panel", async () => {
    await brushStroke(writer, [[230, 380], [300, 500]]);
    await writer.waitForTimeout(300);
    const bbox = await writer.locator("[data-brush-surface] path").last().evaluate((p) => { const b = (p as SVGPathElement).getBBox(); return { x: b.x, y: b.y, width: b.width, height: b.height }; });
    assert.ok(bbox.x + bbox.width <= 240 + 6 && bbox.y + bbox.height <= 400 + 6, JSON.stringify(bbox));
  });

  await step("a hidden reader catches up on what it missed when it comes back", async () => {
    await reader.evaluate(() => {
      Object.defineProperty(document, "hidden", { value: true, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await brushStroke(writer, [[30, 300], [90, 340]]);
    await writer.waitForFunction(() => !document.querySelector("[data-brush-surface] .wet"));
    await reader.waitForTimeout(500);
    assert.equal(await reader.locator(`${draftSel(id)} path`).count(), 4);
    await reader.evaluate(() => {
      Object.defineProperty(document, "hidden", { value: false, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await reader.waitForFunction((sel) => document.querySelectorAll(`${sel} path`).length === 5, draftSel(id), {
      timeout: 1500,
    });
  });

  await step("sealing settles the draft into the scroll, marked yours only for the writer", async () => {
    const before = await reader.evaluate(() => {
      const s = document.querySelector(".scroll-scroller")!;
      s.scrollLeft = 0;
      return document.querySelector(".scroll-painting")!.getBoundingClientRect().left;
    });
    await writer.locator("textarea").fill("pine, rock, a long afternoon");
    await writer.locator("[data-submit]").click();
    await reader.waitForSelector(`.panel--sealed[data-colophon-id="${id}"]`, { timeout: 1500 });
    assert.equal(await reader.locator(draftSel(id)).count(), 0);
    assert.equal(await reader.locator(`.panel--sealed[data-colophon-id="${id}"] path`).count(), 5);
    assert.equal(await reader.locator(`.panel--sealed[data-colophon-id="${id}"].colophon--mine`).count(), 0);
    await writer.waitForSelector(`.panel--sealed.colophon--mine[data-colophon-id="${id}"]`, { timeout: 1500 });
    assert.equal(await writer.locator("[data-brush-surface] path").count(), 0);
    assert.equal(await reader.locator(`.colophon-list [data-colophon-id="${id}"]`).count(), 1);
    const after = await reader.evaluate(() => document.querySelector(".scroll-painting")!.getBoundingClientRect().left);
    assert.equal(after, before, "a sheet mounted at the far end moved the reader");
    await writer.locator(`.panel--sealed[data-colophon-id="${id}"]`).scrollIntoViewIfNeeded();
    await writer.waitForTimeout(1300);
    await writer.screenshot({ path: `${SHOTS}/04-writer-sealed.png` });
    await reader.locator(`.panel--sealed[data-colophon-id="${id}"]`).scrollIntoViewIfNeeded();
    await reader.waitForTimeout(1300);
    await reader.screenshot({ path: `${SHOTS}/05-reader-sealed.png` });
  });

  await step("a sheet arriving elsewhere doesn't move the reader off what they're looking at", async () => {
    await reader.locator(`.panel--sealed[data-colophon-id="${id}"]`).scrollIntoViewIfNeeded();
    const before = await reader.locator(`.panel--sealed[data-colophon-id="${id}"]`).boundingBox();
    const other = await browser.newContext();
    const page = await open(other);
    await brushStroke(page, [[50, 50], [150, 150]]);
    await page.locator("[data-submit]").click();
    await reader.waitForFunction(() => document.querySelectorAll(".panel--sealed").length === 2, null, { timeout: 2000 });
    await reader.waitForTimeout(100);
    const after = await reader.locator(`.panel--sealed[data-colophon-id="${id}"]`).boundingBox();
    assert.ok(Math.abs(after!.x - before!.x) < 2, `moved from ${before!.x} to ${after!.x}`);
    await other.close();
  });

  await step("the timelapse brushes every sealed colophon again, then leaves them all inked", async () => {
    const paths = reader.locator(".panel--sealed path");
    const total = await paths.count();
    assert.ok(total >= 6);
    assert.ok(await reader.locator(".panel--sealed path[data-t]").count() === total, "every stroke carries its time");
    await reader.locator("[data-timelapse]").click();
    await reader.waitForTimeout(300);
    assert.ok((await reader.locator(".panel--sealed path.unwritten").count()) > 0);
    await reader.waitForTimeout(1200);
    await reader.screenshot({ path: `${SHOTS}/09-timelapse.png` });
    await reader.waitForFunction(() => document.querySelector("[data-timelapse]")!.textContent !== "Stop", null, {
      timeout: 15000,
    });
    assert.equal(await reader.locator(".unwritten").count(), 0);
  });

  await step("start over abandons the draft for everyone", async () => {
    await brushStroke(writer, [[100, 100], [140, 140]]);
    await writer.waitForFunction(() => document.querySelector("[data-brush]")!.hasAttribute("data-colophon-id"));
    const draftId = (await writer.locator("[data-brush]").getAttribute("data-colophon-id"))!;
    await reader.waitForSelector(draftSel(draftId), { timeout: 1500 });
    await writer.locator("[data-start-over]").click();
    await reader.waitForSelector(draftSel(draftId), { state: "detached", timeout: 1500 });
    assert.equal(await writer.locator("[data-brush-surface] path").count(), 0);
  });

  await step("with JavaScript off: painting, sealed colophons, typed form, no brush", async () => {
    const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(BASE);
    assert.ok(await page.locator(".scroll-painting").isVisible());
    assert.ok(await page.locator(`.panel--sealed[data-colophon-id="${id}"]`).isVisible());
    assert.equal(await page.locator("[data-brush]").isVisible(), false);
    await page.locator("textarea").fill("typed without a script");
    await page.locator("[data-submit]").click();
    await page.waitForURL(`${BASE}/`);
    assert.ok(await page.locator(".panel--sealed .panel-type", { hasText: "typed without a script" }).isVisible());
    assert.equal(await page.locator(".colophon-list li", { hasText: "typed without a script" }).count(), 1);
    await page.locator(".panel-type", { hasText: "typed without a script" }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${SHOTS}/06-no-js.png` });
    await ctx.close();
  });

  await step("at 390px: no sideways page scroll, and a touch stroke draws", async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await open(ctx);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 0, `page scrolls sideways by ${overflow}px`);
    await page.screenshot({ path: `${SHOTS}/07-phone-start.png` });
    await page.locator("[data-goto-brush]").click();
    await page.waitForFunction(() => {
      const r = document.querySelector("[data-brush-surface]")!.getBoundingClientRect();
      return r.left >= 0 && r.right <= window.innerWidth;
    }, null, { timeout: 5000 });
    const box = (await page.locator("[data-brush-surface]").boundingBox())!;
    const cdp = await ctx.newCDPSession(page);
    const pt = (x: number, y: number) => [{ x: box.x + box.width * x, y: box.y + box.height * y }];
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: pt(0.2, 0.2) });
    for (let i = 1; i <= 10; i++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: pt(0.2 + i * 0.05, 0.2 + i * 0.04) });
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForFunction(() => document.querySelector("[data-brush-surface] path[data-stroke-id]"));
    const d = await page.locator("[data-brush-surface] path").first().getAttribute("d");
    assert.ok(d!.split("L").length > 8, `touch stroke has too few points: ${d}`);
    const overflowAfter = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflowAfter <= 0);
    await page.screenshot({ path: `${SHOTS}/08-phone-brush.png` });
    await ctx.close();
  });

  await step("keyboard: the scroller takes focus and arrow keys scroll it", async () => {
    const page = await open(readerCtx);
    await page.locator(".scroll-scroller").focus();
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(300);
    const left = await page.evaluate(() => document.querySelector(".scroll-scroller")!.scrollLeft);
    assert.ok(left < 0, `scrollLeft ${left}`);
  });
} finally {
  await browser.close();
  server.kill();
}
