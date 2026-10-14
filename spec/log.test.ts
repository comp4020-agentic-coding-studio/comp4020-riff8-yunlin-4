import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { createLogger } from "../src/log.ts";

function make(extra: Partial<Parameters<typeof createLogger>[0]> = {}) {
  const dir = mkdtempSync(join(tmpdir(), "log-"));
  const lines: string[] = [];
  const l = createLogger({ dir, maxBytes: 4 * 1024 * 1024, files: 4, out: (x) => lines.push(x), ...extra });
  return { dir, lines, l };
}

it("writes one JSON line with ts, event and who", async () => {
  const { dir, lines, l } = make();
  l.log("x", { who: "鑑·aaaaaa", n: 1 });
  l.log("y");
  await l.drain();
  const parsed = lines.map((x) => JSON.parse(x) as Record<string, unknown>);
  expect(parsed[0]).toMatchObject({ event: "x", who: "鑑·aaaaaa", n: 1 });
  expect(parsed[1]).toMatchObject({ event: "y", who: "-" });
  expect(typeof parsed[0]!.ts).toBe("string");
  expect(readFileSync(join(dir, "colophon.log"), "utf8")).toBe(lines.join(""));
});

it("a newline in a field cannot forge a second line, and long fields are truncated", async () => {
  const { lines, l } = make();
  l.log("request", { route: 'a\n{"event":"forged"}', big: "z".repeat(5000) });
  await l.drain();
  expect(lines).toHaveLength(1);
  expect(lines[0]!.trimEnd().includes("\n")).toBe(false);
  expect(lines[0]!.length).toBeLessThan(600);
});

it("rotates by size and keeps a bounded number of files", async () => {
  const { dir, l } = make({ maxBytes: 300, files: 3 });
  for (let i = 0; i < 40; i++) {
    l.log("fill", { i, pad: "p".repeat(60) });
    await l.drain();
  }
  const names = readdirSync(dir).sort();
  expect(names).toEqual(["colophon.log", "colophon.log.1", "colophon.log.2"]);
  for (const n of names) expect(readFileSync(join(dir, n)).length).toBeLessThanOrEqual(300);
});

it("an unwritable directory logs one file-error to stdout and never throws", async () => {
  const base = mkdtempSync(join(tmpdir(), "log-"));
  const file = join(base, "afile");
  (await import("node:fs")).writeFileSync(file, "x");
  const lines: string[] = [];
  const l = createLogger({ dir: join(file, "logs"), maxBytes: 1000, files: 2, out: (x) => lines.push(x) });
  l.log("a");
  await l.drain();
  l.log("b");
  await l.drain();
  const errs = lines.filter((x) => x.includes('"log.file-error"'));
  expect(errs).toHaveLength(1);
  expect(lines.filter((x) => x.includes('"event":"b"'))).toHaveLength(1);
});

it("a flood is rate limited and the drop is counted", async () => {
  const { lines, l } = make();
  for (let i = 0; i < 1000; i++) l.log("flood");
  await l.drain();
  expect(lines.filter((x) => x.includes('"flood"')).length).toBeLessThan(400);
  const dropped = lines.find((x) => x.includes('"log.dropped"'));
  expect(dropped).toBeTruthy();
  expect((JSON.parse(dropped!) as { count: number }).count).toBeGreaterThan(500);
});
