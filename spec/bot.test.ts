import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { botCommands, createBot } from "../src/bot.ts";
import { createMatch, validateCommand, viewFor } from "../src/sim/index.ts";

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
});
