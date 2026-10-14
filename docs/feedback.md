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

## Round 1 (20:47–20:54): economist, rusher, mythic explorer, text client vs bot, manual ticks

Results: rusher lost at 6:08, explorer lost at 5:49, economist lost at 22:23.
All three would play again. Nobody claimed the relic; only the pixiu was met.

### F-1 [open] major · round 1 · rusher, explorer, economist · balance
What: two of three matches were over inside six and a half minutes, and the
bot's first wave of five or six spearmen arrived at about 4:30 every time.
Expected: 8 to 15 minutes between the bot and a competent player (brief).
Repro: scroll-1, seed 1, any opening; first wave at tick ~1080–1110.
Triage: accepted → T-1. Slow the early military curve (barracks build, spearman
training, hall hp) in balance.ts and move the bot's thresholds into balance.ts,
then re-check with the soak. Not tuned to one tester: all three saw the wave.

### F-2 [open] major · round 1 · economist · combat
What: 26 labourers ordered to attack killed five spearmen at the hall for the
loss of one; spearmen beating on a building didn't answer back.
Expected: spearmen to be the answer to spearmen.
Repro: scroll-1, seed 1; `attack all-labourers 54` at tick 1191, 1221, 1236, 1251.
Triage: accepted → T-2. A unit struck while attacking a building turns on its
attacker; labourer damage down.

### F-3 [open] major · round 1 · economist, explorer, rusher · legibility
What: deaths read "labourer 4 is gone" / "left view or died", with no cause;
the hall lost hp with no warning; the economist didn't know how they lost.
Expected: to know what killed what, and that the hall is under attack.
Repro: scroll-1, seed 1; explorer `move 4 70 14` (t101), `move 4 52 14` (t161), dies ~t344.
Triage: accepted → T-3. The server already sends fog-filtered `unit.died` with
cause and killer kind (`recentEvents`); the text client and the page must say
it in words, and warn when your hall or barracks is losing hp.

### F-4 [open] major · round 1 · explorer · relic, pixiu
What: eight attempts to step a labourer onto the relic (56–60, 15–16) never
claimed it; nothing said why.
Expected: a claim, or a reason it can't be claimed.
Repro: scroll-1, seed 1; moves to (56,15) (57,15) (58,16) (59,15) between t781 and t927.
Triage: accepted → T-4. Check the relic tile is reachable and the pixiu is ever
"away"; a spec moves a labourer onto it with the pixiu far and asserts the
claim; the rules text and `look` say exactly where the relic is.

### F-5 [open] major · round 1 · economist · economy
What: home groves ran dry by 3:50 and labourers went idle silently, five times
in one match, twenty idle at a time.
Expected: a warning, or labourers moving on to the next grove.
Repro: scroll-1, seed 1; gather at (108,10) and (108,21) from tick 1; idle from ~t930.
Triage: accepted → T-5. Labourers look further for the next grove they have
seen; idle labourers are shown prominently in both clients.

### F-6 [open] major · round 1 · explorer (by absence) · creatures
What: the explorer met only the pixiu in a whole match; the nian, jiaolong and
qilin were never found, so they changed no decision.
Expected: each creature to change a decision.
Triage: accepted → T-6. The rules say where each lives (river head, river,
glade at the river's mouth, the fords), so a player can plan around them.

### F-7 [open] minor · round 1 · rusher · commands
What: "can't build there" doesn't say why. Triage: accepted → T-7 (say "not open
ground you can see" / "the footprint is blocked"; only about tiles in view, so
nothing hidden leaks).

### F-8 [open] minor · round 1 · economist · commands
What: a group that kills its target goes idle; every enemy needs its own order.
Triage: accepted → T-8 (attackers move on to the nearest visible enemy within
the acquire radius).

### F-9 [open] minor · round 1 · all · repro
What: `status` doesn't show the seed, so repros say "default". Triage: accepted
→ T-9 (status shows match id and seed).

### F-10 [open] minor · round 1 · economist · text client
What: `attack all 127` says "no units for 'all'". Triage: accepted → T-9 (list
the selectors).

### F-11 idea · round 1 · explorer · relic
A `claim` command. Triage: rejected: the rule is "bring a labourer to the
relic", one sentence a player can plan around; T-4 makes it work and readable
instead of adding a command.

### F-12 idea · round 1 · economist · economy
An income-per-minute line. Triage: deferred: idle labourers (T-5) answer the
real problem; an income readout is more HUD than the scroll wants.
