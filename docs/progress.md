# Crit 9 run: progress

Start: Wed 07 Oct 2026 16:01 AEDT (one unattended pod run, about four hours).

This checklist lives here rather than in `memory/now.md`, which `prompt.md`
names: the crit agent's doctrine says pod runs leave `memory/` alone, since
the agent's own ticks own it. Same purpose, a file the run is allowed to
touch.

No git remote in this clone, and the doctrine says pod runs neither push nor
deploy (the harness pushes when the run stops, CI deploys). So "push" below
means "commit at a green point"; the live-URL checks are left to CI and the
next run.

## Checklist (build order)

- [x] README rewritten for brushed colophons and live writing; headings kept (invariants green) (16:13)
- [x] ADR 0001 skeleton + stroke format written down (16:13)
- [x] Walking skeleton: stroke stored on own draft, broadcast over SSE; liveness spec green (16:21)
- [x] Brush panel, caps and validation specs green (16:22)
- [x] Ownership spec green (only the owner adds strokes / seals) (16:22)
- [x] Seal exactly once (concurrent seal spec green); sealed rejects strokes (16:22)
- [x] Sealed colophon renders as SVG in `/` with no script (16:22)
- [x] Taller RTL scroller, colophons mounted as panels after the painting (16:27)
- [x] Transcript list stays; old specs narrowed to it with jsdom (16:22)
- [x] Reconnect replay by Last-Event-ID spec green; reset on unknown id (16:21)
- [x] Stream limits: heartbeat, max lifetime, connection cap, backpressure drop, closed when the tab is hidden (16:21; the cap itself is untested, see PROCESS.md)
- [x] Abandonment rule (pure function spec) + sweeper (16:22)
- [x] Seal token never in SSE payload or another visitor's HTML (spec) (16:21)
- [x] playwright-core e2e: two contexts, draw → see; JS-off pass; 390px (16:27)
- [x] Screenshot loop against the rubric (16:27)
- [x] Docker image `pnpm check` green (16:29)
- [ ] PROCESS.md, reflections/crit-9.md, ADR final, prompt.md deleted

## Found along the way

- [x] Writer saw their own new draft as a stranger's and the brush jumped
  mid-stroke (own `draft` event beat the `/api/drafts` response). Fixed in
  `public/scroll.js`, asserted in `e2e/`, rule in CLAUDE.md (16:27)

## Next

- [x] SSE response shape spec (event-stream, no-store, retry) (16:33)
- [x] Review subagent findings (16:41): an aborted request body crashed the
  process (predates this run; spec/aborted-request.test.ts); cookieless
  scripts could take every draft slot (cookie required, 6 per address);
  replay skipped the backpressure check; strokes on a stranger's draft could
  be dropped while this page's own draft request was in flight (events now
  handled one at a time, in order)
- [x] Stretch: timelapse of every brushed colophon, from stroke timestamps (16:41)
- [x] Ink that reads as brushed (public/ink.js, 16:30)
