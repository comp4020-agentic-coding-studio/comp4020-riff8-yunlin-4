import { describe, expect, it } from "vitest";
import { createMatch, JIAOLONG, PIXIU, RELIC_BONUS, viewFor, type SimEvent } from "../src/sim/index.ts";
import { byKind, clearUnits, command, place, run } from "../src/sim/testing.ts";
import { MAPS } from "../src/sim/map.ts";
import { CREATURE_LINES, CREATURE_WHERE, RULES_TEXT } from "../src/rules-text.ts";

const def = MAPS["scroll-1"];
const terrainAt = (x: number, y: number) => def.terrain[y * def.width + x];
const fresh = () => {
  const s = createMatch("scroll-1", 7);
  clearUnits(s);
  return s;
};
const aggro = (ev: SimEvent[], kind: string) => ev.filter((e) => e.type === "creature.aggro" && e.kind === kind);

describe("年 nian", () => {
  it(CREATURE_LINES.nian, () => {
    const s = fresh();
    const nian = byKind(s, "nian");
    const post = [nian.x, nian.y];
    // a labourer just outside the leash is left alone
    const far = place(s, "labourer", 1, 47, 6);
    expect(aggro(run(s, 20), "nian")).toEqual([]);
    expect(far.hp).toBe(far.maxHp);
    // three spearmen walk up to the grove: it wakes, says so once, and fights
    const sp = [0, 1, 2].map((i) => place(s, "spearman", 1, 46, 4 + i));
    const ids = sp.map((e) => e.id);
    const ev = command(s, 1, { type: "move", units: ids, x: 52, y: 4 }, 40);
    expect(aggro(ev, "nian")).toHaveLength(1);
    expect(aggro(ev, "nian")[0]).toMatchObject({ targetSeat: 1, creature: nian.id });
    expect(sp.some((e) => e.hp < e.maxHp)).toBe(true);
    expect(nian.hp).toBeLessThan(nian.maxHp);
    // they flee west past the leash: it doesn't follow, goes home and heals
    command(s, 1, { type: "move", units: ids.filter((id) => s.entities.some((e) => e.id === id)), x: 30, y: 4 }, 80);
    expect([nian.x, nian.y]).toEqual(post);
    expect(nian.hp).toBe(nian.maxHp);
    expect(nian.task).toBe("asleep");
  });

  it("kills a lone labourer at its grove, as a creature", () => {
    const s = fresh();
    const lab = place(s, "labourer", 0, 52, 4);
    const ev = run(s, 60);
    expect(ev.find((e) => e.type === "unit.died")).toMatchObject({ unit: lab.id, cause: "creature", byKind: "nian", bySide: "wild", side: 0 });
  });

  it("can be beaten by eight spearmen", () => {
    const s = fresh();
    const nian = byKind(s, "nian");
    const sp = Array.from({ length: 8 }, (_, i) => place(s, "spearman", 0, 56 + (i % 2), 5 + Math.floor(i / 2)));
    command(s, 0, { type: "attack", units: sp.map((e) => e.id), target: nian.id }, 300);
    expect(s.entities.includes(nian)).toBe(false);
  });
});

describe("蛟龍 jiaolong", () => {
  it(CREATURE_LINES.jiaolong, () => {
    const s = fresh();
    s.entities = s.entities.filter((e) => e.kind !== "pixiu"); // it patrols this ford
    const j = byKind(s, "jiaolong");
    j.x = 54;
    j.y = 7;
    // a labourer waiting on the north ford
    const lab = place(s, "labourer", 0, 55, 10);
    expect(terrainAt(55, 10)).toBe("f");
    const ev = run(s, 2);
    expect(aggro(ev, "jiaolong")).toHaveLength(1);
    expect(lab.hp).toBe(lab.maxHp - JIAOLONG.strikeDamage);
    // seen while it strikes
    expect(viewFor(s, 0).entities.some((e) => e.id === j.id)).toBe(true);
    // then gone, and harmless, while it dives
    run(s, JIAOLONG.surfacedTicks + 1);
    expect(viewFor(s, 0).entities.some((e) => e.id === j.id)).toBe(false);
    const hp = lab.hp;
    run(s, JIAOLONG.diveTicks - 4);
    expect(lab.hp).toBe(hp);
    // and after the dive it strikes again, and kills
    const more = run(s, 20);
    expect(more.find((e) => e.type === "unit.died")).toMatchObject({ unit: lab.id, cause: "creature", byKind: "jiaolong" });
  });

  it("never leaves the water, however it hunts", () => {
    const s = fresh();
    const j = byKind(s, "jiaolong");
    place(s, "labourer", 1, 53, 22); // beside the south ford
    place(s, "labourer", 0, 58, 9);
    for (let t = 0; t < 400; t++) {
      run(s, 1);
      expect("rf").toContain(terrainAt(j.x, j.y));
    }
  });

  it("leaves units away from the water alone", () => {
    const s = fresh();
    const j = byKind(s, "jiaolong");
    j.x = 54;
    j.y = 26;
    const lab = place(s, "labourer", 0, 50, 26);
    run(s, 100);
    expect(lab.hp).toBe(lab.maxHp);
  });
});

describe("麒麟 qilin", () => {
  it(CREATURE_LINES.qilin, () => {
    // labourers gather beside the glade faster than at an ordinary grove
    const gathered = (x: number, y: number, gx: number, gy: number, seat: 0 | 1) => {
      const s = fresh();
      s.entities = s.entities.filter((e) => e.kind !== "hall"); // nobody carries home
      const lab = place(s, "labourer", seat, x, y);
      command(s, seat, { type: "gather", units: [lab.id], x: gx, y: gy }, 12);
      return { s, lab };
    };
    const slow = gathered(29, 15, 30, 15, 1).lab.carrying;
    const fast = gathered(48, 29, 47, 29, 1).lab.carrying;
    expect(fast).toBeGreaterThanOrEqual(slow * 2 - 1);

    // labourers in the glade are left alone
    const s = fresh();
    const q = byKind(s, "qilin");
    const lab = place(s, "labourer", 1, 50, 29);
    expect(terrainAt(50, 29)).toBe("l");
    expect(aggro(run(s, 40), "qilin")).toEqual([]);
    expect(lab.hp).toBe(lab.maxHp);
    // a spearman steps into the glade: it fights that side
    const sp = place(s, "spearman", 1, 48, 25);
    command(s, 1, { type: "move", units: [sp.id], x: 52, y: 29 });
    const ev = run(s, 60);
    expect(aggro(ev, "qilin")).toHaveLength(1);
    expect(aggro(ev, "qilin")[0]).toMatchObject({ targetSeat: 1 });
    expect(sp.hp + lab.hp).toBeLessThan(sp.maxHp + lab.maxHp);
    // seat 0's labourer arriving now is not its quarrel
    const other = place(s, "labourer", 0, 60, 30);
    run(s, 20);
    expect(other.hp).toBe(other.maxHp);
    // seat 1 leaves: it is at peace again
    const left = [sp, lab].filter((e) => s.entities.includes(e)).map((e) => e.id);
    if (left.length) command(s, 1, { type: "move", units: left, x: 40, y: 20 }, 60);
    expect(q.provoked).toEqual([false, false]);
    expect(q.targetId).toBe(0);
  });

  it("fights back when attacked, even by labourers", () => {
    const s = fresh();
    const q = byKind(s, "qilin");
    const lab = place(s, "labourer", 0, q.x + 1, q.y);
    const ev = command(s, 0, { type: "attack", units: [lab.id], target: q.id }, 30);
    expect(aggro(ev, "qilin")).toHaveLength(1);
    expect(lab.hp).toBeLessThan(lab.maxHp);
  });
});

describe("貔貅 pixiu", () => {
  const relic = def.relic[0];
  const relicDist = (x: number, y: number) => Math.min(...def.relic.map(([rx, ry]) => Math.max(Math.abs(rx - x), Math.abs(ry - y))));

  it(CREATURE_LINES.pixiu, () => {
    const s = fresh();
    const p = byKind(s, "pixiu");
    // it walks its loop: after a while it has been both near and away
    const seen = new Set<string>();
    for (let t = 0; t < 400; t++) {
      run(s, 1);
      seen.add(relicDist(p.x, p.y) <= PIXIU.away ? "near" : "away");
    }
    expect(seen).toEqual(new Set(["near", "away"]));
    // wait until it is far, then a labourer steps onto the relic
    run(s, 400, () => relicDist(p.x, p.y) > PIXIU.away);
    const lab = place(s, "labourer", 0, relic[0], relic[1] - 1);
    const ev = command(s, 0, { type: "move", units: [lab.id], x: relic[0], y: relic[1] }, 10);
    expect(ev.filter((e) => e.type === "relic.claimed")).toEqual([{ type: "relic.claimed", tick: expect.any(Number), seat: 0, grain: RELIC_BONUS }]);
    expect(s.relicClaimed).toBe(true);
    expect(viewFor(s, 1).relicClaimed).toBe(true);
    // once per match: a second labourer gets nothing
    const grain = s.grain[1];
    const two = place(s, "labourer", 1, relic[0], relic[1] + 1);
    command(s, 1, { type: "move", units: [two.id], x: relic[0], y: relic[1] }, 10);
    expect(s.grain[1]).toBe(grain);
  });

  it("attacks a labourer on the relic while it is near, and no bonus is paid", () => {
    const s = fresh();
    const p = byKind(s, "pixiu");
    run(s, 400, () => relicDist(p.x, p.y) <= 1);
    const lab = place(s, "labourer", 1, relic[0], relic[1]);
    const ev = run(s, 30);
    expect(aggro(ev, "pixiu")[0]).toMatchObject({ targetSeat: 1, target: lab.id });
    expect(ev.some((e) => e.type === "relic.claimed")).toBe(false);
    expect(lab.hp).toBeLessThan(lab.maxHp);
  });

  it("is away from the relic for a real window every loop, so the relic can be claimed from a ford (F-4)", () => {
    const s = fresh();
    const loop = s.pixiuLoop;
    const awayTiles = loop.filter((i) => relicDist(i % s.width, Math.floor(i / s.width)) > PIXIU.away).length;
    expect(awayTiles / loop.length).toBeGreaterThanOrEqual(1 / 3);
    // the explorer's repro, from the east bank by the north ford: starting at
    // every point of the loop, a labourer walked to the relic claims it often
    let claims = 0;
    const tries = 24;
    for (let k = 0; k < tries; k++) {
      const t = createMatch("scroll-1", 1);
      clearUnits(t);
      run(t, Math.floor((k * loop.length * PIXIU.speed) / tries));
      const lab = place(t, "labourer", 0, 60, 13);
      const ev = command(t, 0, { type: "move", units: [lab.id], x: 56, y: 15 }, 80);
      if (ev.some((e) => e.type === "relic.claimed")) claims++;
    }
    expect(claims).toBeGreaterThanOrEqual(tries / 2);
    // the relic is the two island tiles x 55–56, y 15–16, reachable from both banks
    expect(def.relic).toEqual([[55, 15], [56, 15], [55, 16], [56, 16]]);
  });

  it("attacks units it meets on its route, then goes back to it", () => {
    const s = fresh();
    const p = byKind(s, "pixiu");
    const loop = new Set(s.pixiuLoop);
    const lab = place(s, "labourer", 0, 54, 9); // on the north ford, on its route
    const ev = run(s, 200, (all) => all.some((e) => e.type === "unit.died"));
    expect(ev.find((e) => e.type === "unit.died")).toMatchObject({ unit: lab.id, cause: "creature" });
    run(s, 60);
    expect(loop.has(p.y * s.width + p.x)).toBe(true);
  });
});

describe("rules text", () => {
  it("states each creature's one-sentence rule and the costs", () => {
    for (const line of Object.values(CREATURE_LINES)) {
      expect(RULES_TEXT).toContain(line);
      expect(line.split(/[.!?](\s|$)/).filter((x) => x.trim()).length).toBe(1);
    }
    expect(RULES_TEXT).toMatch(/east/);
  });

  it("says where each creature lives and where the relic is (F-6)", () => {
    for (const k of Object.keys(CREATURE_LINES) as (keyof typeof CREATURE_LINES)[]) {
      expect(RULES_TEXT).toContain(`${CREATURE_LINES[k]} Where: ${CREATURE_WHERE[k]}`);
      expect(CREATURE_WHERE[k].split(/[.!?](\s|$)/).filter((x) => x.trim()).length).toBe(1);
    }
    expect(CREATURE_WHERE.nian).toMatch(/head of the river/);
    expect(CREATURE_WHERE.qilin).toMatch(/river's mouth/);
    const [rx, ry] = def.relic[0];
    expect(RULES_TEXT).toContain(`x ${rx}–${rx + 1}, y ${ry}–${ry + 1}`);
    expect(RULES_TEXT).not.toMatch(/[<>]/);
  });
});
