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
- [x] Sim core, map, creatures, fog, pathing, balance; `spec/sim-*` green (20:46)
- [x] `src/mark.ts`, `src/log.ts`, request/domain/refusal logging; `spec/mark`, `spec/log*` green (20:09)
- [x] Bot + bot-vs-bot soak green, matches end in 6.5–8.3 min (20:46)
- [x] Match lifecycle, tables, routes, manual-tick refused under FLY_APP_NAME; match specs green (20:46)
- [x] `scripts/play.ts`, `scripts/replay.ts`; three testers played full matches (20:54)
- [x] Round 1 playtest: 6 major, 4 minor, 2 ideas (20:54)

### M2 — on the scroll (1:30–2:30)
- [ ] Per-seat stream, `/match` page + `public/match.js`, seat/join, results, chronicle seal
- [x] `spec/access.test.ts`, 210 cases, no table/code disagreement (20:55)
- [x] Log file + rotation on `/data/logs` (20:09, with the logging slice)
- [x] Triage round 1, fix blockers/majors (21:10)
- [x] Link the game from the scroll page (21:11)
- [x] Round 2: all six personas plus a log-only reader and a blind code audit; 4 blockers, 13 majors (21:48)
- [x] T-21 (F-34, F-35, major) raids between looks warn; regrove reach 24 (21:59)
- [x] T-22 (F-36, F-38, major) idle spearmen defend their people nearby; plurals (22:03)
- [x] T-23 (F-40, F-41, F-43, F-44, F-45) legend names hills, creatures announced, costs on buttons, early banner, no layout shift, game linked near the top — done when: screenshots
- [x] T-20 (F-32, major) an unjoined match lapses after three minutes — done when: spec with short env

### M3 — hold up (2:30–3:30)
- [x] Docker image with `--tmpfs /data`: `pnpm check` 373 green, log file on /data, 55 MiB with a live bot match, no token in the log (21:53)
- [x] Access audit subagent; fixes with specs (crash, ids, slot, streams) (21:48)
- [x] `scripts/narrate.ts` + spec; `docs/logs.md` (20:12, pulled forward: it only needs the log shapes)
- [x] e2e crit scenario in two Chrome profiles, narrated from the log (21:22)
- [ ] Round 3 verification

### Finish (3:30–4:00)
- [ ] PROCESS.md, reflections/crit-10.md
- [ ] `pnpm check` against the final Docker image with `--tmpfs /data`; `pnpm check:evidence`
- [ ] prompt.md deleted in the last commit

## Found along the way

From round 1 (`docs/feedback.md`):

- [x] T-1 (F-1, major) slower early military, bot thresholds in balance.ts — done when: soak matches end in 8–15 min, a fresh tester's first wave arrives later
- [x] T-2 (F-2, major) units hit while attacking a building turn on the attacker; labourers weaker — done when: sim spec of a labourer mob vs spearmen
- [x] T-3 (F-3, major) deaths and hall damage told in words in play.ts and the page — done when: play.ts prints "killed by" lines; page shows them
- [x] T-4 (F-4, major) relic claimable and readable — done when: sim spec claims it with the pixiu away
- [x] T-5 (F-5, major) labourers move on to the next seen grove; idle shown — done when: sim spec, both clients show idle count
- [x] T-6 (F-6, major) rules say where each creature lives — done when: rules text names places
- [x] T-7 (F-7, minor) build refusal says why — done when: validate spec
- [x] T-8 (F-8, minor) attackers move on to the next visible enemy — done when: sim spec
- [x] T-9 (F-9, F-10, minor) status shows match id and seed; selectors listed (21:00)

From round 2, the log reader and the audit:

- [x] T-10 (F-26, major) log lines say what was refused and why, kinds of units, game time — done when: spec/narrate fixtures
- [x] T-11 (F-13, blocker) `build` resumes an own unfinished building — done when: sim spec from the repro
- [x] T-12 (F-14, blocker) stream writes guarded; ended streams leave the broadcast set — done when: spec/match-robustness
- [x] T-13 (F-15, F-24, major) per-side id sequences; fog-blind pathing; constant-time attack validation — done when: sim spec
- [x] T-14 (F-16, F-17, major) slot can't be held forever; seated players always get a stream — done when: spec
- [x] T-15 (F-18, major) bot keeps a home guard and musters waves — done when: soak, fresh tester
- [x] T-16 (F-19, major) warnings when your units are attacked and enemies sighted — done when: both clients show it
- [x] T-17 (F-20, major) pixiu's loop readable — done when: rules text names its path; heading shown
- [x] T-19 (F-28, F-29, F-30) the page explains a lost seat, first steps, armed modes, a legend — done when: fresh newcomer finds their way
- [x] T-18 (F-21, F-23, major) sides and creatures by silhouette; sticky HUD; focus ring — done when: screenshot rubric pass
