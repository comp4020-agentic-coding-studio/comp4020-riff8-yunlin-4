import { createServer } from "node:http";
import { readFile, readFileSync } from "node:fs";
import { extname } from "node:path";
import type { ServerResponse } from "node:http";
import {
  abandonDraft,
  abandonStaleDraft,
  addColophon,
  addStroke,
  createDraft,
  draftCount,
  getColophon,
  listColophons,
  listDrafts,
  openDraftFor,
  sealDraft,
  strokeCount,
  strokesFor,
} from "./db.ts";
import { sealToken } from "./cookies.ts";
import { renderEntry, renderIndex, renderPanel, renderReadme, MAX_BODY_LENGTH } from "./render.ts";
import { renderMarkdown } from "./markdown.ts";
import { currentEventId, openStream, publish } from "./events.ts";
import { isAbandoned, MAX_STROKES, parseStroke, STROKE_VERSION } from "./strokes.ts";
import { sealGlyph } from "./seal.ts";

const PORT = Number(process.env.PORT ?? 8080);
const README = readFileSync("README.md", "utf8");

const MIME: Record<string, string> = {
  ".avif": "image/avif",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
};

// More open drafts than this at once is not a gathering round a table; it
// also bounds what an unhurried scroll can be asked to hold in flight.
const MAX_OPEN_DRAFTS = 64;
// One person has one draft; this is for a household or a classroom behind
// one address, and stops one address taking every slot.
const MAX_DRAFTS_PER_IP = 6;
const draftsByIp = new Map<string, Set<number>>();

function forgetDraft(id: number): void {
  for (const [ip, ids] of draftsByIp) {
    if (ids.delete(id) && ids.size === 0) draftsByIp.delete(ip);
  }
}

// Fly's proxy sets Fly-Client-IP and overwrites any value a client sends.
export function clientIp(req: import("node:http").IncomingMessage): string {
  const fly = req.headers["fly-client-ip"];
  return (Array.isArray(fly) ? fly[0] : fly) ?? req.socket.remoteAddress ?? "unknown";
}
const SWEEP_MS = 30_000;

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}

// undefined for anything that isn't a JSON object within the size cap. The
// API only takes application/json, which a cross-site form can't send.
async function readJson(req: import("node:http").IncomingMessage): Promise<Record<string, unknown> | "large" | undefined> {
  if (!(req.headers["content-type"] ?? "").startsWith("application/json")) return undefined;
  const raw = await readBody(req);
  if (raw === undefined) return "large";
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

function sweepAbandoned(now = Date.now()): void {
  for (const d of listDrafts()) {
    if (isAbandoned(d.last_activity ?? d.created_at, now) && abandonStaleDraft(d.id)) {
      forgetDraft(d.id);
      publish({ type: "abandoned", data: { id: d.id } });
    }
  }
}
setInterval(sweepAbandoned, SWEEP_MS).unref();

// A URL-encoded 320-character colophon body never comes close to this — it's
// a hard ceiling against a request that skips the form's own maxlength, not a
// tuned limit. Checked as bytes arrive, not after the fact: buffering an
// unbounded body into memory first (whatever a crafted Content-Length or a
// chunked request without one claims) is itself the vulnerability on a
// single-machine deploy with a tight memory ceiling.
const MAX_REQUEST_BODY_BYTES = 16 * 1024;

// Once the cap is crossed, later chunks are read and discarded rather than
// accumulated — costs no memory, since each one is immediately eligible for
// GC — but the stream is still let run to its natural end before responding.
// Destroying the connection early, tried first, raced a still-writing client
// into a raw connection error instead of a clean 413: a declared
// Content-Length is a promise the client already committed to keeping, and
// only reading it out fully guarantees the client's own write has finished
// before it goes to read our response. A stalled or genuinely enormous body
// is bounded by Node's own default request timeout, not by this function.
async function readBody(req: import("node:http").IncomingMessage): Promise<string | undefined> {
  const declared = Number(req.headers["content-length"]);
  let tooLarge = Number.isFinite(declared) && declared > MAX_REQUEST_BODY_BYTES;

  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buf = chunk as Buffer;
    total += buf.length;
    if (total > MAX_REQUEST_BODY_BYTES) tooLarge = true;
    if (!tooLarge) chunks.push(buf);
  }
  return tooLarge ? undefined : Buffer.concat(chunks).toString("utf8");
}

async function handle(req: import("node:http").IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "/", "http://internal");
  const { token, setCookie } = sealToken(req.headers.cookie);
  if (setCookie) res.setHeader("Set-Cookie", setCookie);

  if (req.method === "GET" && url.pathname === "/") {
    const error = url.searchParams.get("error");
    sweepAbandoned();
    const drafts = listDrafts().map((d) => ({ colophon: d, strokes: strokesFor(d.id) }));
    const sealed = listColophons().map((c) => ({ colophon: c, strokes: strokesFor(c.id) }));
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    res.end(renderIndex({ sealed, drafts, ownToken: token, eventId: currentEventId(), error: error ?? undefined }));
    return;
  }

  if (req.method === "GET" && url.pathname === "/events") {
    const header = req.headers["last-event-id"];
    const since = (Array.isArray(header) ? header[0] : header) ?? url.searchParams.get("since") ?? undefined;
    openStream(req, res, since, clientIp(req));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/drafts") {
    // A draft belongs to a seal the browser already holds; a request with no
    // seal cookie is a script, not a page someone loaded.
    if (setCookie) {
      json(res, 409, { error: "no-seal", message: "Reload the page, then brush." });
      return;
    }
    const existing = openDraftFor(token);
    if (existing) {
      json(res, 200, { id: existing.id, strokes: strokesFor(existing.id).length });
      return;
    }
    const ip = clientIp(req);
    if (draftCount() >= MAX_OPEN_DRAFTS || (draftsByIp.get(ip)?.size ?? 0) >= MAX_DRAFTS_PER_IP) {
      json(res, 503, { error: "busy", message: "Too many people are writing at once. Try again in a little while." });
      return;
    }
    const draft = createDraft(token);
    draftsByIp.set(ip, (draftsByIp.get(ip) ?? new Set()).add(draft.id));
    publish({ type: "draft", data: { id: draft.id, glyph: sealGlyph(token) } });
    json(res, 201, { id: draft.id, strokes: 0 });
    return;
  }

  const api = /^\/api\/colophons\/(\d{1,12})\/(strokes|seal|abandon)$/.exec(url.pathname);
  if (req.method === "POST" && api) {
    const id = Number(api[1]);
    const action = api[2];
    const payload = await readJson(req);
    if (payload === "large") {
      json(res, 413, { error: "large", message: "payload too large" });
      return;
    }
    if (payload === undefined) {
      json(res, 400, { error: "malformed", message: "expected a JSON object" });
      return;
    }
    const colophon = getColophon(id);
    if (!colophon) {
      json(res, 404, { error: "missing", message: "no such colophon" });
      return;
    }
    if (colophon.token !== token) {
      json(res, 403, { error: "not-yours", message: "only the writer can add to or seal a colophon" });
      return;
    }
    if (colophon.state === "sealed") {
      json(res, 409, { error: "sealed", message: "this colophon is sealed; nothing more can be added" });
      return;
    }
    if (colophon.state === "abandoned") {
      json(res, 410, { error: "abandoned", message: "this draft was left too long and has been set aside" });
      return;
    }

    if (action === "strokes") {
      const stroke = parseStroke(payload);
      if (typeof stroke === "string") {
        json(res, 400, { error: "malformed", message: stroke });
        return;
      }
      if (strokeCount(id) >= MAX_STROKES) {
        json(res, 422, { error: "full", message: `a colophon holds at most ${MAX_STROKES} strokes` });
        return;
      }
      const saved = addStroke(id, STROKE_VERSION, stroke.points);
      publish({
        type: "stroke",
        data: { colophonId: id, strokeId: saved.id, t: saved.t, points: saved.points, ...(stroke.nonce ? { c: stroke.nonce } : {}) },
      });
      json(res, 201, { strokeId: saved.id });
      return;
    }

    if (action === "seal") {
      const body = typeof payload.body === "string" ? payload.body.trim() : "";
      if (body.length > MAX_BODY_LENGTH) {
        json(res, 400, { error: "long", message: `Keep the line to ${MAX_BODY_LENGTH} characters.` });
        return;
      }
      if (body.length === 0 && strokeCount(id) === 0) {
        json(res, 400, { error: "empty", message: "Brush something, or write a line, before sealing." });
        return;
      }
      if (!sealDraft(id, token, body)) {
        json(res, 409, { error: "sealed", message: "this colophon is already sealed" });
        return;
      }
      forgetDraft(id);
      publish({ type: "sealed", data: { id } });
      json(res, 200, { id });
      return;
    }

    if (abandonDraft(id, token)) {
      forgetDraft(id);
      publish({ type: "abandoned", data: { id } });
    }
    json(res, 200, { id });
    return;
  }

  const fragment = /^\/colophons\/(\d{1,12})\/fragment$/.exec(url.pathname);
  if (req.method === "GET" && fragment) {
    const colophon = getColophon(Number(fragment[1]));
    if (!colophon || colophon.state !== "sealed") {
      json(res, 404, { error: "missing", message: "no such sealed colophon" });
      return;
    }
    const strokes = strokesFor(colophon.id);
    json(res, 200, {
      id: colophon.id,
      panel: renderPanel(colophon, strokes, token),
      entry: renderEntry(colophon, strokes, token),
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/colophons") {
    const raw = await readBody(req);
    if (raw === undefined) {
      res.writeHead(413, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("payload too large");
      return;
    }
    const params = new URLSearchParams(raw);
    const body = (params.get("body") ?? "").trim();

    let error: string | undefined;
    if (body.length === 0) error = "empty";
    else if (body.length > MAX_BODY_LENGTH) error = "long";

    if (!error) publish({ type: "sealed", data: { id: addColophon(token, body) } });

    res.writeHead(303, { Location: error ? `/?error=${error}` : "/" });
    res.end();
    return;
  }

  if (req.method === "GET" && url.pathname === "/readme/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(renderReadme(renderMarkdown(README)));
    return;
  }

  if (req.method === "GET" && url.pathname.startsWith("/public/")) {
    const ext = extname(url.pathname);
    const type = MIME[ext];
    if (!type) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    readFile(`.${url.pathname}`, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("not found");
        return;
      }
      res.writeHead(200, { "Content-Type": type });
      res.end(data);
    });
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("not found");
}

// A client that drops mid-body makes readBody throw "aborted"; uncaught, that
// rejection would end the process for every visitor (spec/aborted-request).
// Nobody is left to answer, so close what's left of the exchange.
const server = createServer((req, res) => {
  handle(req, res).catch((err: unknown) => {
    if (!(err instanceof Error && err.message === "aborted")) console.error(err);
    if (!res.headersSent && !res.destroyed) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("something went wrong");
    } else {
      res.destroy();
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`colophon listening on 0.0.0.0:${PORT}`);
});
