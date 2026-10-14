import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createMatch } from "../src/sim/index.ts";
import { MatchStream, newVisitor, ownEntities, send, startServer, status } from "./helpers-match.ts";
import type { MatchServer, Raw, ViewEntity } from "./helpers-match.ts";
import { until } from "./helpers.ts";
import type { Visitor } from "./helpers.ts";

// ADR 0002's "Who may see and change what", row by row, over plain HTTP against
// servers this spec spawns itself (manual ticks, temp DB). The table is the
// source of truth: where the code disagrees, the test is written to the table.
//
// Roles: owner (seat 0 / the draft's writer), otherSeat (seat 1 / another
// visitor), third (holds a seal, no seat), noCookie, forged (`seal=not-a-uuid`).
// A stranger (noCookie, forged) is "refused": the server answers 409 no-seal
// before it looks at the route, so on rows whose refusal column doesn't name
// no-seal either that or the row's own refusal is accepted (ADR: "a forged
// cookie is treated as a stranger"; both are a refusal with nothing revealed).

type Role = "owner" | "otherSeat" | "third" | "noCookie" | "forged";
interface Exp {
  status: number;
  error?: string;
}
const NO_SEAL: Exp = { status: 409, error: "no-seal" };
const FORGED = "seal=not-a-uuid";

let s: MatchServer;
let who: Record<Role, Visitor | string | undefined>;
const cookieOf = (r: Role): string | undefined => {
  const v = who[r];
  return typeof v === "string" ? v : v?.cookie;
};

function matches(r: Raw, e: Exp): boolean {
  return r.status === e.status && (e.error === undefined || r.data.error === e.error);
}
function check(name: string, r: Raw, ...alts: Exp[]): void {
  expect(
    alts.some((e) => matches(r, e)),
    `${name}: got ${r.status} ${r.text}, table says ${alts.map((a) => `${a.status}${a.error ? " " + a.error : ""}`).join(" or ")}`,
  ).toBe(true);
}
const stranger = (role: Role): boolean => role === "noCookie" || role === "forged";
// What a non-owner role may expect from a row whose table refusal is `own`.
const refused = (role: Role, own: Exp): Exp[] => (stranger(role) ? [own, NO_SEAL] : [own]);

// ---- commands are throttled client-side: the server allows ten a second per seat ----
const sent = new Map<string, number[]>();
async function cmd(role: Role, body: unknown): Promise<Raw> {
  const key = cookieOf(role) ?? "-";
  for (;;) {
    const now = Date.now();
    const recent = (sent.get(key) ?? []).filter((t) => now - t < 1000);
    if (recent.length < 8) {
      recent.push(now);
      sent.set(key, recent);
      break;
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  return send(s.base, "/api/match/command", body, who[role]);
}
const post = (role: Role, path: string, body: unknown = {}): Promise<Raw> => send(s.base, path, body, who[role]);
const roles: Role[] = ["owner", "otherSeat", "third", "noCookie", "forged"];

async function get(path: string, role: Role | undefined): Promise<{ status: number; text: string; data: Record<string, unknown> }> {
  const c = role ? cookieOf(role) : undefined;
  const res = await fetch(new URL(path, s.base), { headers: c ? { Cookie: c } : {} });
  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    // html
  }
  return { status: res.status, text, data };
}

beforeAll(async () => {
  s = await startServer();
  const [a, b, c] = [await newVisitor(s.base), await newVisitor(s.base), await newVisitor(s.base)];
  who = { owner: a, otherSeat: b, third: c, noCookie: undefined, forged: FORGED };
});
afterAll(() => s.stop());

const PUBLIC_KEYS = ["status", "matchId", "mapId", "seed", "seatsOpen", "you", "manualTicks", "view", "result"];
const noLeak = (text: string): void => {
  for (const r of ["owner", "otherSeat", "third"] as const) expect(text).not.toContain((who[r] as Visitor).token);
};

describe("no match yet", () => {
  for (const role of roles) {
    it(`GET /api/match × ${role}: status none, nothing else`, async () => {
      const r = await get("/api/match", role === "noCookie" ? undefined : role);
      expect(r.status).toBe(200);
      expect(r.data).toMatchObject({ status: "none", you: null, view: null, result: null });
    });
    it(`POST /api/match/join × ${role}: 409 no-match (strangers: no-seal)`, async () => {
      check("join", await post(role, "/api/match/join"), ...refused(role, { status: 409, error: "no-match" }));
    });
    it(`POST /api/match/bot × ${role}: 409 no-match (strangers: no-seal)`, async () => {
      check("bot", await post(role, "/api/match/bot"), ...refused(role, { status: 409, error: "no-match" }));
    });
    it(`POST /api/match/command × ${role}: 409 no-match (strangers: no-seal)`, async () => {
      check("command", await cmd(role, { type: "stop", units: [1] }), ...refused(role, { status: 409, error: "no-match" }));
    });
  }
  it("POST /api/match/chronicle × third: 404 missing for a match that never was", async () => {
    check("chronicle", await post("third", "/api/match/chronicle", { matchId: 99 }), { status: 404, error: "missing" });
  });
});

describe("waiting: seat 0 taken, seat 1 open", () => {
  it("POST /api/match × noCookie, forged: refused, no match created", async () => {
    check("create noCookie", await post("noCookie", "/api/match"), NO_SEAL);
    check("create forged", await post("forged", "/api/match"), NO_SEAL);
    expect((await status(s.base)).status).toBe("none");
  });
  it("POST /api/match × owner (visitor): takes seat 0, 201", async () => {
    const r = await post("owner", "/api/match");
    expect(r.status).toBe(201);
    expect(r.data).toMatchObject({ status: "waiting", you: 0, seatsOpen: [1] });
  });
  it("POST /api/match × owner again: 409 already-seated", async () => {
    check("create", await post("owner", "/api/match"), { status: 409, error: "already-seated" });
  });
  for (const role of ["otherSeat", "third"] as const) {
    it(`POST /api/match × ${role}: 409 match-busy`, async () => {
      check("create", await post(role, "/api/match"), { status: 409, error: "match-busy" });
    });
  }
  for (const role of ["noCookie", "forged"] as const) {
    it(`POST /api/match × ${role}: refused (no-seal)`, async () => {
      check("create", await post(role, "/api/match"), NO_SEAL);
    });
  }
  it("POST /api/match/join × owner: 409 already-seated", async () => {
    check("join", await post("owner", "/api/match/join"), { status: 409, error: "already-seated" });
  });
  for (const role of ["noCookie", "forged"] as const) {
    it(`POST /api/match/join × ${role}: 409 no-seal`, async () => {
      check("join", await post(role, "/api/match/join"), NO_SEAL);
    });
    it(`POST /api/match/bot × ${role}: refused`, async () => {
      check("bot", await post(role, "/api/match/bot"), NO_SEAL, { status: 403, error: "not-yours" });
    });
  }
  for (const role of ["otherSeat", "third"] as const) {
    it(`POST /api/match/bot × ${role}: 403 not-yours`, async () => {
      check("bot", await post(role, "/api/match/bot"), { status: 403, error: "not-yours" });
    });
  }
  for (const role of roles) {
    it(`GET /api/match × ${role} while waiting: ${role === "owner" ? "own seat, no view yet" : "status only"}`, async () => {
      const r = await get("/api/match", role === "noCookie" ? undefined : role);
      expect(r.data).toMatchObject({ status: "waiting", seatsOpen: [1], view: null, result: null });
      expect(r.data.you).toBe(role === "owner" ? 0 : null);
      expect(Object.keys(r.data).every((k) => PUBLIC_KEYS.includes(k))).toBe(true);
      noLeak(r.text);
    });
    it(`POST /api/match/command × ${role} while waiting: 409 no-match (strangers: no-seal)`, async () => {
      check("command", await cmd(role, { type: "stop", units: [1] }), ...refused(role, { status: 409, error: "no-match" }));
    });
  }
  it("POST /api/match/step × third: 403 not-seated... but nothing is playing yet: 409 no-match", async () => {
    check("step", await post("third", "/api/match/step", { ticks: 1 }), { status: 409, error: "no-match" });
  });
  it("GET /match/events × third, noCookie while waiting: status frames only", async () => {
    for (const role of ["third", "noCookie"] as const) {
      const st = new MatchStream(s.base, role === "third" ? (who.third as Visitor) : undefined);
      await st.waitFor("status");
      await st.close();
      expect(st.of("status")[0]).toMatchObject({ status: "waiting", you: null, view: null });
      expect(st.frames.every((f) => f.type === "status")).toBe(true);
    }
  });
  it("POST /api/match/join × otherSeat: takes seat 1", async () => {
    const r = await post("otherSeat", "/api/match/join");
    expect(r.status).toBe(200);
    expect(r.data).toMatchObject({ status: "playing", you: 1 });
  });
  it("POST /api/match/join × third: 409 match-full", async () => {
    check("join", await post("third", "/api/match/join"), { status: 409, error: "match-full" });
  });
  it("POST /api/match/bot × owner with seat 1 taken: 409 match-full", async () => {
    check("bot", await post("owner", "/api/match/bot"), { status: 409, error: "match-full" });
  });
});

describe("playing", () => {
  const creatureId = createMatch("scroll-1", 1).entities.find((e) => e.side === "wild")!.id;
  const GHOST = 99999;
  let mine: Record<"owner" | "otherSeat", ViewEntity[]>;
  let view0: { width: number; height: number; ground: string; entities: ViewEntity[] };
  beforeAll(async () => {
    mine = { owner: await ownEntities(s.base, who.owner as Visitor), otherSeat: await ownEntities(s.base, who.otherSeat as Visitor) };
    view0 = (await status(s.base, who.owner as Visitor)).view as typeof view0;
  });

  const idOf = (seat: "owner" | "otherSeat", kind: string): number => mine[seat].find((e) => e.kind === kind)!.id;

  // GET /api/match: view only for players
  for (const role of roles) {
    it(`GET /api/match × ${role}: ${role === "owner" || role === "otherSeat" ? "own fogged view" : "status only"}`, async () => {
      const r = await get("/api/match", role === "noCookie" ? undefined : role);
      expect(r.data.status).toBe("playing");
      expect(r.data.result).toBeNull();
      expect(r.data.seatsOpen).toEqual([]);
      expect(Object.keys(r.data).filter((k) => !PUBLIC_KEYS.includes(k) && k !== "recentEvents")).toEqual([]);
      noLeak(r.text);
      if (role === "owner" || role === "otherSeat") {
        const seat = role === "owner" ? 0 : 1;
        expect(r.data.you).toBe(seat);
        expect((r.data.view as { seat: number }).seat).toBe(seat);
        const ids = (r.data.view as { entities: ViewEntity[] }).entities.map((e) => e.id);
        // a fogged enemy's id is nowhere in the answer
        const foe = idOf(role === "owner" ? "otherSeat" : "owner", "hall");
        expect(ids).not.toContain(foe);
      } else {
        expect(r.data.you).toBeNull();
        expect(r.data.view).toBeNull();
        expect(r.data).not.toHaveProperty("recentEvents");
        expect(r.text).not.toContain("entities");
      }
    });
  }

  // POST /api/match/command: every command type against every kind of named piece.
  let gatherAt: { x: number; y: number } | null = null;
  let buildAt: { x: number; y: number } | null = null;
  const findGrove = (): { x: number; y: number } | null => {
    for (let i = 0; i < view0.ground.length; i++) if (view0.ground[i]!.toLowerCase() === "g") return { x: i % view0.width, y: Math.floor(i / view0.width) };
    return null;
  };
  const findPlain = (): { x: number; y: number } | null => {
    const busy = (x: number, y: number) => view0.entities.some((e) => Math.abs(e.x - x) <= 3 && Math.abs(e.y - y) <= 3);
    for (let y = 0; y < view0.height - 1; y++) {
      for (let x = 0; x < view0.width - 1; x++) {
        const ok = [0, 1].every((dy) => [0, 1].every((dx) => view0.ground[(y + dy) * view0.width + x + dx] === "P"));
        if (ok && !busy(x, y)) return { x, y };
      }
    }
    return null;
  };
  beforeAll(() => {
    gatherAt = findGrove();
    buildAt = findPlain();
  });

  type Ref = "own" | "enemy" | "creature" | "nonexistent";
  const REFS: Ref[] = ["own", "enemy", "creature", "nonexistent"];
  const idFor = (commander: "owner" | "otherSeat", ref: Ref, kind: string): number => {
    const foe = commander === "owner" ? "otherSeat" : "owner";
    return ref === "own" ? idOf(commander, kind) : ref === "enemy" ? idOf(foe, kind) : ref === "creature" ? creatureId : GHOST;
  };
  const NOT_YOURS: Exp = { status: 422, error: "not-yours" };
  const notYoursBodies: Record<string, string[]> = {};
  const note = (key: string, r: Raw): void => {
    (notYoursBodies[key] ??= []).push(`${r.status}|${r.type}|${r.text}`);
  };

  // [row name, builder from commander+ref, expected when the named piece is the commander's own]
  const rows: [string, (c: "owner" | "otherSeat", ref: Ref) => unknown, Exp, string][] = [
    ["move", (c, ref) => ({ type: "move", units: [idFor(c, ref, "labourer")], x: 10, y: 10 }), { status: 202 }, "labourer"],
    ["stop", (c, ref) => ({ type: "stop", units: [idFor(c, ref, "labourer")] }), { status: 202 }, "labourer"],
    ["gather", (c, ref) => ({ type: "gather", units: [idFor(c, ref, "labourer")], x: gatherAt?.x ?? 0, y: gatherAt?.y ?? 0 }), { status: 202 }, "labourer"],
    ["build", (c, ref) => ({ type: "build", units: [idFor(c, ref, "labourer")], building: "barracks", x: buildAt?.x ?? 0, y: buildAt?.y ?? 0 }), { status: 202 }, "labourer"],
    ["train", (c, ref) => ({ type: "train", building: idFor(c, ref, "hall"), unit: "labourer" }), { status: 202 }, "hall"],
  ];
  for (const [name, build, ownExp] of rows) {
    for (const commander of ["owner", "otherSeat"] as const) {
      for (const ref of REFS) {
        const expected = ref === "own" ? ownExp : NOT_YOURS;
        it(`command ${name} × ${commander} naming ${ref}: ${expected.status}${expected.error ? " " + expected.error : ""}`, async () => {
          // the own-gather/build cases need a grove / a plain tile in view for the commander
          if (ref === "own" && commander === "otherSeat" && (name === "gather" || name === "build")) return;
          const r = await cmd(commander, build(commander, ref));
          check(`${name}/${commander}/${ref}`, r, expected);
          if (ref !== "own") {
            if (r.status === 422) expect(r.data).toEqual({ error: "not-yours", message: "no such unit of yours" });
            note(`${name}|${commander}`, r);
          }
        });
      }
    }
    it(`command ${name}: not-yours bodies for enemy, creature and nonexistent are byte-identical`, () => {
      for (const commander of ["owner", "otherSeat"] as const) {
        const all = notYoursBodies[`${name}|${commander}`] ?? [];
        expect(all).toHaveLength(3);
        for (const x of all) expect(x).toBe(all[0]);
      }
    });
    for (const role of ["third", "noCookie", "forged"] as const) {
      it(`command ${name} × ${role}: 403 not-seated whatever it names (strangers: no-seal)`, async () => {
        const bodies = new Set<string>();
        for (const ref of REFS) {
          const r = await cmd(role, build("owner", ref));
          check(`${name}/${role}/${ref}`, r, ...refused(role, { status: 403, error: "not-seated" }));
          bodies.add(r.text);
        }
        expect(bodies.size, "no-seat refusals must not vary with what was named").toBe(1);
      });
    }
  }

  // attack: the units are the commander's; the target may be anything, and a
  // target not in view is answered as one that doesn't exist.
  for (const commander of ["owner", "otherSeat"] as const) {
    for (const ref of ["enemy", "creature", "nonexistent"] as const) {
      it(`command attack × ${commander} naming ${ref} as its unit: 422 not-yours`, async () => {
        const r = await cmd(commander, { type: "attack", units: [idFor(commander, ref, "labourer")], target: idFor(commander, "enemy", "hall") });
        check("attack", r, NOT_YOURS);
        note(`attack-units|${commander}`, r);
      });
    }
    it(`command attack: not-yours bodies for ${commander} are byte-identical`, () => {
      const all = notYoursBodies[`attack-units|${commander}`] ?? [];
      expect(all).toHaveLength(3);
      for (const x of all) expect(x).toBe(all[0]);
    });
    it(`command attack × ${commander} on a fogged enemy, a creature, a nonexistent id: identical 422 invalid`, async () => {
      const units = [idFor(commander, "own", "labourer")];
      const answers: string[] = [];
      for (const ref of ["enemy", "creature", "nonexistent"] as const) {
        const r = await cmd(commander, { type: "attack", units, target: idFor(commander, ref, "hall") });
        check("attack target", r, { status: 422 });
        answers.push(`${r.status}|${r.type}|${r.text}`);
      }
      for (const a of answers) expect(a).toBe(answers[0]);
      expect(JSON.parse(answers[0]!.split("|").slice(2).join("|")).error).not.toBe("not-yours-leak");
    });
    it(`command attack × ${commander} on its own piece: refused, not accepted`, async () => {
      const r = await cmd(commander, { type: "attack", units: [idFor(commander, "own", "labourer")], target: idFor(commander, "own", "hall") });
      expect(r.status).toBe(422);
    });
  }
  for (const role of ["third", "noCookie", "forged"] as const) {
    it(`command attack × ${role}: 403 not-seated (strangers: no-seal)`, async () => {
      check("attack", await cmd(role, { type: "attack", units: [idOf("owner", "labourer")], target: idOf("otherSeat", "hall") }), ...refused(role, { status: 403, error: "not-seated" }));
    });
  }
  it("command × owner: malformed is 400, not an ownership answer", async () => {
    check("malformed", await cmd("owner", { type: "fly" }), { status: 400, error: "malformed" });
  });
  it("own gather/build had a grove and a plain tile in view to aim at", () => {
    expect(gatherAt).not.toBeNull();
    expect(buildAt).not.toBeNull();
  });

  // chronicle before the end
  it("POST /api/match/chronicle × owner on a live match: 409 not-ended", async () => {
    const id = (await status(s.base)).matchId;
    check("chronicle", await post("owner", "/api/match/chronicle", { matchId: id }), { status: 409, error: "not-ended" });
  });
  it("POST /api/match/chronicle × third on a live match: 403 not-yours", async () => {
    const id = (await status(s.base)).matchId;
    check("chronicle", await post("third", "/api/match/chronicle", { matchId: id }), { status: 403, error: "not-yours" });
  });
  for (const role of ["noCookie", "forged"] as const) {
    it(`POST /api/match/chronicle × ${role}: refused`, async () => {
      const id = (await status(s.base)).matchId;
      check("chronicle", await post(role, "/api/match/chronicle", { matchId: id }), NO_SEAL, { status: 403, error: "not-yours" });
    });
  }

  // step (manual-tick server): players only
  for (const role of ["third", "noCookie", "forged"] as const) {
    it(`POST /api/match/step × ${role} (manual server): 403 not-seated (strangers: no-seal)`, async () => {
      check("step", await post(role, "/api/match/step", { ticks: 1 }), ...refused(role, { status: 403, error: "not-seated" }));
    });
  }

  // stream: only seats get view/events
  it("GET /match/events: third, noCookie and forged get status frames only; seats get their own view", async () => {
    const streams = {
      owner: new MatchStream(s.base, who.owner as Visitor),
      otherSeat: new MatchStream(s.base, who.otherSeat as Visitor),
      third: new MatchStream(s.base, who.third as Visitor),
      noCookie: new MatchStream(s.base),
      forged: new MatchStream(s.base, { cookie: FORGED, token: "" }),
    };
    for (const st of Object.values(streams)) await st.waitFor("status");
    await until(() => streams.owner.of("view").length >= 1 && streams.otherSeat.of("view").length >= 1, 3000);
    const before = streams.owner.of("view").length;
    expect((await post("owner", "/api/match/step", { ticks: 8 })).status).toBe(200);
    await streams.owner.waitFor("view", before + 1);
    await streams.otherSeat.waitFor("view", 2);
    await new Promise((r) => setTimeout(r, 200));
    for (const [role, st] of Object.entries(streams)) {
      await st.close();
      expect(st.status, role).toBe(200);
      noLeak(st.raw);
    }
    for (const role of ["third", "noCookie", "forged"] as const) {
      expect(streams[role].frames.every((f) => f.type === "status"), `${role} frames: ${streams[role].frames.map((f) => f.type)}`).toBe(true);
      expect(streams[role].raw, role).not.toContain("entities");
    }
    expect(streams.owner.of("view").every((v) => v.seat === 0)).toBe(true);
    expect(streams.otherSeat.of("view").every((v) => v.seat === 1)).toBe(true);
    expect(streams.owner.of("view").length).toBeGreaterThan(0);
  });

  // forfeit
  for (const role of ["third", "noCookie", "forged"] as const) {
    it(`POST /api/match/forfeit × ${role}: 403 not-seated (strangers: no-seal), match goes on`, async () => {
      check("forfeit", await post(role, "/api/match/forfeit"), ...refused(role, { status: 403, error: "not-seated" }));
      expect((await status(s.base)).status).toBe("playing");
    });
  }
  it("POST /api/match/forfeit × owner: forfeits own seat only", async () => {
    const r = await post("owner", "/api/match/forfeit");
    expect(r.status).toBe(200);
    expect(r.data).toMatchObject({ status: "ended", you: 0 });
    expect(r.data.result).toMatchObject({ winner: 1, reason: "forfeit", youWon: false });
  });
});

describe("ended: results and chronicle belong to the two players", () => {
  for (const role of roles) {
    it(`GET /api/match × ${role}: ${role === "owner" || role === "otherSeat" ? "result present" : "status ended, no result"}`, async () => {
      const r = await get("/api/match", role === "noCookie" ? undefined : role);
      expect(r.data.status).toBe("ended");
      noLeak(r.text);
      if (role === "owner" || role === "otherSeat") {
        expect(r.data.result).toMatchObject({ winner: 1, reason: "forfeit", youWon: role === "otherSeat" });
      } else {
        expect(r.data.result).toBeNull();
        expect(r.data.you).toBeNull();
        expect(r.data.view).toBeNull();
        expect(r.text).not.toContain("chronicle");
      }
    });
  }
  for (const role of ["third", "noCookie", "forged"] as const) {
    it(`POST /api/match/command × ${role} after the end: 409 no-match (strangers: no-seal)`, async () => {
      check("command", await cmd(role, { type: "stop", units: [1] }), ...refused(role, { status: 409, error: "no-match" }));
    });
    it(`POST /api/match/forfeit × ${role} after the end: refused`, async () => {
      check("forfeit", await post(role, "/api/match/forfeit"), ...refused(role, { status: 409, error: "no-match" }), { status: 403, error: "not-seated" });
    });
  }
  let matchId: number;
  let sealedColophon: number;
  it("POST /api/match/chronicle × third: 403 not-yours; noCookie, forged: refused; nonexistent match: 404 missing", async () => {
    matchId = (await status(s.base)).matchId as number;
    check("third", await post("third", "/api/match/chronicle", { matchId }), { status: 403, error: "not-yours" });
    for (const role of ["noCookie", "forged"] as const) {
      check(role, await post(role, "/api/match/chronicle", { matchId }), NO_SEAL, { status: 403, error: "not-yours" });
    }
    check("missing", await post("owner", "/api/match/chronicle", { matchId: 99999 }), { status: 404, error: "missing" });
  });
  it("POST /api/match/chronicle × owner: seals once (201), then 409 sealed", async () => {
    const r = await post("owner", "/api/match/chronicle", { matchId });
    check("seal", r, { status: 201 });
    sealedColophon = r.data.id as number;
    check("again", await post("owner", "/api/match/chronicle", { matchId }), { status: 409, error: "sealed" });
  });
  it("POST /api/match/chronicle × otherSeat: seals its own, once", async () => {
    check("seal", await post("otherSeat", "/api/match/chronicle", { matchId }), { status: 201 });
    check("again", await post("otherSeat", "/api/match/chronicle", { matchId }), { status: 409, error: "sealed" });
  });
  for (const role of roles) {
    it(`GET /colophons/:id/fragment × ${role}: a sealed chronicle is public, 200`, async () => {
      const r = await get(`/colophons/${sealedColophon}/fragment`, role === "noCookie" ? undefined : role);
      expect(r.status).toBe(200);
      noLeak(r.text);
    });
  }
  it("a new match can be created by the third visitor once the old one has ended", async () => {
    check("create", await post("third", "/api/match"), { status: 201 });
    check("forfeit", await post("third", "/api/match/forfeit"), { status: 200 });
  });
});

describe("POST /api/match/step on a server not in manual mode", () => {
  let live: MatchServer;
  let a: Visitor;
  beforeAll(async () => {
    live = await startServer({ MATCH_MANUAL_TICKS: undefined });
    a = await newVisitor(live.base);
    await send(live.base, "/api/match", {}, a);
  });
  afterAll(() => live.stop());
  const cookies: Record<string, string | undefined> = { owner: undefined, third: undefined, noCookie: undefined, forged: FORGED };
  for (const role of ["owner", "third", "noCookie", "forged"] as const) {
    it(`step × ${role}: 404, as if the route did not exist`, async () => {
      const c = role === "owner" ? a : role === "third" ? await newVisitor(live.base) : cookies[role];
      const r = await send(live.base, "/api/match/step", { ticks: 1 }, c);
      expect(r.status).toBe(404);
      expect(r.data).toEqual({});
    });
  }
});

describe("the scroll's draft routes", () => {
  const stroke = { v: 1, points: [1, 1, 5, 5] };
  let writer: Visitor;
  let other: Visitor;
  let third: Visitor;
  let draftId: number;
  let abandonId: number;
  let sealedId: number;
  const drafts = (path: string, who?: Visitor | string, body: unknown = stroke) => send(s.base, path, body, who);
  const who3 = (role: Role): Visitor | string | undefined => (role === "owner" ? writer : role === "otherSeat" ? other : role === "third" ? third : role === "noCookie" ? undefined : FORGED);

  beforeAll(async () => {
    [writer, other, third] = [await newVisitor(s.base), await newVisitor(s.base), await newVisitor(s.base)];
  });

  for (const role of ["noCookie", "forged"] as const) {
    it(`POST /api/drafts × ${role}: 409 no-seal`, async () => {
      check("drafts", await drafts("/api/drafts", who3(role), {}), NO_SEAL);
    });
  }
  it("POST /api/drafts × visitor: opens own draft (201), a second call returns the same one (200)", async () => {
    const r = await drafts("/api/drafts", writer, {});
    check("open", r, { status: 201 });
    draftId = r.data.id as number;
    const again = await drafts("/api/drafts", writer, {});
    check("again", again, { status: 200 });
    expect(again.data.id).toBe(draftId);
    abandonId = (await drafts("/api/drafts", other, {})).data.id as number;
  });

  for (const action of ["strokes", "seal", "abandon"] as const) {
    const body = action === "seal" ? { body: "a line" } : action === "strokes" ? stroke : {};
    for (const role of ["otherSeat", "third", "noCookie", "forged"] as const) {
      it(`POST /api/colophons/:id/${action} × ${role} on someone's draft: 403 not-yours`, async () => {
        // a draft that isn't the role's own (otherSeat owns abandonId, so aim at the writer's)
        check(action, await drafts(`/api/colophons/${draftId}/${action}`, who3(role), body), { status: 403, error: "not-yours" });
      });
    }
    it(`POST /api/colophons/:id/${action} × owner on a nonexistent id: 404 missing`, async () => {
      check(action, await drafts(`/api/colophons/99999/${action}`, writer, body), { status: 404, error: "missing" });
    });
    for (const role of ["third", "noCookie", "forged"] as const) {
      it(`POST /api/colophons/:id/${action} × ${role} on a nonexistent id: 404 missing`, async () => {
        check(action, await drafts(`/api/colophons/99999/${action}`, who3(role), body), { status: 404, error: "missing" });
      });
    }
  }
  it("a refused stranger changed nothing: the draft still holds no strokes", async () => {
    const r = await drafts("/api/drafts", writer, {});
    expect(r.data.strokes).toBe(0);
  });
  it("POST /api/colophons/:id/strokes × owner: 201", async () => {
    check("strokes", await drafts(`/api/colophons/${draftId}/strokes`, writer), { status: 201 });
  });
  it("GET /colophons/:id/fragment × every role on a draft: 404 missing, byte-identical to a nonexistent id", async () => {
    const ghost = await get("/colophons/99999/fragment", undefined);
    expect(ghost.status).toBe(404);
    for (const role of ["owner", "otherSeat", "third", "noCookie", "forged"] as const) {
      const c = who3(role);
      const res = await fetch(new URL(`/colophons/${draftId}/fragment`, s.base), { headers: c ? { Cookie: typeof c === "string" ? c : c.cookie } : {} });
      const text = await res.text();
      expect(res.status, role).toBe(404);
      expect(JSON.parse(text).error, role).toBe("missing");
      expect(text, role).toBe(ghost.text);
    }
  });
  it("POST /api/colophons/:id/seal × owner: 200; then strokes/seal/abandon × owner: 409 sealed", async () => {
    check("seal", await drafts(`/api/colophons/${draftId}/seal`, writer, { body: "one line" }), { status: 200 });
    sealedId = draftId;
    for (const action of ["strokes", "seal", "abandon"] as const) {
      check(action, await drafts(`/api/colophons/${sealedId}/${action}`, writer, action === "seal" ? { body: "x" } : stroke), { status: 409, error: "sealed" });
    }
  });
  for (const role of ["otherSeat", "third", "noCookie", "forged"] as const) {
    it(`POST /api/colophons/:id/seal × ${role} on a sealed colophon: 403 not-yours (ownership before state)`, async () => {
      check("seal", await drafts(`/api/colophons/${sealedId}/seal`, who3(role), { body: "x" }), { status: 403, error: "not-yours" });
    });
  }
  for (const role of roles) {
    it(`GET /colophons/:id/fragment × ${role} on a sealed colophon: 200`, async () => {
      const c = who3(role);
      const res = await fetch(new URL(`/colophons/${sealedId}/fragment`, s.base), { headers: c ? { Cookie: typeof c === "string" ? c : c.cookie } : {} });
      await res.text();
      expect(res.status, role).toBe(200);
    });
  }
  it("POST /api/colophons/:id/abandon × owner: 200, then strokes × owner: 410 abandoned; fragment: 404 missing", async () => {
    check("abandon", await drafts(`/api/colophons/${abandonId}/abandon`, other, {}), { status: 200 });
    check("strokes", await drafts(`/api/colophons/${abandonId}/strokes`, other), { status: 410, error: "abandoned" });
    check("seal", await drafts(`/api/colophons/${abandonId}/seal`, other, { body: "x" }), { status: 410, error: "abandoned" });
    check("not-yours first", await drafts(`/api/colophons/${abandonId}/strokes`, third), { status: 403, error: "not-yours" });
    const f = await get(`/colophons/${abandonId}/fragment`, "owner");
    expect(f.status).toBe(404);
  });
  it("GET /events × third, noCookie: no seal token in the scroll stream", async () => {
    const { Stream } = await import("./helpers.ts");
    const st = new Stream(s.base, { Cookie: third.cookie });
    await st.opened();
    await st.close();
    expect(st.raw).not.toContain(writer.token);
    expect(st.raw).not.toContain(third.token);
  });
});
