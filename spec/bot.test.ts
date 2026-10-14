import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { botCommands, createBot } from "../src/bot.ts";
import { BOT, createMatch, validateCommand, viewFor, type Command } from "../src/sim/index.ts";
import { clearUnits, place } from "../src/sim/testing.ts";

// seat 1 (west) plays; its hall is at 5..7, 14..16
const ordered = (cmds: Command[]) => new Set(cmds.flatMap((c) => ("units" in c ? c.units : [])));

describe("the computer opponent", () => {
  it("answers the same view with the same commands", () => {
    const state = createMatch("scroll-1", 1);
    for (const seat of [0, 1] as const) {
      const view = viewFor(state, seat);
      expect(botCommands(view)).toEqual(botCommands(structuredClone(view)));
      expect(createBot({ attackAt: 5 })(view)).toEqual(createBot({ attackAt: 5 })(view));
    }
  });

  it("reads only the fogged view: no simulation internals imported", () => {
    const src = readFileSync(new URL("../src/bot.ts", import.meta.url), "utf8");
    const imports = [...src.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]);
    for (const i of imports) expect(["./sim/balance.ts", "./sim/types.ts"]).toContain(i);
    expect(src).not.toMatch(/state\.ts|step\.ts|SimState/);
    expect(src).not.toMatch(/Math\.random|Date\./);
  });

  it("opens a match with commands the simulation accepts", () => {
    for (const seat of [0, 1] as const) {
      const state = createMatch("scroll-1", 1);
      const cmds = botCommands(viewFor(state, seat));
      expect(cmds.length).toBeGreaterThan(0);
      expect(cmds.length).toBeLessThanOrEqual(6);
      for (const c of cmds) expect(validateCommand(state, seat, c)).toMatchObject({ ok: true });
    }
  });

  // round 2: an economist walked into an empty base while the bot's army was out
  it("keeps a home guard when a wave marches", () => {
    const s = createMatch("scroll-1", 1);
    clearUnits(s);
    const sp = Array.from({ length: BOT.attackAt + BOT.homeGuard }, (_, i) => place(s, "spearman", 1, 16, 8 + i));
    const cmds = botCommands(viewFor(s, 1));
    const marching = cmds.filter((c) => c.type === "move" && c.x > 30).flatMap((c) => ("units" in c ? c.units : []));
    expect(marching).toHaveLength(BOT.attackAt);
    // the guard is the spearmen nearest the hall, and none of them march
    const guard = sp.slice().sort((a, b) => Math.max(Math.abs(a.x - 6), Math.abs(a.y - 15)) - Math.max(Math.abs(b.x - 6), Math.abs(b.y - 15)) || a.id - b.id).slice(0, BOT.homeGuard);
    for (const g of guard) expect(marching).not.toContain(g.id);
  });

  it("brings the wave home when its hall is attacked", () => {
    const s = createMatch("scroll-1", 1);
    clearUnits(s);
    const wave = Array.from({ length: 6 }, (_, i) => place(s, "spearman", 1, 70, 8 + i));
    const raider = place(s, "labourer", 0, 9, 15); // at the hall's walls
    const cmds = botCommands(viewFor(s, 1));
    const recall = cmds.filter((c) => c.type === "attack" && c.target === raider.id);
    expect(recall.length).toBeGreaterThan(0);
    for (const w of wave) expect(ordered(recall).has(w.id)).toBe(true);
  });

  it("gathers a wave at the muster point before it crosses the river", () => {
    const s = createMatch("scroll-1", 1);
    clearUnits(s);
    const lead = Array.from({ length: 4 }, (_, i) => place(s, "spearman", 1, 49, 8 + i));
    const straggler = place(s, "spearman", 1, 30, 20);
    for (const u of [...lead, straggler]) u.task = "idle";
    const crossing = (cmds: Command[]) => cmds.filter((c) => c.type === "move" && c.x > 57);
    // a straggler far behind: nobody crosses yet; it is sent to the muster point
    let cmds = botCommands(viewFor(s, 1));
    expect(crossing(cmds)).toEqual([]);
    expect(cmds.some((c) => c.type === "move" && c.units.includes(straggler.id) && c.x < 54)).toBe(true);
    // once it has caught up, they cross together
    straggler.x = 48;
    straggler.y = 12;
    cmds = botCommands(viewFor(s, 1));
    const over = ordered(crossing(cmds));
    for (const u of [...lead, straggler]) expect(over.has(u.id)).toBe(true);
  });
});
