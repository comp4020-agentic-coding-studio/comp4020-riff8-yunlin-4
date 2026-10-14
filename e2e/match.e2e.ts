// Browser check for the crit-10 scenario: two people in two separate browsers
// play a match through the UI, one is refused on the other's unit, one
// forfeits, the other seals the chronicle, and the server's own log lines alone
// say who did what. Runs locally only (`pnpm e2e`). Scratch database and log
// dir; the server runs with MATCH_MANUAL_TICKS=1 so "Step 20" drives time.
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { chromium, type BrowserContext, type Page } from "playwright-core";
import { narrateLine, newMemory } from "../scripts/narrate.ts";

const PORT = Number(process.env.E2E_PORT ?? 8791);
const BASE = `http://localhost:${PORT}`;
const SHOTS = "e2e/shots";
mkdirSync(SHOTS, { recursive: true });

const dir = mkdtempSync(join(tmpdir(), "colophon-match-e2e-"));
const stdoutLines: string[] = [];
function startServer(): Promise<ChildProcess> {
  const child = spawn(process.execPath, ["src/server.ts"], {
    env: { ...process.env, PORT: String(PORT), DB_PATH: join(dir, "c.db"), LOG_DIR: join(dir, "logs"), MATCH_MANUAL_TICKS: "1" },
    stdio: ["ignore", "pipe", "inherit"],
  });
  let buf = "";
  return new Promise((resolve) =>
    child.stdout!.on("data", (d: Buffer) => {
      buf += d.toString();
      const parts = buf.split("\n");
      buf = parts.pop()!;
      for (const l of parts) {
        stdoutLines.push(l);
        if (l.includes("listening")) resolve(child);
      }
    }),
  );
}
const server = await startServer();

async function step(name: string, fn: () => Promise<void>): Promise<void> {
  await fn();
  console.log(`✓ ${name}`);
}

type Entity = { id: number; side: number; kind: string; x: number; y: number };
type Status = { status: string; you: number | null; view: { grain: number; entities: Entity[]; groves: [number, number, number][] } | null };
const T = 22; // the client's tile size in CSS px (public/match.js)

const browser = await chromium.launch(
  process.env.CHROME_PATH
    ? { executablePath: process.env.CHROME_PATH, args: ["--no-sandbox"] }
    : { channel: "chrome", args: ["--no-sandbox"] },
);

async function open(ctx: BrowserContext, path: string): Promise<Page> {
  const page = await ctx.newPage();
  page.on("pageerror", (err) => {
    throw err;
  });
  page.on("dialog", (d) => void d.accept());
  await page.goto(BASE + path);
  return page;
}
const myStatus = (p: Page) => p.evaluate(() => fetch("/api/match").then((r) => r.json())) as Promise<Status>;
const markOn = async (p: Page) => (await p.locator(".own-mark code").textContent())!;
const grainOf = async (p: Page) => (await myStatus(p)).view!.grain;
const step20 = async (p: Page) => {
  await p.getByRole("button", { name: "Step 20" }).click();
  await p.waitForTimeout(300);
};

// Selects one own labourer by clicking where the canvas draws it, then orders
// it to gather from the nearest grove with the Gather button and a click.
async function gather(p: Page): Promise<void> {
  const s = await myStatus(p);
  const v = s.view!;
  const lab = v.entities.find((e) => e.side === s.you && e.kind === "labourer")!;
  const grove = [...v.groves].sort((a, b) => Math.hypot(a[0] - lab.x, a[1] - lab.y) - Math.hypot(b[0] - lab.x, b[1] - lab.y))[0]!;
  const canvas = p.locator("[data-match-canvas]");
  // Bring the labourer, then the grove, into the visible part of the scroller.
  const show = async (x: number, y: number) =>
    p.evaluate(([cx, cy]) => {
      const sc = document.querySelector("[data-match-scroller]")!;
      const r = sc.getBoundingClientRect();
      const c = document.querySelector("[data-match-canvas]")!.getBoundingClientRect();
      sc.scrollLeft += c.left + cx - (r.left + r.width / 2);
      sc.scrollTop += c.top + cy - (r.top + r.height / 2);
    }, [x * T + T / 2, y * T + T / 2]);
  await canvas.scrollIntoViewIfNeeded();
  await show(lab.x, lab.y);
  let box = (await canvas.boundingBox())!;
  await p.mouse.click(box.x + lab.x * T + T / 2, box.y + lab.y * T + T / 2);
  await p.getByText("1 勞 selected").waitFor({ timeout: 5000 });
  await p.getByRole("button", { name: "Gather", exact: true }).click();
  await show(grove[0], grove[1]);
  box = (await canvas.boundingBox())!;
  await p.mouse.click(box.x + grove[0] * T + T / 2, box.y + grove[1] * T + T / 2);
  await p.waitForTimeout(300);
}

const ctxOpts = { viewport: { width: 1280, height: 800 } };
const ctxA = await browser.newContext(ctxOpts);
const ctxB = await browser.newContext(ctxOpts);
try {
  let a: Page, b: Page, markA = "", markB = "";

  await step("two separate browsers have different marks, each shown only to its owner", async () => {
    a = await open(ctxA, "/");
    b = await open(ctxB, "/");
    markA = await markOn(a);
    markB = await markOn(b);
    assert.notEqual(markA, markB);
    assert.ok(!(await a.content()).includes(markB));
    assert.ok(!(await b.content()).includes(markA));
  });

  await step("A unrolls a match, B takes the west seat, both see the board", async () => {
    await a.goto(`${BASE}/match`);
    await a.getByRole("button", { name: "Unroll a new match" }).click();
    await b.goto(`${BASE}/match`);
    await b.getByRole("button", { name: "Take the west seat" }).click();
    await a.locator("[data-match-board]:not([hidden])").waitFor();
    await b.locator("[data-match-board]:not([hidden])").waitFor();
    // A's page learns of the join from the stream; reload for a certain view.
    assert.equal((await myStatus(a)).you, 0);
    assert.equal((await myStatus(b)).you, 1);
  });

  await step("fog: each seat's own view holds none of the other's pieces at the start", async () => {
    assert.equal((await myStatus(a)).view!.entities.filter((e) => e.side === 1).length, 0);
    assert.equal((await myStatus(b)).view!.entities.filter((e) => e.side === 0).length, 0);
  });

  await step("both commands gather through the canvas; stepping time changes grain", async () => {
    const before = [await grainOf(a), await grainOf(b)];
    await gather(a);
    await gather(b);
    for (let i = 0; i < 5; i++) {
      await step20(a);
      await step20(b);
    }
    assert.notEqual(await grainOf(a), before[0], "A's grain didn't change");
    assert.notEqual(await grainOf(b), before[1], "B's grain didn't change");
    await a.screenshot({ path: `${SHOTS}/match-A-1280.png` });
    await b.screenshot({ path: `${SHOTS}/match-B-1280.png` });
    const bp = await browser.newContext({ viewport: { width: 390, height: 844 } });
    // (the phone shot reuses B's cookie so it shows B's own board)
    await bp.addCookies(await ctxB.cookies());
    const phone = await open(bp, "/match");
    await phone.locator("[data-match-board]:not([hidden])").waitFor();
    await phone.waitForTimeout(500);
    await phone.screenshot({ path: `${SHOTS}/match-B-390.png` });
    await bp.close();
  });

  let aUnit = 0;
  await step("B is refused on A's unit and on a nonexistent id with identical bodies", async () => {
    const sa = await myStatus(a);
    aUnit = sa.view!.entities.find((e) => e.side === 0 && e.kind === "labourer")!.id;
    const stop = (id: number) =>
      b.evaluate(async (id) => {
        const r = await fetch("/api/match/command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "stop", units: [id] }),
        });
        return { status: r.status, body: await r.text() };
      }, id);
    const theirs = await stop(aUnit);
    const none = await stop(999999);
    assert.equal(theirs.status, 422);
    assert.ok(theirs.body.includes("not-yours"));
    assert.deepEqual(theirs, none);
  });

  await step("A forfeits (a real hall fall takes thousands of steps); both pages show the result", async () => {
    await a.getByRole("button", { name: "Forfeit" }).click();
    await a.getByText("You lost.").waitFor();
    await b.getByText("You won.").waitFor({ timeout: 5000 });
  });

  await step("B seals the chronicle; it is B's own on the scroll and not A's", async () => {
    await b.getByRole("button", { name: "Seal the chronicle" }).click();
    await b.getByText("Sealed onto the scroll").waitFor();
    await b.goto(BASE + "/");
    await a.goto(BASE + "/");
    assert.ok((await b.locator(".panel--sealed.colophon--mine").count()) >= 1, "not marked as B's");
    assert.equal(await a.locator(".panel--sealed.colophon--mine, li.colophon--mine").count(), 0, "marked as A's");
    assert.ok((await a.locator(".panel--sealed, .colophon-list li").count()) >= 1);
  });

  await step("the log alone says who did what, and holds no token, address or User-Agent", async () => {
    await new Promise((r) => setTimeout(r, 300));
    const lines = stdoutLines.filter((l) => l.startsWith("{"));
    const objs = lines.map((l) => JSON.parse(l) as Record<string, unknown>);
    const has = (f: (o: Record<string, unknown>) => boolean) => objs.some(f);
    assert.ok(has((o) => o.event === "match.create" && o.who === markA));
    assert.ok(has((o) => o.event === "match.join" && o.who === markB));
    assert.ok(has((o) => o.event === "command" && o.who === markA));
    assert.ok(has((o) => o.event === "command" && o.who === markB));
    assert.ok(has((o) => o.event === "denied" && o.reason === "not-yours" && o.who === markB && o.owner === markA));
    assert.ok(has((o) => o.event === "match.end"));
    assert.ok(has((o) => o.event === "chronicle.seal" && o.who === markB));
    const tokens = [...(await ctxA.cookies()), ...(await ctxB.cookies())].filter((c) => c.name === "seal").map((c) => c.value);
    assert.equal(tokens.length, 2);
    const ua = await a.evaluate(() => navigator.userAgent);
    const all = lines.join("\n");
    for (const t of tokens) assert.ok(!all.includes(t) && !all.includes(decodeURIComponent(t)), "a token is in the log");
    assert.ok(!all.includes("127.0.0.1") && !all.includes("::1") && !all.includes(ua) && !/Mozilla\//.test(all));

    const memory = newMemory();
    const story = lines.map((l) => narrateLine(l, memory, { quiet: true })).filter((s): s is string => s !== null);
    console.log("--- narration ---\n" + story.join("\n") + "\n-----------------");
    const text = story.join("\n");
    const mention = (re: RegExp, what: string) => assert.ok(re.test(text), `narration lacks: ${what}`);
    mention(new RegExp(`${markA}.*created a match`), "A creating");
    mention(new RegExp(`${markB}.*joined the match`), "B joining");
    mention(new RegExp(`${markB}.*not theirs.*${markA}`), "B refused on A's unit");
    mention(new RegExp(`${markB}.*seal`, "i"), "B sealing");
  });
} finally {
  await browser.close();
  server.kill();
}
