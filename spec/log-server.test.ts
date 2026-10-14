import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, expect, it } from "vitest";
import { markOf } from "../src/mark.ts";
import { draft, stroke, until, visitor } from "./helpers.ts";
import type { Visitor } from "./helpers.ts";

const children: ChildProcess[] = [];
afterAll(() => {
  for (const c of children) c.kill();
});

async function start(logDir?: string) {
  const dir = mkdtempSync(join(tmpdir(), "logsrv-"));
  const port = 8400 + Math.floor(Math.random() * 500);
  const child = spawn(process.execPath, ["src/server.ts"], {
    env: { ...process.env, PORT: String(port), DB_PATH: join(dir, "c.db"), LOG_DIR: logDir ?? join(dir, "logs") },
  });
  children.push(child);
  let out = "";
  child.stdout.on("data", (d: Buffer) => (out += d.toString()));
  await until(() => out.includes("listening"), 10000);
  return {
    base: `http://127.0.0.1:${port}`,
    logDir: logDir ?? join(dir, "logs"),
    lines: () => out.split("\n").filter(Boolean),
    json: () => out.split("\n").filter(Boolean).map((l) => JSON.parse(l) as Record<string, string>),
  };
}

it("logs structured lines with no secrets, IPs, user agents or query strings", async () => {
  const s = await start();
  const a = await visitor(s.base);
  const res = await fetch(new URL("/?error=canary-q", s.base), {
    headers: { Cookie: a.cookie, "User-Agent": "canary-UA-xyz" },
  });
  await res.text();
  await fetch(new URL("/x%0A%7B%22event%22:%22forged%22%7D", s.base));
  await until(() => s.json().filter((l) => l.event === "request").length >= 3, 3000);
  const before = s.lines().length;
  const all = s.lines().join("\n");
  for (const l of s.json()) {
    expect(typeof l.ts).toBe("string");
    expect(typeof l.event).toBe("string");
    expect(typeof l.who).toBe("string");
  }
  const mine = s.json().find((l) => l.event === "request" && l.who === markOf(a.token));
  expect(mine).toBeTruthy();
  expect(mine!.route).toBe("GET /");
  expect(all).not.toContain(a.token);
  expect(all.toLowerCase()).not.toContain("cookie");
  for (const bad of ["127.0.0.1:", "::1", "canary-UA-xyz", "canary-q", "forged"]) {
    expect(all.replace(/listening on 0\.0\.0\.0:\d+/, "")).not.toContain(bad);
  }
  expect(s.json().some((l) => l.route === "unmatched")).toBe(true);
  expect(before).toBe(s.lines().length);
});

it("records a refusal with both parties, and the file has the same lines", async () => {
  const s = await start();
  const owner: Visitor = await visitor(s.base);
  const intruder: Visitor = await visitor(s.base);
  const id = await draft(s.base, owner);
  const r = await stroke(s.base, intruder, id, [1, 1, 2, 2]);
  expect(r.status).toBe(403);
  await until(() => s.json().some((l) => l.event === "denied"), 3000);
  const denied = s.json().find((l) => l.event === "denied")!;
  expect(denied).toMatchObject({
    reason: "not-yours",
    who: markOf(intruder.token),
    owner: markOf(owner.token),
    route: "POST /api/colophons/:id/:action",
  });
  await until(() => {
    try {
      return readFileSync(join(s.logDir, "colophon.log"), "utf8").includes("not-yours");
    } catch {
      return false;
    }
  }, 3000);
  await new Promise((r) => setTimeout(r, 200));
  const fileLines = readFileSync(join(s.logDir, "colophon.log"), "utf8").split("\n").filter(Boolean);
  expect(fileLines).toEqual(s.lines().slice(0, fileLines.length));
});

it("keeps serving when the log directory is unwritable", async () => {
  const base = mkdtempSync(join(tmpdir(), "logsrv-"));
  const file = join(base, "afile");
  writeFileSync(file, "x");
  const s = await start(join(file, "logs"));
  for (let i = 0; i < 3; i++) expect((await fetch(new URL("/", s.base))).status).toBe(200);
  await until(() => s.json().some((l) => l.event === "log.file-error"), 3000);
  expect(s.json().filter((l) => l.event === "log.file-error")).toHaveLength(1);
});
