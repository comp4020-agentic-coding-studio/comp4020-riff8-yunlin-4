# Brief: Colophon becomes a scroll people paint together, in real time

You have about 4 hours, unattended, start to finish. Nobody will answer
questions, so wherever something is ambiguous, pick the option closest to the
README's argument, record the choice in the ADR or `PROCESS.md`, and carry on.
Keep `main` deployable after every commit. Delete this file (`prompt.md`) in
your last commit.

You are extending "Colophon", an existing small web app in this repo. Before
writing any code, read `README.md`, `CLAUDE.md`, `PROCESS.md`, `spec/` and skim
`src/`, so you understand the architecture, conventions, test setup (vitest)
and deploy setup (`Dockerfile`, `fly.toml`). The `CLAUDE.md` harness rules and
`PROCESS.md` win over anything below if they conflict. Write a short plan into
`PROCESS.md` (or the ADR) before building; don't wait for confirmation.

## The crit brief this answers (crit 9, "All at once")

> make your final project real-time, then decide how it behaves when several
> people use it at once --- and write down why

Source: https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/crits/09-all-at-once/
(`/api/crits/09-all-at-once.json` has the spec lines verbatim). Done means:

1. A change one person makes appears in every other open session within about
   a second, with no reload, on the deployed app.
2. One decision about how the app behaves when several people use it at once is
   made and written down in the repo, with the options considered and what the
   choice costs (an architecture decision record, `docs/adr/0001-<slug>.md`).
   The pod will argue for the option that wasn't picked, so the reasoning has
   to hold up against the README.
3. The repo shows the process: commits that grow with the work, `PROCESS.md`
   updated, `reflections/crit-9.md` written (what you directed, grounded and
   corrected).

## Goal

Turn the scroll into something people paint together. Visitors extend the
handscroll with new painted strips. A strip is a draft until enough distinct
visitors co-sign it, and then it is permanently attached to the scroll.
Visitors painting the same open strip see each other live.

## Where the app is now

A ~350-line Node 24 server (`src/server.ts`, raw `node:http`, no framework)
with `node:sqlite` on a `/data` volume. `GET /` renders the whole page
server-side (`src/render.ts`): one painting image (`public/scroll.avif`) and
the colophon list; `POST /colophons` appends a line and 303-redirects. Fly runs
exactly one 256 MB shared-cpu machine that auto-stops when idle (`fly.toml`:
leave its shape alone). One dependency (`marked`).

## Design principles (from the README, keep these)

- No accounts, avatars, profiles, likes, replies or feeds. A visitor is only
  the anonymous seal their browser is given on first visit. Co-signing is not
  a like: it is a threshold that decides whether a strip exists at all, shows
  no counts to rank anything, and nobody sees a leaderboard.
- Sealed content is permanent: no editing or deleting once a strip is
  attached; never auto-truncate or silently mutate what someone made. Reject
  at the boundary instead.
- Constraints are a feature: a small, considered tool, not a drawing app.
- The app answers to the people who use it, not to growth. Prefer less
  technology.
- `--seal` keeps its one meaning, "this is yours" (your colophons, and now
  strips you drew or co-signed). Other visitors' presence marks must not use
  it; don't add a second accent colour.
- Every user-supplied string reaches HTML only through `escapeHtml`, including
  anything pushed over the live channel. Strokes are numeric data, so
  validate them as numbers rather than trusting the client.
- The reading page must still work with JavaScript off: the painting, sealed
  strips (render them server-side as inline SVG built from the stored strokes,
  or similar) and the colophon form all work without script. The canvas, live
  strokes and presence are progressive enhancements on top of that.

## Scope, in priority order

### 1. Strip model, canvas, storage, stitching (~2 hrs)

- A strip is a fixed-width vertical slice of painting added to the right end
  of the scroll.
- Hard constraints: fixed strip dimensions, a palette of one or two ink
  colours, a cap on strokes per strip and a cap on points per stroke.
- Stroke format: compact point arrays with a per-stroke timestamp and a
  version field. Design this first (put it in the ADR or a short doc), because
  rendering, presence and replay all depend on it.
- Canvas UI: brush drawing on the open strip (pointer events, works on touch),
  with the last few centimetres of the previous strip visible as an edge
  reference.
- Persistence: strokes survive restarts and are returned on the next request,
  in the existing `node:sqlite` database (add tables; don't touch the
  `colophons` table's shape).
- Scroll renderer: stitch the existing painting plus all sealed strips into
  one horizontally scrolling view, with the open strip at the right end.

### 2. Co-signed sealing (~1 hr)

- Strips have states: draft, sealed, expired.
- A draft becomes sealed only when N distinct seals co-sign it (N is one
  config constant, default 3). A seal can co-sign a strip once.
- Drafts expire after a configurable window if they never reach N.
- Once sealed, a strip is immutable. Reject any later stroke or edit with a
  clear error.
- The threshold check must be safe under concurrent co-signs: two simultaneous
  signatures must not double count or seal twice (do it in one SQLite
  transaction or a single atomic statement; see
  `spec/colophon-concurrency.test.ts` for how this repo already tests races).
- The no-JS fallback for co-signing is a plain form post, like the colophon
  form.

### 3. Presence and live strokes on the open strip (~45 min)

- Use the simplest real-time channel that works. Server-sent events over plain
  `node:http` for server-to-client, plain `POST` for strokes, is the expected
  shape and needs no new dependency; choose a WebSocket only if you can justify
  it in the ADR.
- Show other current visitors as anonymous seals on the open strip, and show
  their strokes live. The seal glyph comes from `src/seal.ts`; never broadcast
  the raw seal token (derive what viewers need, per viewer: "mine" is decided
  against the viewer's own cookie, not by the server telling everyone).
- Presence expires via heartbeat. Reconnecting clients must backfill missed
  strokes (replay by last-seen id, e.g. `Last-Event-ID`) without losing or
  duplicating any.
- Fly: `fly.toml` runs a single machine, so in-memory broadcast reaches all
  clients. Say so in the ADR and note what would have to change to scale out.
  Open streams keep an auto-stopped machine awake and live in 256 MB, so
  bound them: heartbeat, idle timeout, a cap on connections, no
  per-connection buffers that grow.
- The ADR's central decision is yours to make here: what is live and what
  waits (strokes live while someone is painting vs. only on seal), whether and
  how presence shows, what happens when two people paint the same spot at once
  (strokes are appended, so both land; say so), and what a returning visitor
  sees. Justify against the README.

### 4. Deploy and reflection (~30 min)

- Verify the Docker build and `fly.toml` still work with the new channel (the
  Dockerfile copies only `src`, `public`, `README.md`; add anything the
  runtime now needs).
- Add `reflections/crit-9.md` following the format already in `reflections/`,
  and update `PROCESS.md` as it asks.
- Update `README.md` where it now contradicts the app (it currently says
  real-time belongs to a later crit, and says nothing about painting), in the
  same commit as the change that makes it untrue. Keep its headings, since
  `spec/invariants.test.ts` checks them in order.

### Stretch (only if time remains, in this order)

- A one-line (max 320 characters) inscription attached to each sealed strip,
  reusing the existing colophon logic and its escaping and length rules.
- A timelapse replay of the scroll growing, from stroke timestamps.

### Explicitly out of scope

Accounts, likes, comments, editing or deleting sealed content, notifications,
anchored notes, linked-verse mode.

## Specs (`spec/`, vitest, against the running app over HTTP)

Write tests alongside each feature. At minimum:

- A stroke saved now is still there on the next request.
- Strokes over the stroke or point cap, or in the wrong format, are rejected
  rather than silently corrupted.
- A draft is not sealed with fewer than N distinct seals, and the same seal
  signing twice counts once.
- A sealed strip rejects further strokes.
- Concurrent co-signs seal exactly once.
- An expired draft cannot be sealed.
- A client that reconnects receives missed strokes without duplicates.
- A stroke posted in one request arrives on another open stream within about
  a second.
- Strips a visitor drew or signed are identifiable as theirs, and nobody
  else's are; the seal token never appears in what's sent to others.
- With no script, `/` still returns the painting, sealed strips and both forms.

Note in a comment or in `PROCESS.md` which qualities can't be tested (for
example whether painting together actually feels collaborative). A bug found
along the way gets its own spec test or a new rule in the `CLAUDE.md` harness
section (leave the riff block at the top alone).

The old specs (`accent`, `colophon`, `colophon-concurrency`, `cookie-safety`,
`layout`, `request-limits`, `static-files`) were written for the old brief.
Keep them green unless a change genuinely supersedes one (for example
`static-files` when new asset types are served); then edit it deliberately and
say so in the commit message. Don't delete tests to get green.
`spec/invariants.test.ts` must stay green: `/` returns 200 and `/readme/`
publishes the full README.

## Testing the UI (the canvas and live painting need eyes, not just unit tests)

Passing unit tests don't show that painting works. Build a loop that uses the
real UI and looks at the result.

- **Drive a real headless browser.** Add Playwright (or Puppeteer) as a
  `devDependency` only: the Dockerfile installs with `--prod`, so the image
  stays small. `jsdom` has no real pointer or canvas behaviour, so it can't
  test painting. If no browser can be launched, say so in `PROCESS.md` and
  test through the HTTP and SSE layer instead; don't skip silently.
- **Keep logic out of the canvas script.** Stroke validation, caps, point
  encoding, sealing and replay live in plain modules with unit tests. The
  client script stays thin, so most of the feature is testable without a
  browser.
- **Make the UI assertable as DOM, not pixels.** Render strokes as SVG paths
  with stable hooks (`data-strip-id`, `data-stroke-id`, `data-state`, and a
  `data-mine` marker). Tests then assert "the other browser shows 3 paths in
  strip 7" rather than comparing images.
- **Loop after each UI change:** drive a stroke with real pointer events
  (mouse, and touch emulation at a phone viewport), take a screenshot, read
  it, check it against the rubric below, fix. Cap this at about 3 rounds per
  feature; 4 hours doesn't leave room for polishing.
- **Test liveness with two browser contexts** on the same server: draw in one,
  assert the path appears in the other within about a second. This is the
  crit's pass condition, so make it a spec in `spec/`. Also drop and restore
  the network on one context to exercise reconnect and replay, and run a pass
  with JavaScript disabled.
- **Rubric for screenshots.** An agent looking at a screenshot with no
  criteria says "looks good", so check these explicitly:
  - the edge reference from the previous strip lines up with the open strip;
  - ink stays inside the strip's bounds;
  - the open strip is visibly different from sealed ones, with no second
    accent colour;
  - other visitors' presence marks don't use `--seal`;
  - nothing overflows sideways at 375px wide (the page still scrolls the
    scroll, not the whole page);
  - it still looks like the handscroll, not a drawing app.
- Keep screenshots in a gitignored folder (add it to `.gitignore`), not in
  the repo. In `reflections/crit-9.md`, list what you judged visually rather
  than tested.

## Working rules

- Small steps, run `pnpm check` after each one, commit logically as you go.
- Keep the diff small and consistent with the existing code style and comment
  density. No new dependency unless clearly needed; if you add one, say why in
  the ADR.
- If something here conflicts with what you find in the repo, don't stop:
  follow the repo and `CLAUDE.md`, and record the conflict and your resolution
  in `PROCESS.md`.
- If time runs short, cut from the bottom of the scope list, never the specs,
  the ADR or the reflection, and never leave `main` broken.
- Leave alone: the shape of `fly.toml`, the scroll image, the seal glyph
  scheme, `escapeHtml`'s behaviour, and the top riff block of `CLAUDE.md`.
- At the end, put a summary in `reflections/crit-9.md`: what was built, what
  was cut, what's untested, and the decisions a human should review.
