# Playtest feedback

The one accumulating record of what blind playtesters found, written only by
the orchestrator. Testers never read the code; they play from the rules text
and what they can see, then report.

Each finding is `### F-<n> [state] <severity> · round <r> · <persona(s)> ·
<area>`, with what happened, what was expected and a repro (map, seed,
commands, tick). States move `open → fixed → verified`: fixed when the replay
or spec passes, verified only when a *fresh* tester no longer reproduces it
(or the access spec covers it, for security items). Each finding is triaged in
writing: `accepted → T-<m>` (a todo in `docs/progress.md`), `deferred (why)`
or `rejected (why)`, a rejection citing the README, a spec or the brief.

Severities: `blocker` (crash, can't play, cheat or leak, can't tell what to
do), `major` (unfair, confusing, dominant strategy, a creature that doesn't
matter or can't be understood), `minor`, `idea`.
