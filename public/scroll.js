// Progressive enhancement for the scroll: the brush, live drafts, and sealed
// colophons arriving without a reload. Without this script the page is the
// painting, every sealed colophon and the typed form. Validation, caps and the
// lifecycle all live on the server (src/strokes.ts); this only draws, posts
// and listens. Panel size, caps and the stroke format match the ADR.

import { brushPath } from "./ink.js";

const W = 240;
const H = 400;
const MAX_POINTS = 400;
const MAX_STROKES = 48;
const SVG = "http://www.w3.org/2000/svg";

const scroller = document.querySelector(".scroll-scroller");
const track = document.querySelector(".scroll-track");
const brush = document.querySelector("[data-brush]");
const surface = document.querySelector("[data-brush-surface]");
const form = document.querySelector("[data-colophon-form]");
const textarea = form.querySelector("textarea");
const submit = form.querySelector("[data-submit]");
const startOver = form.querySelector("[data-start-over]");
const bodyLabel = form.querySelector("[data-body-label]");
const status = document.querySelector("[data-brush-status]");
const list = document.querySelector(".colophon-list");

for (const el of document.querySelectorAll(".panel--draft, [data-brush], .brush-only")) el.hidden = false;

function addPath(svg, points, strokeId) {
  if (strokeId && svg.querySelector(`[data-stroke-id="${strokeId}"]`)) return null;
  const path = document.createElementNS(SVG, "path");
  path.setAttribute("d", brushPath(points));
  if (strokeId) path.dataset.strokeId = String(strokeId);
  svg.append(path);
  return path;
}

// Keep whatever the reader is looking at still while panels come and go
// elsewhere on the scroll: find the panel nearest the middle of the view,
// change the DOM, then scroll by however far that panel moved.
function keepPlace(change) {
  const box = scroller.getBoundingClientRect();
  const mid = box.left + box.width / 2;
  let anchor = null;
  let best = Infinity;
  for (const el of track.children) {
    const r = el.getBoundingClientRect();
    const dist = r.right < mid ? mid - r.right : r.left > mid ? r.left - mid : 0;
    if (dist < best) [best, anchor] = [dist, el];
  }
  const before = anchor?.getBoundingClientRect().left;
  change();
  if (anchor?.isConnected) scroller.scrollLeft += anchor.getBoundingClientRect().left - before;
}

// ---- the brush ----

let draftId = brush.dataset.colophonId ? Number(brush.dataset.colophonId) : null;
let draftPromise = null;
const ownNonces = new Set();
let queue = Promise.resolve();
let active = null; // { pointerId, points, path }

const strokeCount = () => surface.querySelectorAll("path").length;

function say(message) {
  status.textContent = message ?? "";
}

function refreshForm() {
  const drawn = strokeCount() > 0;
  textarea.required = !drawn;
  submit.textContent = drawn ? "Seal it" : "Write it in";
  bodyLabel.textContent = drawn
    ? "A line to go with your brushwork (optional; it's what a screen reader reads)"
    : "A line for the margin";
  startOver.hidden = !drawn;
}

async function api(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function ensureDraft() {
  if (draftId) return Promise.resolve(draftId);
  draftPromise ??= api("/api/drafts", {}).then(({ ok, data }) => {
    draftPromise = null;
    if (!ok) throw new Error(data.message ?? "Couldn't start a sheet.");
    draftId = data.id;
    brush.dataset.colophonId = String(draftId);
    return draftId;
  });
  return draftPromise;
}

function toPanel(event) {
  const r = surface.getBoundingClientRect();
  const x = Math.round(((event.clientX - r.left) / r.width) * W);
  const y = Math.round(((event.clientY - r.top) / r.height) * H);
  return [Math.min(W, Math.max(0, x)), Math.min(H, Math.max(0, y))];
}

surface.addEventListener("pointerdown", (event) => {
  if (active || event.button !== 0) return;
  if (strokeCount() >= MAX_STROKES) {
    say(`That's the whole sheet: ${MAX_STROKES} strokes. Seal it, or start over.`);
    return;
  }
  event.preventDefault();
  surface.setPointerCapture(event.pointerId);
  const points = toPanel(event);
  active = { pointerId: event.pointerId, points, path: addPath(surface, points) };
  active.path.classList.add("wet");
  ensureDraft().catch((err) => say(err.message));
});

surface.addEventListener("pointermove", (event) => {
  if (!active || event.pointerId !== active.pointerId) return;
  const [x, y] = toPanel(event);
  const p = active.points;
  if (Math.hypot(x - p[p.length - 2], y - p[p.length - 1]) < 2) return;
  p.push(x, y);
  active.path.setAttribute("d", brushPath(p));
  if (p.length >= MAX_POINTS * 2) finishStroke(event);
});

function finishStroke(event) {
  if (!active || event.pointerId !== active.pointerId) return;
  const { points, path } = active;
  active = null;
  const nonce = Math.random().toString(36).slice(2, 12);
  ownNonces.add(nonce);
  refreshForm();
  // Strokes post one after another so they're stored in the order drawn.
  queue = queue.then(async () => {
    try {
      await ensureDraft();
      const { ok, data } = await api(`/api/colophons/${draftId}/strokes`, { v: 1, points, c: nonce });
      if (!ok) throw new Error(data.message ?? "That stroke didn't take.");
      path.dataset.strokeId = String(data.strokeId);
      path.classList.remove("wet");
    } catch (err) {
      path.remove();
      refreshForm();
      say(err.message);
    }
  });
}

for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
  surface.addEventListener(type, finishStroke);
}

function clearBrush() {
  for (const p of surface.querySelectorAll("path")) p.remove();
  draftId = null;
  delete brush.dataset.colophonId;
  refreshForm();
}

form.addEventListener("submit", async (event) => {
  if (strokeCount() === 0) return; // a typed line: the plain form post
  event.preventDefault();
  submit.disabled = true;
  await queue;
  const { ok, data } = await api(`/api/colophons/${draftId}/seal`, { body: textarea.value });
  submit.disabled = false;
  if (!ok) {
    say(data.message ?? "It didn't seal. Try again.");
    return;
  }
  say("Sealed. It's on the scroll now.");
  textarea.value = "";
  clearBrush();
});

startOver.addEventListener("click", async () => {
  await queue;
  if (draftId) await api(`/api/colophons/${draftId}/abandon`, {});
  clearBrush();
  say("");
});

document.querySelector("[data-goto-brush]").addEventListener("click", () => {
  brush.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
});

// ---- live ----

function draftPanel(id, glyph) {
  let panel = track.querySelector(`.panel--draft[data-colophon-id="${id}"]`);
  if (panel || !glyph) return panel;
  panel = document.createElement("div");
  panel.className = "panel panel--draft panel--arriving";
  panel.dataset.colophonId = String(id);
  panel.dataset.state = "drafting";
  panel.setAttribute("role", "img");
  panel.setAttribute("aria-label", `A colophon being brushed now, seal ${glyph}`);
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("class", "ink");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("aria-hidden", "true");
  const seal = Object.assign(document.createElement("span"), { className: "colophon-seal", textContent: glyph });
  const note = Object.assign(document.createElement("span"), { className: "panel-note", textContent: "being written" });
  seal.setAttribute("aria-hidden", "true");
  note.setAttribute("aria-hidden", "true");
  panel.append(svg, seal, note);
  keepPlace(() => brush.before(panel));
  return panel;
}

const handlers = {
  async draft({ id, glyph }) {
    // The event for this page's own new draft can beat the response that
    // tells the page its id; wait for that first, or the writer would see
    // their own draft mounted as a stranger's and the brush jump mid-stroke.
    await draftPromise?.catch(() => {});
    if (id !== draftId) draftPanel(id, glyph);
  },
  stroke({ colophonId, strokeId, points, c }) {
    if (c && ownNonces.has(c)) return;
    const target = colophonId === draftId ? surface : draftPanel(colophonId)?.querySelector("svg");
    if (target) addPath(target, points, strokeId);
    if (target === surface) refreshForm();
  },
  async sealed({ id }) {
    const res = await fetch(`/colophons/${id}/fragment`);
    if (!res.ok) return;
    const { panel, entry } = await res.json();
    if (id === draftId) clearBrush();
    keepPlace(() => {
      track.querySelector(`.panel--draft[data-colophon-id="${id}"]`)?.remove();
      if (track.querySelector(`.panel--sealed[data-colophon-id="${id}"]`)) return;
      const sealedPanels = track.querySelectorAll(".panel--sealed");
      const after = sealedPanels[sealedPanels.length - 1] ?? track.querySelector(".scroll-painting");
      after.insertAdjacentHTML("afterend", panel);
      after.nextElementSibling.classList.add("panel--settling");
    });
    if (!list.querySelector(`[data-colophon-id="${id}"]`)) list.insertAdjacentHTML("beforeend", entry);
    document.querySelector(".empty-note")?.remove();
  },
  abandoned({ id }) {
    if (id === draftId) {
      clearBrush();
      say("Your sheet was left a while and has been set aside. Start again whenever you like.");
    }
    keepPlace(() => track.querySelector(`.panel--draft[data-colophon-id="${id}"]`)?.remove());
  },
  reset() {
    location.reload();
  },
};

let lastId = scroller.dataset.eventId;
let source = null;

function connect() {
  if (source) return;
  source = new EventSource(`/events?since=${encodeURIComponent(lastId)}`);
  for (const [type, handle] of Object.entries(handlers)) {
    source.addEventListener(type, (event) => {
      if (event.lastEventId) lastId = event.lastEventId;
      handle(JSON.parse(event.data));
    });
  }
}

function disconnect() {
  source?.close();
  source = null;
}

// A hidden tab or a page in the back-forward cache holds no stream open, so
// the machine can stop when nobody is looking. Coming back replays from the
// last event seen.
document.addEventListener("visibilitychange", () => (document.hidden ? disconnect() : connect()));
addEventListener("pagehide", disconnect);
addEventListener("pageshow", (event) => event.persisted && connect());

refreshForm();
connect();
