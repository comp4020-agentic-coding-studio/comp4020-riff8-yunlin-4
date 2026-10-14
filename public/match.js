// 山海, the second scroll: the browser side of a match. docs/match-api.md is
// the contract; the server decides everything (who may act, what each seat
// sees), and this only draws what it's shown and posts what the player asks
// for. Everything is ink on silk, told apart by glyph and silhouette, never
// colour: own pieces are solid ink, the other side's hollow, creatures ringed
// with a jagged brush line.

const T = 22; // CSS px per tile
const MAX_IDS = 40;
const INK = "43, 39, 33";
const PAPER = "#f7f2e7";
const GLYPH_FONT = '"Noto Serif CJK TC", "Noto Serif CJK SC", "Songti TC", "Songti SC", "SimSun", serif';

const NAMES = {
  labourer: "labourer",
  spearman: "spearman",
  hall: "hall",
  barracks: "barracks",
  nian: "年 nian",
  jiaolong: "蛟龍 jiaolong",
  qilin: "麒麟 qilin",
  pixiu: "貔貅 pixiu",
};
const GLYPHS = {
  labourer: "勞",
  spearman: "兵",
  hall: "廳",
  barracks: "營",
  nian: "年",
  jiaolong: "蛟",
  qilin: "麟",
  pixiu: "貔",
};
const SIDE_GLYPH = ["東", "西"];
const SEAT_NAME = ["east", "west"];
const CREATURES = new Set(["nian", "jiaolong", "qilin", "pixiu"]);
const BUILDINGS = new Set(["hall", "barracks"]);
const REASONS = {
  hall: "a hall fell",
  forfeit: "a player forfeited",
  abandoned: "a player left the match idle",
  restart: "the server restarted",
  time: "time ran out",
};

const statusEl = document.querySelector("[data-match-status]");
const messageEl = document.querySelector("[data-match-message]");
const board = document.querySelector("[data-match-board]");
const hud = document.querySelector("[data-match-hud]");
const controls = document.querySelector("[data-match-controls]");
const scroller = document.querySelector("[data-match-scroller]");
const canvas = document.querySelector("[data-match-canvas]");
const logEl = document.querySelector("[data-match-log]");
const ctx = canvas.getContext("2d");

let status = null; // the status object, without view
let view = null; // the latest SeatView
let selected = new Set();
let mode = null; // null | "order" | "gather" | "build"
let log = [];
let sealedFor = null; // matchId whose chronicle this page has sealed
let scrolledFor = null; // matchId whose hall the scroller has been brought to

function say(message) {
  messageEl.textContent = message ?? "";
}

async function post(path, body = {}) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "onclick") node.addEventListener("click", v);
    else if (k === "className") node.className = v;
    else node.setAttribute(k, v);
  }
  node.append(...children);
  return node;
}

function button(label, onclick, className = "") {
  return el("button", { type: "button", className, onclick }, label);
}

// Status actions answer with a status object; anything else is a refusal.
async function act(path, body) {
  const { ok, data } = await post(path, body);
  if (!ok) {
    say(data.message ?? "That didn't go through.");
    return;
  }
  say("");
  if (data.status) applyStatus(data);
}

// ---- status ----

function applyStatus(next) {
  if (status && next.matchId !== status.matchId) {
    selected = new Set();
    mode = null;
    log = [];
    view = null;
  }
  status = { ...next };
  if ("view" in next) {
    view = next.view;
    delete status.view;
  }
  if (status.you === null || status.status === "none" || status.status === "waiting") view = null;
  renderStatus();
  renderBoard();
}

function renderStatus() {
  const s = status;
  statusEl.replaceChildren();
  if (!s) return;
  const p = (text) => el("p", {}, text);
  const unroll = () => button("Unroll a new match", () => act("/api/match"));
  const seated = s.you === 0 || s.you === 1;

  if (s.status === "none") {
    statusEl.append(p("No match is being played."), unroll());
  } else if (s.status === "waiting" && s.you === 0) {
    statusEl.append(
      p("Waiting for a second player. Send them this page, or"),
      button("Play the bot", () => act("/api/match/bot")),
    );
  } else if (s.status === "waiting") {
    statusEl.append(
      p("A match is waiting for a second player."),
      button("Take the west seat", () => act("/api/match/join")),
    );
  } else if (s.status === "playing" && !seated) {
    statusEl.append(p("A match is under way."));
  } else if (s.status === "playing") {
    statusEl.append(p(`You hold the ${SEAT_NAME[s.you]} seat. Read the land right to left.`));
  } else if (s.status === "ended" && seated && s.result) {
    statusEl.append(...renderResult(s), unroll());
  } else {
    statusEl.append(p("The last match has ended."), unroll());
  }
  if (s.manualTicks && seated && s.status === "playing") {
    statusEl.append(button("Step 20", () => act("/api/match/step", { ticks: 20 }), "quiet"));
  }
}

function renderResult(s) {
  const r = s.result;
  const outcome = r.winner === null ? "No one took the field." : r.youWon ? "You won." : "You lost.";
  const nodes = [el("p", { className: "match-result" }, `${outcome} The match ended because ${REASONS[r.reason] ?? r.reason}, after ${clock(r.ticks)}.`)];
  if (r.chronicle) nodes.push(el("blockquote", { className: "match-chronicle" }, r.chronicle));
  const sealed = el("p", {}, "Sealed onto the scroll. ", el("a", { href: "/" }, "See it there"));
  if (r.chronicleSealed || sealedFor === s.matchId) {
    nodes.push(sealed);
  } else if (r.chronicle) {
    const sealButton = button("Seal the chronicle", async () => {
      sealButton.disabled = true;
      const { ok, status: code, data } = await post("/api/match/chronicle", { matchId: s.matchId });
      if (ok || (code === 409 && data.error === "sealed")) {
        sealedFor = s.matchId;
        say("");
        sealButton.replaceWith(sealed);
      } else {
        sealButton.disabled = false;
        say(data.message ?? "It didn't seal. Try again.");
      }
    });
    nodes.push(sealButton);
  }
  return nodes;
}

function clock(ticks) {
  const secs = Math.floor(ticks / 4);
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
}

// ---- the board ----

let terrain = null; // offscreen canvas: the ground, redrawn tile by tile
let lastGround = "";
let dpr = 1;

function sizeCanvas() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = view.width * T;
  const h = view.height * T;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  terrain = document.createElement("canvas");
  terrain.width = canvas.width;
  terrain.height = canvas.height;
  lastGround = "";
}

function renderBoard() {
  const seated = status && (status.you === 0 || status.you === 1);
  const show = seated && view && (status.status === "playing" || status.status === "ended");
  board.hidden = !show;
  if (!show) return;
  if (!terrain || canvas.width !== Math.round(view.width * T * Math.min(2, devicePixelRatio || 1))) sizeCanvas();
  // Drop anything selected that has died or gone.
  const own = new Set(view.entities.filter((e) => e.side === view.seat).map((e) => e.id));
  for (const id of selected) if (!own.has(id)) selected.delete(id);
  updateTerrain();
  draw();
  renderHud();
  renderControls();
  if (scrolledFor !== status.matchId) bringHallIntoView();
}

// A tiny deterministic hash so each tile's marks are the same every redraw.
function rand(x, y, k = 0) {
  let h = (x * 374761393 + y * 668265263 + k * 2246822519) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function updateTerrain() {
  if (view.ground === lastGround) return;
  const t = terrain.getContext("2d");
  t.setTransform(dpr, 0, 0, dpr, 0, 0);
  const { width, height, ground } = view;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const c = ground[i];
      if (lastGround && lastGround[i] === c) continue;
      t.save();
      t.beginPath();
      t.rect(x * T, y * T, T, T);
      t.clip();
      t.clearRect(x * T, y * T, T, T);
      if (c !== " ") drawTile(t, x, y, c);
      t.restore();
    }
  }
  lastGround = ground;
}

// Unpainted silk is left alone (the canvas's own background shows through).
// Seen ground is laid on as paper; remembered ground is inked faintly, ground
// in view fully.
function drawTile(t, x, y, c) {
  const live = c === c.toUpperCase();
  const code = c.toLowerCase();
  const px = x * T;
  const py = y * T;
  t.fillStyle = live ? PAPER : "#f0e9dc";
  t.fillRect(px, py, T, T);
  const a = live ? 0.85 : 0.26;
  t.strokeStyle = `rgba(${INK}, ${a})`;
  t.fillStyle = `rgba(${INK}, ${a})`;
  t.lineCap = "round";
  t.lineJoin = "round";
  const r = (k) => rand(x, y, k);

  if (code === "r" || code === "f") {
    // Flowing lines, phased by absolute x so they join tile to tile.
    t.lineWidth = 1;
    const dashed = code === "f";
    if (dashed) t.setLineDash([3, 4]);
    for (const [row, amp] of [
      [0.3, 1.6],
      [0.68, 1.2],
    ]) {
      t.beginPath();
      for (let sx = 0; sx <= T; sx += 2) {
        const gx = px + sx;
        const wy = py + T * row + Math.sin(gx / 9 + y * 1.7 + row * 5) * amp;
        sx === 0 ? t.moveTo(gx, wy) : t.lineTo(gx, wy);
      }
      t.stroke();
    }
    t.setLineDash([]);
    if (dashed) {
      for (let k = 0; k < 2; k++) {
        t.beginPath();
        t.ellipse(px + T * (0.25 + 0.5 * k), py + T * (0.5 + (r(k) - 0.5) * 0.2), 2.4, 1.4, 0, 0, Math.PI * 2);
        t.fill();
      }
    }
  } else if (code === "g") {
    // Ni Zan's trees: a thin trunk, a few horizontal dabs for leaves.
    const n = 1 + Math.floor(r(1) * 2);
    for (let k = 0; k < n; k++) {
      const tx = px + T * (0.3 + 0.4 * k + (r(k + 2) - 0.5) * 0.15);
      const base = py + T * 0.88;
      const top = py + T * (0.25 + r(k + 5) * 0.15);
      t.lineWidth = 1.1;
      t.beginPath();
      t.moveTo(tx, base);
      t.quadraticCurveTo(tx + 1.5, (base + top) / 2, tx - 0.5, top);
      t.stroke();
      t.lineWidth = 1.6;
      for (let d = 0; d < 4; d++) {
        const dy = top + d * 2.6;
        const dx = tx + (r(k * 10 + d) - 0.5) * 6;
        t.beginPath();
        t.moveTo(dx - 2, dy);
        t.lineTo(dx + 2, dy + 0.4);
        t.stroke();
      }
    }
  } else if (code === "h") {
    // Hills: a mound of varied height on most tiles, with hemp-fibre strokes
    // (披麻皴) down its face; some tiles carry only the strokes.
    const peak = px + T * (0.3 + r(1) * 0.4);
    const top = py + T * (0.15 + r(2) * 0.35);
    if (r(3) < 0.7) {
      t.lineWidth = 1.3;
      t.beginPath();
      t.moveTo(px + T * (0.05 + r(4) * 0.1), py + T * 0.92);
      t.quadraticCurveTo(peak - T * 0.25, top, peak, top);
      t.quadraticCurveTo(peak + T * 0.3, top + T * 0.05, px + T * (0.85 + r(5) * 0.1), py + T * 0.92);
      t.stroke();
    }
    t.lineWidth = 0.7;
    const n = 2 + Math.floor(r(6) * 3);
    for (let k = 0; k < n; k++) {
      const sx = peak + (k - n / 2) * T * 0.14 + (r(k + 7) - 0.5) * 3;
      t.beginPath();
      t.moveTo(sx, top + T * (0.15 + r(k + 12) * 0.1));
      t.quadraticCurveTo(sx + (k - n / 2) * 2, py + T * 0.62, sx + (k - n / 2) * 3.5, py + T * 0.9);
      t.stroke();
    }
  } else if (code === "l") {
    t.lineWidth = 0.9;
    for (let k = 0; k < 2; k++) {
      const gx = px + T * (0.25 + r(k) * 0.5);
      const gy = py + T * (0.45 + r(k + 3) * 0.35);
      t.beginPath();
      t.moveTo(gx - 2, gy - 3);
      t.lineTo(gx, gy);
      t.lineTo(gx + 2.5, gy - 4);
      t.stroke();
    }
  } else if (code === "x") {
    // A stele.
    t.lineWidth = 1.3;
    t.strokeRect(px + T * 0.35, py + T * 0.18, T * 0.3, T * 0.6);
    t.beginPath();
    t.moveTo(px + T * 0.2, py + T * 0.85);
    t.lineTo(px + T * 0.8, py + T * 0.85);
    t.stroke();
    if (view.relicClaimed) {
      t.beginPath();
      t.moveTo(px + T * 0.35, py + T * 0.78);
      t.lineTo(px + T * 0.65, py + T * 0.18);
      t.stroke();
    }
  } else if (code === "p" && r(9) < 0.12) {
    t.beginPath();
    t.arc(px + T * r(10), py + T * r(11), 0.7, 0, Math.PI * 2);
    t.fill();
  }
}

function glyph(c, char, cx, cy, size, fill, weight = "normal") {
  c.font = `${weight} ${size}px ${GLYPH_FONT}`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillStyle = fill;
  c.fillText(char, cx, cy + size * 0.04);
}

function jaggedRing(c, cx, cy, radius, spikes) {
  c.beginPath();
  for (let i = 0; i <= spikes * 2; i++) {
    const a = (i / (spikes * 2)) * Math.PI * 2;
    const rr = i % 2 === 0 ? radius : radius * 0.72;
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    i === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
  }
  c.closePath();
}

function drawEntity(e) {
  const c = ctx;
  const cx = e.x * T + T / 2;
  const cy = e.y * T + T / 2;
  const own = e.side === view.seat;
  const ink = `rgb(${INK})`;
  c.lineJoin = "round";
  let half = T * 0.5;

  if (CREATURES.has(e.kind)) {
    half = T * 0.95;
    const asleep = e.task === "asleep";
    c.fillStyle = PAPER;
    jaggedRing(c, cx, cy, half, 9);
    c.fill();
    c.strokeStyle = ink;
    c.lineWidth = asleep ? 1.5 : 2.6;
    c.stroke();
    glyph(c, GLYPHS[e.kind], cx, cy, T * 1.0, ink, "bold");
  } else if (BUILDINGS.has(e.kind)) {
    half = T * 0.85;
    const building = e.progress !== undefined && e.task === "building";
    const s = half * 2;
    if (own && !building) {
      c.fillStyle = ink;
      c.fillRect(cx - half, cy - half, s, s);
      glyph(c, GLYPHS[e.kind], cx, cy, T * 1.15, PAPER);
    } else {
      c.fillStyle = PAPER;
      c.fillRect(cx - half, cy - half, s, s);
      c.strokeStyle = ink;
      c.lineWidth = own ? 1.5 : 2.4;
      if (building) c.setLineDash([3, 3]);
      c.strokeRect(cx - half, cy - half, s, s);
      c.setLineDash([]);
      if (!own) c.strokeRect(cx - half + 3, cy - half + 3, s - 6, s - 6);
      glyph(c, GLYPHS[e.kind], cx, cy, T * 1.1, ink);
    }
    if (e.progress !== undefined) {
      // Progress: a brush line filling along the foot of the building.
      c.strokeStyle = ink;
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(cx - half, cy + half + 3);
      c.lineTo(cx - half + (s * Math.min(100, e.progress)) / 100, cy + half + 3);
      c.stroke();
    }
  } else if (own) {
    c.fillStyle = ink;
    c.beginPath();
    c.arc(cx, cy, half, 0, Math.PI * 2);
    c.fill();
    glyph(c, GLYPHS[e.kind], cx, cy, T * 0.74, PAPER);
    if (e.carrying) {
      c.beginPath();
      c.arc(cx + half * 0.9, cy - half * 0.9, 2.2, 0, Math.PI * 2);
      c.fill();
    }
  } else {
    c.fillStyle = PAPER;
    c.fillRect(cx - half, cy - half, half * 2, half * 2);
    c.strokeStyle = ink;
    c.lineWidth = 1.8;
    c.strokeRect(cx - half, cy - half, half * 2, half * 2);
    glyph(c, GLYPHS[e.kind], cx, cy, T * 0.72, ink);
  }

  if (e.side === 0 || e.side === 1) {
    glyph(c, SIDE_GLYPH[e.side], cx + half + 1, cy - half - 1, 8, `rgba(${INK}, 0.8)`);
  }
  if (e.hp < e.maxHp) {
    const w = half * 2;
    c.fillStyle = `rgba(${INK}, 0.2)`;
    c.fillRect(cx - half, cy + half + 5, w, 2);
    c.fillStyle = ink;
    c.fillRect(cx - half, cy + half + 5, (w * Math.max(0, e.hp)) / e.maxHp, 2);
  }
  if (selected.has(e.id)) {
    c.strokeStyle = ink;
    c.lineWidth = 1.2;
    c.setLineDash([3, 3]);
    c.beginPath();
    c.arc(cx, cy, half + 5, 0, Math.PI * 2);
    c.stroke();
    c.setLineDash([]);
  }
}

function draw() {
  if (!view || !terrain) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(terrain, 0, 0);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  for (const [x, y, amount] of view.groves) {
    ctx.font = `9px Georgia, serif`;
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = `rgba(${INK}, 0.55)`;
    ctx.fillText(String(amount), x * T + T - 1, y * T + T);
  }
  // Buildings under units, creatures on top.
  const order = (e) => (BUILDINGS.has(e.kind) ? 0 : CREATURES.has(e.kind) ? 2 : 1);
  for (const e of [...view.entities].sort((a, b) => order(a) - order(b))) drawEntity(e);
  if (drag?.box) {
    const [x0, y0, x1, y1] = drag.box;
    ctx.strokeStyle = `rgb(${INK})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
    ctx.setLineDash([]);
  }
}

function bringHallIntoView() {
  const hall = view.entities.find((e) => e.side === view.seat && e.kind === "hall");
  const x = hall ? hall.x * T : view.seat === 0 ? view.width * T : 0;
  const max = scroller.scrollWidth - scroller.clientWidth;
  const left = Math.min(max, Math.max(0, x - scroller.clientWidth / 2));
  // The scroller is right to left: scrollLeft runs from 0 (right end) to -max.
  scroller.scrollLeft = getComputedStyle(scroller).direction === "rtl" ? left - max : left;
  const y = hall ? hall.y * T : 0;
  scroller.scrollTop = Math.max(0, y - scroller.clientHeight / 2);
  scrolledFor = status.matchId;
}

// ---- HUD and controls ----

function ownPieces(filter) {
  return view.entities.filter((e) => e.side === view.seat && filter(e));
}

function selectedPieces() {
  return ownPieces((e) => selected.has(e.id));
}

let hallHp = null; // [matchId, hp] of the last hall hp seen
let attackedAt = -1e9;

function renderHud() {
  const hall = ownPieces((e) => e.kind === "hall")[0];
  if (hall) {
    if (hallHp && hallHp[0] === status.matchId && hall.hp < hallHp[1]) attackedAt = view.tick;
    hallHp = [status.matchId, hall.hp];
  }
  const idle = ownPieces((e) => e.kind === "labourer" && e.task === "idle");
  const counts = {};
  for (const e of selectedPieces()) counts[e.kind] = (counts[e.kind] ?? 0) + 1;
  const sel = Object.entries(counts)
    .map(([k, n]) => `${n} ${GLYPHS[k]}`)
    .join(", ");
  const item = (label, value) => el("span", { className: "match-hud-item" }, el("span", { className: "match-hud-label" }, label), ` ${value}`);
  hud.replaceChildren(
    item("grain", view.grain),
    item("people", `${view.pop}/${view.popCap}`),
    item("time", clock(view.tick)),
    el("span", { className: "match-hud-item" }, `you hold the ${SEAT_NAME[view.seat]} seat (${SIDE_GLYPH[view.seat]})`),
    el("span", { className: "match-hud-item" }, sel ? `${sel} selected` : "nothing selected"),
  );
  if (idle.length) {
    hud.append(
      el("span", { className: "match-hud-item" }, `${idle.length} 勞 idle `),
      button("Select idle labourers", () => {
        selected = new Set(idle.map((e) => e.id));
        renderHud();
        renderControls();
        draw();
      }, "quiet"),
    );
  }
  if (hall && view.tick - attackedAt <= 40) {
    hud.append(el("span", { className: "match-hud-item", role: "status" }, `Your hall is under attack — ${hall.hp} of ${hall.maxHp}`));
  }
}

function setMode(next) {
  mode = mode === next ? null : next;
  canvas.classList.toggle("match-canvas--aiming", mode !== null);
  renderControls();
}

function renderControls() {
  const playing = status.status === "playing";
  controls.replaceChildren();
  if (!playing) return;
  const sel = selectedPieces();
  const labourers = sel.filter((e) => e.kind === "labourer");
  const units = sel.filter((e) => !BUILDINGS.has(e.kind));
  const modeButton = (key, label) => {
    const b = button(label, () => setMode(key), "quiet");
    b.setAttribute("aria-pressed", String(mode === key));
    return b;
  };
  if (units.length) controls.append(modeButton("order", "Order: move or attack"));
  if (labourers.length) {
    controls.append(modeButton("gather", "Gather"), modeButton("build", "Build barracks"));
  }
  controls.append(
    button("Train labourer", () => train("hall", "labourer"), "quiet"),
    button("Train spearman", () => train("barracks", "spearman"), "quiet"),
  );
  if (units.length) controls.append(button("Stop", () => command({ type: "stop", units: ids(units) }), "quiet"));
  controls.append(
    button(
      "Forfeit",
      () => confirm("Forfeit the match? The other side wins.") && act("/api/match/forfeit"),
      "quiet match-forfeit",
    ),
  );
  if (mode) {
    const hint = { order: "Choose a place to go or a piece to attack.", gather: "Choose a grove.", build: "Choose where to build." }[mode];
    controls.append(el("span", { className: "match-hint" }, hint));
  }
}

function ids(pieces) {
  return pieces.slice(0, MAX_IDS).map((e) => e.id);
}

async function command(cmd) {
  const { ok, data } = await post("/api/match/command", cmd);
  say(ok ? "" : (data.message ?? "That order wasn't taken."));
}

function train(buildingKind, unit) {
  const fromSelection = selectedPieces().find((e) => e.kind === buildingKind);
  const building = fromSelection ?? ownPieces((e) => e.kind === buildingKind)[0];
  if (!building) {
    say(buildingKind === "barracks" ? "You have no barracks yet." : "You have no hall.");
    return;
  }
  command({ type: "train", building: building.id, unit });
}

// ---- pointer ----

function toBoard(event) {
  const r = canvas.getBoundingClientRect();
  return [event.clientX - r.left, event.clientY - r.top];
}

function entityAt(px, py) {
  let best = null;
  let bestD = Infinity;
  for (const e of view.entities) {
    const reach = (BUILDINGS.has(e.kind) || CREATURES.has(e.kind) ? 0.95 : 0.6) * T;
    const d = Math.hypot(e.x * T + T / 2 - px, e.y * T + T / 2 - py);
    if (d < reach && d < bestD) [best, bestD] = [e, d];
  }
  return best;
}

function groundAt(x, y) {
  return view.ground[y * view.width + x] ?? " ";
}

// One order at a point: attack what's there if it isn't ours, gather from a
// grove, otherwise go there. `forced` comes from a mode button.
function orderAt(px, py, forced) {
  const x = Math.floor(px / T);
  const y = Math.floor(py / T);
  if (x < 0 || y < 0 || x >= view.width || y >= view.height) return;
  const sel = selectedPieces();
  const units = sel.filter((e) => !BUILDINGS.has(e.kind));
  const labourers = units.filter((e) => e.kind === "labourer");
  if (forced === "build") {
    if (!labourers.length) return say("Select a labourer to build.");
    command({ type: "build", units: ids(labourers), building: "barracks", x, y });
    return;
  }
  if (!units.length) return say("Select some of your people first.");
  const target = entityAt(px, py);
  if (forced !== "gather" && target && target.side !== view.seat) {
    command({ type: "attack", units: ids(units), target: target.id });
    return;
  }
  const grove = groundAt(x, y).toLowerCase() === "g";
  if ((forced === "gather" || grove) && labourers.length) {
    command({ type: "gather", units: ids(labourers), x, y });
    const others = units.filter((e) => e.kind !== "labourer");
    if (forced !== "gather" && others.length) command({ type: "move", units: ids(others), x, y });
    return;
  }
  if (forced === "gather") return say("Only labourers gather.");
  command({ type: "move", units: ids(units), x, y });
}

let drag = null; // { pointerId, x, y, box }

canvas.addEventListener("contextmenu", (event) => event.preventDefault());

canvas.addEventListener("pointerdown", (event) => {
  if (!view || status.status !== "playing") return;
  const [px, py] = toBoard(event);
  if (event.button === 2) {
    orderAt(px, py, null);
    return;
  }
  if (event.button !== 0) return;
  drag = { pointerId: event.pointerId, x: px, y: py, box: null, shift: event.shiftKey };
  if (event.pointerType === "mouse") canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", (event) => {
  if (!drag || event.pointerId !== drag.pointerId || event.pointerType !== "mouse") return;
  const [px, py] = toBoard(event);
  if (drag.box || Math.hypot(px - drag.x, py - drag.y) > 6) {
    drag.box = [drag.x, drag.y, px, py];
    draw();
  }
});

canvas.addEventListener("pointerup", (event) => {
  if (!drag || event.pointerId !== drag.pointerId) return;
  const d = drag;
  drag = null;
  const [px, py] = toBoard(event);
  if (d.box) {
    const [x0, y0, x1, y1] = d.box;
    const [lx, hx, ly, hy] = [Math.min(x0, x1), Math.max(x0, x1), Math.min(y0, y1), Math.max(y0, y1)];
    if (!d.shift) selected = new Set();
    for (const e of ownPieces((e) => !BUILDINGS.has(e.kind))) {
      const cx = e.x * T + T / 2;
      const cy = e.y * T + T / 2;
      if (cx >= lx && cx <= hx && cy >= ly && cy <= hy) selected.add(e.id);
    }
    if (mode) setMode(null);
  } else if (mode) {
    orderAt(px, py, mode === "order" ? null : mode);
    setMode(null);
  } else {
    const hit = entityAt(px, py);
    if (hit && hit.side === view.seat) {
      if (d.shift) selected.has(hit.id) ? selected.delete(hit.id) : selected.add(hit.id);
      else selected = new Set([hit.id]);
    } else if (!d.shift) {
      selected = new Set();
    }
  }
  draw();
  renderHud();
  renderControls();
});

canvas.addEventListener("pointercancel", () => {
  drag = null;
  draw();
});

addEventListener("blur", () => {
  if (drag) {
    drag = null;
    draw();
  }
});

addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !view) return;
  selected = new Set();
  mode = null;
  canvas.classList.remove("match-canvas--aiming");
  draw();
  renderHud();
  renderControls();
});

// ---- events, in plain words ----

function describe(ev) {
  const me = view?.seat ?? status?.you;
  const name = (k) => NAMES[k] ?? k;
  switch (ev.type) {
    case "unit.died": {
      const where = `at (${ev.x},${ev.y})`;
      if (ev.side === "wild") return `The ${name(ev.kind)} was killed by ${ev.bySide === me ? "your" : "enemy"} ${ev.byKind}s ${where}`;
      const mine = ev.side === me;
      if (ev.cause === "creature") return `${mine ? "Your" : "Enemy"} ${ev.kind} ${ev.unit} was killed by the ${name(ev.byKind)} ${where}`;
      return mine ? `Your ${ev.kind} ${ev.unit} fell to enemy ${ev.byKind}s ${where}` : `Enemy ${ev.kind} ${ev.unit} was killed by your ${ev.byKind}s ${where}`;
    }
    case "build.start":
      return ev.seat === me ? `${cap(name(ev.kind))} begun` : `The enemy has begun a ${name(ev.kind)}`;
    case "build.done":
      return ev.seat === me ? `${cap(name(ev.kind))} finished` : `The enemy finished a ${name(ev.kind)}`;
    case "unit.trained":
      return ev.seat === me ? `New ${name(ev.kind)} ${ev.unit}` : `The enemy trained a ${name(ev.kind)}`;
    case "creature.aggro":
      return ev.targetSeat === me ? `The ${name(ev.kind)} turned on your unit ${ev.target}` : `The ${name(ev.kind)} has turned on the enemy`;
    case "relic.claimed":
      return ev.seat === me ? `Relic claimed: +${ev.grain} grain` : `The relic has been claimed`;
    case "match.end":
      return ev.winner === me ? `The enemy hall has fallen` : `Your hall has fallen`;
    default:
      return null;
  }
}

const cap = (s) => s[0].toUpperCase() + s.slice(1);

function addEvents(events) {
  for (const ev of events) {
    const text = describe(ev);
    if (text) log.push(`${clock(ev.tick)} ${text}`);
  }
  log = log.slice(-6);
  logEl.replaceChildren(...log.map((line) => el("li", {}, line)));
}

// ---- the stream ----

let source = null;

function connect() {
  if (source) return;
  source = new EventSource("/match/events");
  source.addEventListener("status", (event) => applyStatus(JSON.parse(event.data)));
  source.addEventListener("view", (event) => {
    view = JSON.parse(event.data);
    renderBoard();
  });
  source.addEventListener("events", (event) => addEvents(JSON.parse(event.data)));
}

function disconnect() {
  source?.close();
  source = null;
}

addEventListener("pagehide", disconnect);
addEventListener("pageshow", (event) => event.persisted && connect());

matchMedia(`(resolution: ${devicePixelRatio}dppx)`).addEventListener("change", () => {
  terrain = null;
  if (view) renderBoard();
});

fetch("/api/match", { cache: "no-store" })
  .then((res) => res.json())
  .then(applyStatus)
  .catch(() => say("Couldn't reach the match. Reload to try again."));
connect();
