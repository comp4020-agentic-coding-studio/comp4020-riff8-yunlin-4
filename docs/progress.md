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

- [ ] README rewritten for brushed colophons and live writing; headings kept (invariants green)
- [ ] ADR 0001 skeleton + stroke format written down
- [ ] Walking skeleton: stroke stored on own draft, broadcast over SSE; liveness spec green
- [ ] Brush panel, caps and validation specs green
- [ ] Ownership spec green (only the owner adds strokes / seals)
- [ ] Seal exactly once (concurrent seal spec green); sealed rejects strokes
- [ ] Sealed colophon renders as SVG in `/` with no script
- [ ] Taller RTL scroller, colophons mounted as panels after the painting
- [ ] Transcript list stays; old specs narrowed to it with jsdom
- [ ] Reconnect replay by Last-Event-ID spec green; reset on unknown id
- [ ] Stream limits: heartbeat, max lifetime, connection cap, backpressure drop
- [ ] Abandonment rule (pure function spec) + sweeper
- [ ] Seal token never in SSE payload or another visitor's HTML (spec)
- [ ] playwright-core e2e: two contexts, draw → see; JS-off pass; 390px
- [ ] Screenshot loop against the rubric
- [ ] Docker image `pnpm check` green
- [ ] PROCESS.md, reflections/crit-9.md, ADR final, prompt.md deleted
