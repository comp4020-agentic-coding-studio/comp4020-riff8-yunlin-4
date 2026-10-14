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

### F-1 [fixed] major · round 1 · rusher, explorer, economist · balance
What: two of three matches were over inside six and a half minutes, and the
bot's first wave of five or six spearmen arrived at about 4:30 every time.
Expected: 8 to 15 minutes between the bot and a competent player (brief).
Repro: scroll-1, seed 1, any opening; first wave at tick ~1080–1110.
Triage: accepted → T-1. Slow the early military curve (barracks build, spearman
training, hall hp) in balance.ts and move the bot's thresholds into balance.ts,
then re-check with the soak. Not tuned to one tester: all three saw the wave.

### F-2 [fixed] major · round 1 · economist · combat
What: 26 labourers ordered to attack killed five spearmen at the hall for the
loss of one; spearmen beating on a building didn't answer back.
Expected: spearmen to be the answer to spearmen.
Repro: scroll-1, seed 1; `attack all-labourers 54` at tick 1191, 1221, 1236, 1251.
Triage: accepted → T-2. A unit struck while attacking a building turns on its
attacker; labourer damage down.

### F-3 [fixed] major · round 1 · economist, explorer, rusher · legibility
What: deaths read "labourer 4 is gone" / "left view or died", with no cause;
the hall lost hp with no warning; the economist didn't know how they lost.
Expected: to know what killed what, and that the hall is under attack.
Repro: scroll-1, seed 1; explorer `move 4 70 14` (t101), `move 4 52 14` (t161), dies ~t344.
Triage: accepted → T-3. The server already sends fog-filtered `unit.died` with
cause and killer kind (`recentEvents`); the text client and the page must say
it in words, and warn when your hall or barracks is losing hp.

### F-4 [fixed] major · round 1 · explorer · relic, pixiu
What: eight attempts to step a labourer onto the relic (56–60, 15–16) never
claimed it; nothing said why.
Expected: a claim, or a reason it can't be claimed.
Repro: scroll-1, seed 1; moves to (56,15) (57,15) (58,16) (59,15) between t781 and t927.
Triage: accepted → T-4. Check the relic tile is reachable and the pixiu is ever
"away"; a spec moves a labourer onto it with the pixiu far and asserts the
claim; the rules text and `look` say exactly where the relic is.

### F-5 [fixed] major · round 1 · economist · economy
What: home groves ran dry by 3:50 and labourers went idle silently, five times
in one match, twenty idle at a time.
Expected: a warning, or labourers moving on to the next grove.
Repro: scroll-1, seed 1; gather at (108,10) and (108,21) from tick 1; idle from ~t930.
Triage: accepted → T-5. Labourers look further for the next grove they have
seen; idle labourers are shown prominently in both clients.

### F-6 [fixed] major · round 1 · explorer (by absence) · creatures
What: the explorer met only the pixiu in a whole match; the nian, jiaolong and
qilin were never found, so they changed no decision.
Expected: each creature to change a decision.
Triage: accepted → T-6. The rules say where each lives (river head, river,
glade at the river's mouth, the fords), so a player can plan around them.

### F-7 [fixed] minor · round 1 · rusher · commands
What: "can't build there" doesn't say why. Triage: accepted → T-7 (say "not open
ground you can see" / "the footprint is blocked"; only about tiles in view, so
nothing hidden leaks).

### F-8 [fixed] minor · round 1 · economist · commands
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

## Round 2 (21:11–): fresh economist, rusher, explorer (text), newcomer and UX reviewer (browser), adversary; plus a log-only narrator and a blind code audit

Results so far: economist won at 9:55, rusher lost at 8:14, explorer lost at
9:10 and was losing at 6:43. Round 1's F-1 (too short) reads fixed: all three
matches ran 8–10 minutes. The explorer claimed the relic first try (F-4).

### F-13 [fixed] blocker · round 2 · rusher · building
What: a barracks left at 93% when its labourers were sent to gather could
never be finished; `build` on the spot was refused ("a building is in the
way") and `train` "still being built". 200 grain lost.
Repro: scroll-1 (any seed: no randomness); t1 `build 3,4,5,6 barracks 99 14`,
t61 `gather 3,4,5,6 108 9`; stuck from t100.
Triage: accepted → T-11. `build` on your own unfinished building resumes it.

### F-14 [fixed] blocker · round 2 · audit · server
What: any visitor holding a seat can crash the server for everyone: a match
stream that reaches its 15-minute lifetime is ended but stays in the
broadcast set, the next frame writes after end, and the unhandled stream
error kills the process. Confirmed live by the auditor.
Triage: accepted → T-12. Guard every stream write, drop on end, `error`
handler, spec with a short lifetime and a stalled reader, rule in CLAUDE.md.

### F-15 [fixed] major · round 2 · audit · fog
What: one global id counter: a seat's own new ids jump by however many pieces
the fogged enemy made in between (15, 20, 24, 28), so it can read the enemy's
production through the fog.
Triage: accepted → T-13. Ids from per-side sequences; spec that seat 1's
production never shifts seat 0's ids.

### F-16 [fixed] major · round 2 · audit · slot
What: one visitor can hold the only match slot forever against the bot by
sending a command every four minutes.
Triage: accepted → T-14 (one small, documented remedy; no lobby or queue,
which the README rules out).

### F-17 [fixed] major · round 2 · audit · streams
What: stream caps (100, 10 per address) can be filled by others, cutting a
seated player off.
Triage: accepted → T-14 (a seated token is always admitted; a per-token cap).

### F-18 [fixed] major · round 2 · economist · bot
What: the bot never defends its base once its waves are out; the economist
walked into an empty base. Turtling won "too easily".
Triage: accepted → T-15 (home guard, waves muster before crossing). Checked
against the other reports: the rusher and explorer still lost to the bot, so
this is about defence, not about weakening its attack.

### F-19 [fixed] major · round 2 · economist, explorer, rusher · warning
What: labourers raided at an out-of-view grove died with no warning; "enemy
in view" never announced; the rusher's text client showed "nothing new" while
units died (events missing in their client).
Triage: accepted → T-16. Warn when your units are attacked anywhere and when
enemy soldiers first come into view; investigate the rusher's empty event list
(its client may have kept a stale last-tick after `step`).

### F-20 [fixed] major · round 2 · explorer · pixiu
What: the pixiu's loop is unreadable from play; it was seen well off the fords.
Triage: accepted → T-17 (the rules say its loop in map terms; the page and
text client show which way it is heading).

### F-21 [fixed] major · round 2 · UX · legibility
What: side is carried by a tiny 東 mark only; grain marks on groves read as
creatures; creatures never seen in three minutes so "dangerous" unjudged.
Triage: accepted → T-18 (own vs enemy silhouettes stronger, grove marks softer).

### F-22 [open] minor · round 2 · UX · legibility
What: in-view ground is lighter than remembered ground; the brief wants
remembered ground in lighter *ink*. Triage: rejected: the brief's words are
"explored-but-unseen ground is lighter ink than ground in view", and the board
does exactly that (remembered = pale ink on toned silk, in view = full ink on
bright silk); the reviewer read paper tone as ink. Kept, but T-18 checks the
contrast reads that way.

### F-23 [fixed] minor · round 2 · UX · controls
Status line scrolls away; focus ring faint; buttons read as UI boxes.
Triage: accepted → T-18 (sticky HUD, 2px focus ring); button restyle deferred
(the rest of the site uses the same plain buttons).

### F-24 [fixed] minor · round 2 · audit · fog
Pathing into fog plans around hidden enemy buildings; attack-validation
timing differs for existing ids. Triage: accepted → T-13.

### F-25 [open] minor · round 2 · audit · identity
A visitor can brute-force a UUID whose mark matches another's (2^24 hashes).
Triage: deferred: marks tell people apart for a narrator; they were never an
authentication. ADR 0002 says so; an HMAC-signed seal is the fix if marks ever
gate anything.

### F-26 [fixed] major · round 2 · narrate-only reader · logs
What: from the log alone a stranger followed the match but could not tell:
what an "invalid" or unaffordable command was; "2 train orders to 0 units";
"turned on unit 22" (whose, what kind); "took" (killed?); game time vs wall
time (manual ticks).
Triage: accepted → T-10.

### F-27 idea · round 2 · economist · economy
Surplus grain at the pop cap has nothing to buy. Deferred: one resource, one
soldier type is the brief's scope.

### F-28 [fixed] blocker · round 2 · newcomer · seats
What: the browser page went blank mid-match (the testing tool, most likely),
and on return with a new seal the newcomer saw only "A match is under way",
locked out of their own match with no explanation.
Triage: accepted → T-19, as a legibility fix. A seat is a seal (ADR 0002):
a lost cookie is a new person, by design, and nothing can hand the seat back
without accounts the README rules out. The page says so, and that the
abandoned seat forfeits after five idle minutes, freeing the scroll.

### F-29 [fixed] major · round 2 · newcomer · onboarding
What: the how-to-play is in a collapsed panel; mode buttons (Gather, Order,
Build) arm silently; "Play the bot" was a surprise second step.
Triage: accepted → T-19 (visible first-steps line until the first order; a
status line and crosshair when a mode is armed; say what Unroll leads to).

### F-30 [fixed] minor · round 2 · newcomer · legibility
Hills read as squiggles; no legend; map loads half below the fold.
Triage: accepted → T-19 (one ink legend line; scroll the map into view).

### F-31 [fixed] blocker · round 2 · adversary (and audit, F-15) · fog
Unit ids show how much the enemy built (17 → 21 after three hidden labourers).
Same finding as F-15, found independently from outside; fixed by per-side id
sequences before this report arrived. Raises F-15's weight; verified by
`spec/sim-fog` (seat 1's production never shifts seat 0's ids).

### F-32 [open] major · round 2 · adversary · slot
What: create a match and walk away: everyone else gets 409 for ten real
minutes, and the same person can create again at once.
Triage: accepted → T-20. An unjoined match waits three minutes, not ten
(enough to send a friend the link), and the creator can't recreate a match
that just lapsed while someone else has tried to create one in that window.

### F-33 [open] minor · round 2 · adversary · rules
The idle forfeit runs on the wall clock, not game time (visible only under
manual ticks). Triage: rejected for the deployed game, where game time and the
wall clock are the same 4 ticks a second; under manual ticks wall-clock idle is
the right rule, since the tester is the clock. ADR 0003 says "five minutes" of
real time. Rules text says "five minutes", consistent.
