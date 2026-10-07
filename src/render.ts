import { escapeHtml } from "./html.ts";
import { sealGlyph } from "./seal.ts";
import type { Colophon, Stroke } from "./db.ts";
import { PANEL_HEIGHT, PANEL_WIDTH } from "./strokes.ts";
import { brushPath } from "../public/ink.js";

const dateFmt = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Australia/Canberra",
});

export const MAX_BODY_LENGTH = 320;

function layout(title: string, body: string): string {
  return `<!doctype html>
<html lang="en-AU">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <meta
      name="description"
      content="Colophon: a shared margin on one painting, written a line at a time by whoever visits."
    />
    <link rel="icon" href="/public/favicon.svg" type="image/svg+xml" />
    <link rel="stylesheet" href="/public/styles.css" />
  </head>
  <body>
    ${body}
  </body>
</html>
`;
}

export interface WithStrokes {
  colophon: Colophon;
  strokes: Stroke[];
}

function ink(strokes: Stroke[], className: string, extra = ""): string {
  const paths = strokes
    .map((st) => `<path data-stroke-id="${st.id}" data-t="${st.t}" d="${brushPath(st.points)}" />`)
    .join("");
  return `<svg class="${className}" viewBox="0 0 ${PANEL_WIDTH} ${PANEL_HEIGHT}" aria-hidden="true"${extra}>${paths}</svg>`;
}

function sealedDate(c: Colophon): string {
  return dateFmt.format(new Date(c.sealed_at ?? c.created_at));
}

// The text a drawn colophon is read as: its writer's own line if they gave
// one, otherwise a description that says what it is without inventing words.
export function altText(c: Colophon): string {
  return c.body.length > 0 ? c.body : `A brushed inscription, sealed ${sealGlyph(c.token)}, ${sealedDate(c)}`;
}

// One sheet mounted on the scroll after the painting. Drawn colophons show
// ink; typed ones are set in type.
export function renderPanel(c: Colophon, strokes: Stroke[], ownToken: string): string {
  const mine = c.token === ownToken;
  const drawn = strokes.length > 0;
  const label = drawn ? ` role="img" aria-label="${escapeHtml(altText(c))}"` : "";
  const face = drawn ? ink(strokes, "ink") : `<p class="panel-type">${escapeHtml(c.body)}</p>`;
  return `<div class="panel panel--sealed${mine ? " colophon--mine" : ""}" data-colophon-id="${c.id}" data-state="sealed"${label}>
          ${face}
          <span class="colophon-seal" aria-hidden="true">${sealGlyph(c.token)}</span>
          <span class="colophon-date" aria-hidden="true">${sealedDate(c)}${mine ? " — yours" : ""}</span>
        </div>`;
}

// Someone else's open draft: present in the HTML so a page and its event
// stream start from the same moment, but hidden until the script runs, since
// a draft is only ever a live thing.
function renderDraft(d: WithStrokes): string {
  const glyph = sealGlyph(d.colophon.token);
  return `<div class="panel panel--draft" data-colophon-id="${d.colophon.id}" data-state="drafting" hidden
             role="img" aria-label="A colophon being brushed now, seal ${glyph}">
          ${ink(d.strokes, "ink")}
          <span class="colophon-seal" aria-hidden="true">${glyph}</span>
          <span class="panel-note" aria-hidden="true">being written</span>
        </div>`;
}

function renderBrush(own: WithStrokes | undefined, ownToken: string): string {
  return `<div class="panel panel--brush colophon--mine" data-state="drafting" data-brush hidden role="group"
             aria-label="Your sheet: brush here with a mouse, finger or pen. Anyone with the scroll open sees each stroke. A typed line below works without a brush."
             ${own ? `data-colophon-id="${own.colophon.id}"` : ""}>
          ${ink(own?.strokes ?? [], "ink brush-surface", ' data-brush-surface=""')}
          <span class="colophon-seal" aria-hidden="true">${sealGlyph(ownToken)}</span>
          <span class="panel-note">your sheet: brush here</span>
        </div>`;
}

export function renderEntry(c: Colophon, strokes: Stroke[], ownToken: string): string {
  const mine = c.token === ownToken;
  const glyph = sealGlyph(c.token);
  const drawn = strokes.length > 0;
  const text =
    c.body.length > 0
      ? `<p class="colophon-body">${escapeHtml(c.body)}</p>`
      : `<p class="colophon-body colophon-body--alt">${escapeHtml(altText(c))}</p>`;
  return `<li class="colophon${mine ? " colophon--mine" : ""}" data-colophon-id="${c.id}">
        <span class="colophon-seal" aria-hidden="true">${glyph}</span>
        ${drawn ? ink(strokes, "thumb") : ""}${text}
        <p class="colophon-date">${drawn ? "brushed, " : ""}${sealedDate(c)}${mine ? " — yours" : ""}</p>
      </li>`;
}

export interface IndexView {
  sealed: WithStrokes[];
  drafts: WithStrokes[];
  ownToken: string;
  eventId: string;
  error?: string;
}

export function renderIndex({ sealed, drafts, ownToken, eventId, error }: IndexView): string {
  const errorMessage =
    error === "empty"
      ? "A colophon needs at least a few words."
      : error === "long"
        ? `Keep it to ${MAX_BODY_LENGTH} characters — the margin is not infinite.`
        : undefined;

  const own = drafts.find((d) => d.colophon.token === ownToken);
  const others = drafts.filter((d) => d !== own);

  const body = `
    <header class="site-header">
      <h1>Colophon</h1>
      <p class="kicker">a shared margin on one painting</p>
      <p><a href="/readme/">what good means here</a></p>
    </header>
    <main>
      <figure class="scroll-frame">
        <div class="scroll-scroller" tabindex="0" role="region" data-event-id="${escapeHtml(eventId)}"
             aria-label="The handscroll, read right to left: the painting, then every colophon sealed onto it since">
          <div class="scroll-track">
            <img class="scroll-painting" src="/public/scroll.avif" width="2400" height="163"
                 alt="A handscroll painting: Wang Yi's 1363 portrait of Yang Zhuxi standing under a pine, with Ni Zan's rocks and pine, flanked by six and a half centuries of collectors' colophons and seals." />
            ${sealed.map((c) => renderPanel(c.colophon, c.strokes, ownToken)).join("\n            ")}
            ${others.map(renderDraft).join("\n            ")}
            ${renderBrush(own, ownToken)}
          </div>
        </div>
        <figcaption>
          Wang Yi, <cite>Portrait of Yang Zhuxi</cite>, 1363 — Ni Zan painted the pine and
          rock. Palace Museum, Beijing. A handscroll reads right to left: scroll left past
          the painting and six and a half centuries of colophons to the ones written here.
          <span data-timelapse-wrap hidden><button type="button" class="link-button" data-timelapse>Watch the
            colophons being brushed again</button></span>
        </figcaption>
      </figure>

      <section aria-labelledby="write-heading">
        <h2 id="write-heading">Add yours</h2>
        <p class="section-note js-only" hidden>
          Brush on the blank sheet at the scroll's left end, then seal it. Anyone else with the
          scroll open watches your brush as you write. A sealed colophon can't be changed or taken
          back; an unsealed one left for ten minutes is set aside.
          <button type="button" class="link-button" data-goto-brush>Take me to the sheet</button>
        </p>
        ${errorMessage ? `<p class="form-error" role="alert">${escapeHtml(errorMessage)}</p>` : ""}
        <p class="form-error" role="status" data-brush-status></p>
        <form method="post" action="/colophons" data-colophon-form>
          <label for="body" data-body-label>A line for the margin</label>
          <textarea
            id="body"
            name="body"
            maxlength="${MAX_BODY_LENGTH}"
            rows="3"
            required
          ></textarea>
          <div class="form-actions">
            <button type="submit" data-submit>Write it in</button>
            <button type="button" class="quiet" data-start-over hidden>Start over</button>
          </div>
        </form>
      </section>

      <section aria-labelledby="colophons-heading">
        <h2 id="colophons-heading">Colophons</h2>
        <p class="section-note">
          Every colophon on the scroll, in the order it was sealed. Yours is marked once it's here
          — nothing you seal can be edited or taken back, the same as ink.
        </p>
        <ol class="colophon-list">
          ${sealed.map((c) => renderEntry(c.colophon, c.strokes, ownToken)).join("\n          ")}
        </ol>
        ${sealed.length === 0 ? `<p class="empty-note">No one has written in the margin yet.</p>` : ""}
      </section>
    </main>
    <footer>
      <p>Your seal on this page is <strong>${sealGlyph(ownToken)}</strong> — remembered by
        your browser, not by a name. <a href="/readme/">Read more.</a></p>
    </footer>
    <script src="/public/scroll.js" type="module"></script>
  `;

  return layout("Colophon", body);
}

export function renderReadme(html: string): string {
  const body = `
    <header class="site-header">
      <h1><a href="/">Colophon</a></h1>
      <p class="kicker">what good means here</p>
    </header>
    <main class="prose">
      ${html}
    </main>
  `;
  return layout("About — Colophon", body);
}
