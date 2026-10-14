import { describe, expect, it } from "vitest";
import { createMatch, validateCommand, MAX_UNITS_PER_COMMAND, POP_CAP, type SimState } from "../src/sim/index.ts";
import { byKind, place } from "../src/sim/testing.ts";

const NOT_YOURS = { ok: false, reason: "not-yours", detail: "no such unit of yours" };
const NOT_IN_VIEW = { ok: false, reason: "invalid", detail: "no such target in view" };

function setup() {
  const s = createMatch("scroll-1", 1);
  const mine = s.entities.filter((e) => e.side === 0 && e.kind === "labourer").map((e) => e.id);
  const theirs = s.entities.filter((e) => e.side === 1 && e.kind === "labourer").map((e) => e.id);
  return { s, mine, theirs, hall0: 1, hall1: 2 };
}

describe("validateCommand", () => {
  it("accepts a command for the seat's own units", () => {
    const { s, mine } = setup();
    expect(validateCommand(s, 0, { type: "move", units: mine, x: 90, y: 16 })).toEqual({
      ok: true,
      command: { type: "move", units: mine, x: 90, y: 16 },
    });
  });

  it("answers an enemy, creature, dead or nonexistent id identically", () => {
    const { s, mine, theirs } = setup();
    const nian = byKind(s, "nian").id;
    const dead = place(s, "labourer", 0, 90, 16);
    dead.hp = 0;
    for (const id of [theirs[0], nian, dead.id, 9999, 2 /* enemy hall */]) {
      expect(validateCommand(s, 0, { type: "move", units: [id], x: 90, y: 16 })).toEqual(NOT_YOURS);
      expect(validateCommand(s, 0, { type: "move", units: [...mine, id], x: 90, y: 16 })).toEqual(NOT_YOURS);
      // even when the rest of the command would be wrong in other ways
      expect(validateCommand(s, 0, { type: "build", units: [id], building: "barracks", x: 0, y: 0 })).toEqual(NOT_YOURS);
      expect(validateCommand(s, 0, { type: "train", building: id, unit: "spearman" })).toEqual(NOT_YOURS);
    }
  });

  it("rejects more than the cap, empty lists, duplicates and malformed shapes", () => {
    const { s, mine } = setup();
    const many = Array.from({ length: MAX_UNITS_PER_COMMAND + 1 }, (_, i) => i + 1);
    expect(validateCommand(s, 0, { type: "stop", units: many })).toMatchObject({ ok: false, reason: "too-many" });
    for (const raw of [
      null,
      "move",
      [],
      { type: "fly", units: mine },
      { type: "stop", units: [] },
      { type: "stop", units: [mine[0], mine[0]] },
      { type: "stop", units: [1.5] },
      { type: "stop", units: ["3"] },
      { type: "stop", units: [-3] },
      { type: "stop", units: mine, extra: 1 },
      { type: "move", units: mine, x: 1 },
      { type: "move", units: mine, x: "1", y: 2 },
      { type: "move", units: mine, x: 1.5, y: 2 },
      { type: "attack", units: mine, target: "2" },
      { type: "train", building: 1, unit: "dragon" },
      { type: "build", units: mine, building: "tower", x: 90, y: 20 },
    ]) {
      expect(validateCommand(s, 0, raw), JSON.stringify(raw)).toMatchObject({ ok: false, reason: "malformed" });
    }
  });

  it("rejects coordinates off the map rather than clamping them", () => {
    const { s, mine } = setup();
    for (const [x, y] of [[-1, 0], [112, 0], [0, 32], [0, -1]]) {
      expect(validateCommand(s, 0, { type: "move", units: mine, x, y })).toMatchObject({ ok: false, reason: "invalid" });
    }
  });

  it("rejects the wrong unit kind for an action", () => {
    const { s } = setup();
    const sp = place(s, "spearman", 0, 100, 16);
    expect(validateCommand(s, 0, { type: "build", units: [sp.id], building: "barracks", x: 100, y: 18 })).toMatchObject({ ok: false, reason: "invalid" });
    expect(validateCommand(s, 0, { type: "gather", units: [sp.id], x: 108, y: 8 })).toMatchObject({ ok: false, reason: "invalid" });
    expect(validateCommand(s, 0, { type: "train", building: 1, unit: "spearman" })).toMatchObject({ ok: false, reason: "invalid" });
  });

  it("rejects what the seat can't afford", () => {
    const { s, mine } = setup();
    s.grain[0] = 10;
    expect(validateCommand(s, 0, { type: "train", building: 1, unit: "labourer" })).toMatchObject({ ok: false, reason: "grain" });
    expect(validateCommand(s, 0, { type: "build", units: mine, building: "barracks", x: 100, y: 18 })).toMatchObject({ ok: false, reason: "grain" });
  });

  it("rejects training at the population cap, counting the queue", () => {
    const { s } = setup();
    s.grain[0] = 100000;
    const have = s.entities.filter((e) => e.side === 0 && e.kind === "labourer").length;
    for (let i = have; i < POP_CAP - 1; i++) place(s, "labourer", 0, 100, 20);
    s.entities.find((e) => e.id === 1)!.queue.push("labourer");
    expect(validateCommand(s, 0, { type: "train", building: 1, unit: "labourer" })).toMatchObject({ ok: false, reason: "pop-cap" });
  });

  it("answers an attack on a fogged enemy exactly as on one that doesn't exist", () => {
    const { s, mine, theirs, hall1 } = setup();
    const fogged = validateCommand(s, 0, { type: "attack", units: mine, target: theirs[0] });
    expect(fogged).toEqual(NOT_IN_VIEW);
    expect(validateCommand(s, 0, { type: "attack", units: mine, target: hall1 })).toEqual(NOT_IN_VIEW);
    expect(validateCommand(s, 0, { type: "attack", units: mine, target: 9999 })).toEqual(fogged);
    // the lurking jiaolong is "not in view" even with a unit beside it
    const j = byKind(s, "jiaolong");
    const scout = place(s, "spearman", 0, j.x + 2, j.y);
    expect(validateCommand(s, 0, { type: "attack", units: [scout.id], target: j.id })).toEqual(NOT_IN_VIEW);
    // and an enemy in view can be attacked
    const near = place(s, "labourer", 1, scout.x + 1, scout.y + 2);
    expect(validateCommand(s, 0, { type: "attack", units: [scout.id], target: near.id })).toMatchObject({ ok: true });
  });

  it("only builds on open plain ground in view", () => {
    const { s, mine }: { s: SimState; mine: number[] } = setup();
    expect(validateCommand(s, 0, { type: "build", units: mine, building: "barracks", x: 100, y: 18 })).toMatchObject({ ok: true });
    for (const [x, y] of [[104, 14] /* hall */, [108, 8] /* grove */, [20, 16] /* fogged */, [111, 31] /* off the edge */]) {
      expect(validateCommand(s, 0, { type: "build", units: mine, building: "barracks", x, y })).toMatchObject({ ok: false, reason: "invalid" });
    }
  });
});
