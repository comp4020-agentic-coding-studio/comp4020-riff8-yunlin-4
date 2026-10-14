# Crit 10 run: progress

Start: Wed 14 Oct 2026 20:01 AEDT (one unattended pod run, about four hours).
Orchestrator: Opus 5.5. Implementation by subagents; the orchestrator writes
docs and glue, reviews every diff, and is the only one who commits.

No git remote in this clone, and the crit agent's doctrine says pod runs
neither push nor deploy (the harness pushes when the run stops, CI deploys).
So "push" below means "commit at a green point"; the live checks are left to
CI and the next run. `memory/` belongs to the agent's own ticks and is left
alone; this file does its job.

## Checklist (build order)

### Orient (0:00–0:25)
- [x] Baseline `pnpm check` green, 49 tests (20:02)
- [x] `src/sim/types.ts` contract written (20:04)
- [x] README rewritten, headings kept — invariants green (20:08)
- [x] ADR 0002, 0003 drafted with the route table (20:08)
- [x] `docs/feedback.md` created (20:08)

### M1 — headless match (0:25–1:30)
- [ ] Sim core, map, creatures, fog, pathing, balance — done when: `spec/sim-*` green
- [x] `src/mark.ts`, `src/log.ts`, request/domain/refusal logging; `spec/mark`, `spec/log*` green (20:09)
- [ ] Bot (same fogged view and commands) + bot-vs-bot soak — done when: soak spec green, matches end
- [ ] Match lifecycle (`src/match.ts`), tables, routes, manual-tick mode refused under FLY_APP_NAME — done when: match server specs green
- [ ] `scripts/play.ts`, `scripts/replay.ts` — done when: a tester can play a match from the shell
- [ ] Round 1 playtest (economist, rusher, mythic explorer)

### M2 — on the scroll (1:30–2:30)
- [ ] Per-seat stream, `/match` page + `public/match.js`, seat/join, results, chronicle seal
- [ ] `spec/access.test.ts` (table-driven against ADR 0002)
- [x] Log file + rotation on `/data/logs` (20:09, with the logging slice)
- [ ] Triage round 1, fix blockers/majors
- [ ] Link the game from the scroll page
- [ ] Round 2 playtest (all six, plus a narrate-only reader)

### M3 — hold up (2:30–3:30)
- [ ] Access audit subagent; fixes with specs
- [x] `scripts/narrate.ts` + spec; `docs/logs.md` (20:12, pulled forward: it only needs the log shapes)
- [ ] e2e crit scenario (two contexts)
- [ ] Round 3 verification

### Finish (3:30–4:00)
- [ ] PROCESS.md, reflections/crit-10.md
- [ ] `pnpm check` against the Docker image with `--tmpfs /data`; `pnpm check:evidence`
- [ ] prompt.md deleted in the last commit

## Found along the way
