# Brief: colophons are brushed by hand, and you can watch them being written

You have about 4 hours, unattended, start to finish. Nobody will answer
questions, so wherever something is ambiguous, pick the option closest to the
README's argument, record the choice in the ADR or `PROCESS.md`, and carry on.
Keep `main` deployable after every commit. Delete this file (`prompt.md`) in
your last commit.

**Every push to `main` deploys.** The repo is public: CI
(`.github/workflows/checks.yml`) builds the Docker image, runs `pnpm check`
against it, runs `pnpm check:evidence`, and deploys to Fly only if all of that
is green. Commit often, but push only at green, stable points, and never push
half a feature.

## The crit brief this answers (crit 9, "All at once")

> make your final project real-time, then decide how it behaves when several
> people use it at once --- and write down why

Source: https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/crits/09-all-at-once/
(`/api/crits/09-all-at-once.json` has the spec lines verbatim). Done means:

1. A change one person makes appears in every other open session within about
   a second, with no reload, on the deployed app. **This is the pass condition.
   It is never the thing that gets cut.**
2. One decision about how the app behaves when several people use it at once is
   made and written down, with the options considered and what the choice
   costs, as an architecture decision record in `docs/adr/0001-<slug>.md`. The
   pod will argue for the option you didn't pick, so the reasoning has to hold
   up against the README.
3. The repo shows the process: commits that grow with the work, `PROCESS.md`
   updated, `reflections/crit-9.md` written.

## Goal

A colophon stops being a typed line and becomes what it was on a real
handscroll: an inscription brushed by hand and closed with the writer's seal.
A visitor draws a short inscription or signature in ink in a fixed-size margin
panel, then seals it, and it joins the scroll permanently, after the painting
and every colophon before it. While someone is brushing, everyone else with the
page open watches the ink appear stroke by stroke, the way you'd watch someone
write in a guest book across the room.

This is a better fit for the README than it might look: historically,
colophons were calligraphy, written by hand after the painting and finished
with a seal. The typed line stays, as the way to write a colophon without
JavaScript and as the text alternative for a drawn one.

## Where the app is now

A ~350-line Node 24 server (`src/server.ts`, raw `node:http`, no framework, Node
runs the `.ts` directly) with `node:sqlite` on a `/data` volume. `GET /` renders
the page server-side (`src/render.ts`): one painting (`public/scroll.avif`) in a
short horizontal scroller, and the colophon list below it; `POST /colophons`
appends a typed line and 303-redirects. Requests over 16 KB are rejected
(`spec/request-limits.test.ts`). Fly runs exactly one 256 MB shared-cpu machine
that auto-stops when idle (`fly.toml`: leave its shape alone). One dependency
(`marked`). The agent that built it kept a hand-off in `memory/now.md` and
durable lessons in `memory/MEMORY.md`; read both.

## The design

### Principles (from the README and `CLAUDE.md`, they bind you)

- No accounts, avatars, profiles, names, likes, replies, threads, feeds or
  notifications. A visitor is only the anonymous seal their browser is given.
  No one stamps or endorses anyone else's colophon (that would be a like).
- Sealed is permanent: no editing, deleting or auto-truncating a sealed
  colophon, typed or drawn. Reject at the boundary instead.
- Constraints are a feature: a small, considered brush, not a drawing app.
  Prefer less technology.
- `--seal` keeps its one meaning, "this colophon is yours". Reuse the existing
  `.colophon--mine` class for your drawn colophons, so `spec/accent.test.ts`
  keeps holding. Other people's live drafts must not use `--seal`. Don't add a
  second accent colour. Ink is ink-coloured.
- Every user-supplied string reaches HTML only through `escapeHtml`, including
  anything pushed over the live channel. Strokes are numbers: validate their
  shape and ranges on the server rather than trusting the client.
- With JavaScript off, the page still works: the painting, every sealed
  colophon (drawn ones rendered server-side as inline SVG from the stored
  strokes) and the typed-line form. The brush, live drafts and presence are
  progressive enhancements.

### The model (decided; build to this)

- **A colophon** has an optional typed line (≤320 characters, today's rules)
  and an optional drawing, and needs at least one of them. Without JS you can
  only type. With JS you draw, and may type a line too; that line becomes the
  drawing's text alternative. A drawing without one gets an alt like
  "A brushed inscription, sealed 鑑, 7 October 2026". Keep the existing
  `colophons` rows readable; add columns or tables, don't rewrite old data.
- **The brush:** a fixed panel (pick a size that reads as a colophon sheet,
  taller than wide), one ink colour, a cap on strokes per colophon and points
  per stroke. Size the caps so one stroke per request stays well under the
  16 KB limit. Pointer events, works on touch.
- **Stroke format:** compact integer point arrays in panel coordinates, a
  per-stroke timestamp, a format version. Design this first and write it down;
  rendering, live updates, replay and the timelapse stretch all depend on it.
- **Lifecycle:** `drafting` → `sealed`, or `drafting` → `abandoned`.
  - A visitor has at most one draft at a time. Only the seal that owns a draft
    (checked against the cookie) can add strokes to it or seal it.
  - Sealing is the writer's own act ("Seal it" button) and makes it permanent.
    Sealing twice (a double click, two tabs) must seal exactly once, in one
    SQLite transaction or a single conditional `UPDATE`.
  - A draft with no new stroke for a set window (one config constant, default
    10 minutes) is abandoned and never shown again. It was never ink on the
    scroll, so dropping it doesn't break permanence; say so in the README.
  - Sealed colophons reject further strokes with a clear error.
- **Where they go:** sealed colophons join the scroll in order of sealing.
  Real handscrolls read right to left, with colophons mounted after the
  painting at the left end. Look at how `scroll.avif` is laid out and at the
  current page, and choose whether drawn colophons continue the scroll itself
  (the scroller will need to be taller) or sit in the list below it. Record
  the choice in the ADR.
- **Live:** server-sent events over plain `node:http` (no new dependency), with
  strokes sent as plain `POST`s. Everyone with the page open sees each draft
  appear as a faint, unsealed panel marked with its writer's seal glyph
  (`src/seal.ts`), filling in stroke by stroke, and then settling into the
  scroll when it's sealed. Never broadcast the raw seal token. Whether a
  colophon is "mine" is decided per viewer against their own cookie: the
  server sends the glyph and an id, not ownership. A reconnecting client
  replays everything it missed by last event id (`Last-Event-ID`), with
  nothing lost or duplicated. Bound the streams for 256 MB and auto-stop:
  heartbeat, idle timeout, a connection cap, no per-connection buffers that
  grow. One machine means in-memory broadcast reaches everyone; say what
  would change to scale out.

### The decision for the ADR (yours to make)

What other people see while someone writes. For example:
- every stroke live, as above;
- only a quiet "someone is writing" mark until it's sealed (it's private until
  it's ink);
- nothing until it's sealed.

There are related questions under the same heading:
- What happens when several people are writing at once? Their drafts appear
  side by side, but the order on the scroll is by sealing, not by starting.
- Do readers who aren't writing appear at all?
- What does someone see when they come back tomorrow?

The model above assumes live strokes. If your ADR argues for something
quieter, the crit still needs a change that reaches others within a second
(sealing, at minimum), so keep that part live whatever you choose.

## Build order (a thin slice first, then widen)

Build the riskiest path end to end before polishing any part of it:

1. **Read and rewrite the argument.** Read `README.md`, `CLAUDE.md`,
   `PROCESS.md`, `memory/`, `spec/`, `src/`, `.github/workflows/checks.yml`.
   `CLAUDE.md`'s harness says a change that breaks the README's argument must
   change the argument first, so rewrite "What good means here" and "What I
   chose not to build" for brushed colophons and live writing. The README
   currently says real-time belongs to a later crit; it's this one. Keep every
   existing heading, in order (`spec/invariants.test.ts` checks them). Write
   the ADR skeleton and the stroke format.
2. **Walking skeleton.** Store a stroke, broadcast it over SSE, and show it in
   a second tab within a second. Add the CI-safe liveness spec (below). Commit
   and push once green: from here the crit's pass condition is live.
3. **The brush and sealing:** the panel, caps and validation, ownership, seal
   exactly once, sealed rejects strokes, server-rendered SVG for sealed
   colophons, the no-JS path, alt text, `--seal` on your own.
4. **Reconnect and replay, stream limits, abandonment.**
5. **Presence and polish:** a draft's seal glyph, how drafts settle into the
   scroll, phone layout.
6. **Finish (reserve the last 30 minutes):** see "Finishing" below.

**Stretch, only if time remains:** a timelapse of the scroll being written,
from stroke timestamps.

**If you're behind, cut in this order:** the stretch, then presence polish,
then abandonment (leave drafts open indefinitely and say so), then the phone
layout polish. Never cut the live path, the specs for what you built, the ADR,
the README rewrite or the reflection, and never leave `main` red.

**Out of scope:** accounts, likes or endorsements, replies, editing or
deleting sealed content, notifications, colours beyond ink and the existing
accent, an undo for sealed work (undo within a draft is fine but optional).

## Specs

`pnpm check` runs every `spec/**/*.test.ts` against the running app, in CI
against the Docker image, and **CI has no browser.** So everything in `spec/`
must work over plain HTTP: use `fetch` with a streamed response body to read
SSE. Browser tests live outside `spec/` (see "Testing the UI").

Write tests alongside each feature, at least:
- A stroke posted on one stream's behalf arrives on another open SSE stream
  within about a second (the crit's condition, without a browser).
- Strokes are still there on the next request, and a sealed colophon renders
  in `/`'s HTML as SVG with no script.
- Strokes over the caps, out of range or malformed are rejected rather than
  silently corrupted (and a sealed colophon is never mutated).
- Only the owner's cookie can add strokes to a draft or seal it.
- A sealed colophon rejects further strokes. Two concurrent seal requests seal
  it once (see `spec/colophon-concurrency.test.ts` for how this repo already
  tests races).
- A reconnect with `Last-Event-ID` replays exactly the missed events, with no
  duplicates.
- Your colophons are marked as yours and nobody else's are. The seal token
  never appears in any SSE payload or in another visitor's HTML.
- With no script, `/` still has the painting, every sealed colophon and the
  typed form, and a typed colophon still works.
- Abandonment: test the rule as a pure function with an injected clock (the
  running app's clock can't be fast-forwarded).

Note in `PROCESS.md` what can't be tested, for example whether watching
someone write feels like company or like surveillance. A bug found along the
way gets its own spec or a new rule in `CLAUDE.md`'s harness section (leave the
riff block at the top alone). The old specs keep passing unless a change
genuinely supersedes one; then edit it deliberately and say so in the commit
message. Don't delete tests to get green. `spec/invariants.test.ts` must stay
green.

## Testing the UI (the brush and live drafts need eyes)

Passing unit tests don't show that drawing works. Build a loop that uses the
real UI and looks at the result.

- **Use a real browser, locally only.** Add `playwright-core` as a
  devDependency and launch the installed Chrome (`channel: "chrome"`), which
  avoids a browser download and pnpm 11's install-script blocking
  (`pnpm-workspace.yaml` `allowBuilds`). Put browser tests in `e2e/`, run by a
  separate `pnpm e2e` script, never in `spec/`. If no browser launches, say so
  in `PROCESS.md` and rely on the HTTP specs. Don't skip silently.
- **Keep logic out of the client script.** Stroke validation, caps, encoding,
  lifecycle and replay live in plain modules with unit tests. The script that
  handles pointer events and the SSE connection stays thin.
- **Make the UI assertable as DOM, not pixels.** Render strokes as SVG paths
  with stable hooks (`data-colophon-id`, `data-stroke-id`, `data-state`), so a
  test can assert "the other tab shows 3 paths in colophon 12".
- **Loop after each UI change:** drive strokes with real pointer events (mouse,
  plus touch emulation at a 390px viewport), screenshot, read the image, check
  it against the rubric, fix. Cap it at about 3 rounds per feature.
- **Two browser contexts:** draw in one, see it in the other within a second.
  Drop and restore one context's network to check replay. Run one pass with
  JavaScript disabled.
- **Rubric for screenshots** (with no criteria an agent always says "looks
  good"):
  - ink stays inside the panel;
  - a draft is visibly unsealed, and a sealed colophon looks settled;
  - `--seal` appears only on your own colophons;
  - nothing scrolls the whole page sideways at 390px;
  - drawn and typed colophons sit together as one scroll;
  - it reads as a handscroll, not a drawing app.
- Screenshots go in a gitignored folder (add it to `.gitignore`).

## Track your progress

Four hours is long enough to lose the thread. Before writing code:

- Run `date` and write the start time down.
- Write the plan as a checklist in `memory/now.md`, the hand-off file this
  agent already uses (mirror it in your task tool if you have one; the file is
  what survives). Use small items in build order, each with its done check,
  e.g. "SSE liveness spec green", "seal-once spec green, pushed".
- Work one item at a time. Tick an item only when its check passes, and write
  the time (from `date`) next to it. Add items (bugs, specs for them) as they
  turn up.
- At about 2 hours and 3 hours, run `date`, compare against the build order,
  and cut using the cut order above if you're behind.
- Commit `memory/now.md` with the work. It's process evidence too.

## Manage your context

Run this as Opus 5.5 for its long context window; whoever launches the run sets
the model, so if you're on something else, carry on and note it in
`PROCESS.md`. Four hours fills any context window, so manage it on purpose.

- **The main agent orchestrates.** It holds the plan, the checklist and the
  decisions, writes the ADR and README, reviews every change and is the only
  one that commits or pushes.
- **Delegate token-heavy work to subagents** and keep only their conclusions:
  building a self-contained module and its tests, the browser loop and
  screenshot review, reading long `pnpm check` output, broad reads across the
  repo. Run independent ones in parallel, never two on the same file.
- **Brief subagents fully.** They don't see this file. Give each the goal, the
  files, the harness rules that apply (escape everything, sealed is permanent,
  `--seal` means yours, works with JS off, no browser tests in `spec/`), the
  exact done check, and what to return: a short summary and the files
  changed. Tell them not to commit, and to start servers with a timeout and
  stop them. Review the diff and re-run `pnpm check` yourself.
- **Failed or hung subagents:**
  - If one errors, returns nothing, or claims success but the check fails,
    retry once with a narrower brief that includes the error text.
  - If one runs far past what its task should take (check with `date`; about
    20 minutes for a build task, 10 for a test run), stop it and count that as
    a failure.
  - After one retry, do the work yourself in small steps or cut the item.
    Note it in `memory/now.md`.
  - If one left partial edits, check `git status` and `git diff`, and finish or
    revert them before going on.
- **Keep your own tool output small.** Pipe long output through `tail` or
  `grep`, read file ranges, and don't paste back a screenshot or log you've
  already judged.
- **After any compaction, reset or long interruption**, before anything else:
  re-read this file, `memory/now.md`, the ADR and `CLAUDE.md`'s harness rules,
  check `git log --oneline -15` and `git status`, run `date`, and continue
  from the first unticked item. Trust these files over your memory of the
  work. To make that possible, keep `memory/now.md` current (done, next,
  decisions made), and write each design decision into the ADR when you make
  it, not at the end.

## Finishing

- `pnpm check` green against the built Docker image if Docker is available
  (CI's setup: `docker build`, then `docker run` with `--tmpfs /data`).
  Otherwise run it against `pnpm start`. Also run `pnpm check:evidence`: it
  fails if `PROCESS.md` cites a commit SHA that doesn't exist in this repo, so
  cite only SHAs from this repo's `git log`.
- `PROCESS.md`: add the crit 9 work. Include what was built, what was cut,
  what's untested and the decisions a human should review.
- `reflections/crit-9.md`: follow `reflections/README.md` (the two standing
  prompts, 150–300 words). Don't use it as a changelog.
- `memory/now.md`: hand off for the next run (crit 10, "Fly by instruments").
- Final commit deletes `prompt.md`. Push, then `gh run watch` the CI run to
  the end. If it's red, fix and push again. When it's green, check that the
  live site serves `/` and that a drawn colophon round-trips. Don't leave
  test colophons on the live scroll.

## Leave alone

The shape of `fly.toml`, the painting image, the seal glyph scheme,
`escapeHtml`'s behaviour, the CI workflow, and the riff block at the top of
`CLAUDE.md`. Add no dependency beyond `playwright-core` (dev only) unless the
ADR argues for it.
