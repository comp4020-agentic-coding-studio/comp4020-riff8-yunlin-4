# Brief: 山海 Mountains and Seas — a two-player strategy game on the scroll, built with playtesters

You have about 4 hours, unattended, start to finish. Nobody will answer
questions, so where something is ambiguous pick the option closest to the
README's argument, record the choice in an ADR or `PROCESS.md`, and carry on.
Keep `main` deployable after every commit. Delete this file (`prompt.md`) in
your last commit.

**Every push to `main` deploys** (`.github/workflows/checks.yml`: Docker build,
`pnpm check` against the image, `pnpm check:evidence`, then Fly). Commit often,
push only at green, stable points, never half a feature. Don't link the game
from the scroll's page until it is playable against the bot (milestone M2
below). If this clone has no git remote, commit at green points and say so in
`PROCESS.md`.

## The crit brief this answers (crit 10, "Fly by instruments")

> Two people your app tells apart, read from its logs.

Source: https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/crits/10-fly-by-instruments/
At the crit, two pod members open the deployed app from its URL alone, in
separate Chrome profiles, and use it side by side while someone narrates **from
`flyctl logs` only**, saying who did what. If the two can't be told apart in the
logs, or one can change or see what belongs to the other, that is the finding.
Done means:

1. Multi-user: two people, own browsers, shared state, told apart. A visitor is
   still an anonymous seal.
2. What each person may see and change is **checked on the server** and
   **documented in the repo with the reasoning** (ADR 0002 below).
3. The server **logs who did what**, and the logging **outlasts the crit**.
4. A stranger can narrate a two-person *match* from the logs alone.
5. The repo shows the process: commits that grow with the work, `PROCESS.md`
   updated, `reflections/crit-10.md` written (`reflections/README.md`).

## Goal

Add a game to Colophon: a small two-player real-time strategy match in the
spirit of Age of Empires, played on a *map that is itself a handscroll*. Two
players unroll the scroll from opposite ends, gather grain, raise a hall and a
barracks, train soldiers and try to take the other's hall, while the land
between them is held by creatures out of Chinese myth that belong to neither
side. Fog of war is **unpainted silk**: you see only what your people have
walked past, and the map is inked in as you reveal it. In the same ink and
silk as the painting, with no sprites. Age of Empires is inspiration for the
*genre* only: don't copy its names, units, art or sounds.

It belongs here, not in a separate app, because of the README's argument (a
gathering of strangers around one scroll) and because the scroll is already a
map. When a match ends, either player may seal a short chronicle of it onto the
scroll as a colophon, so a battle leaves a permanent trace like any other
inscription. The painting and colophons stay the front page; the match is a
second scroll reached from it.

## Where the app is now

Read first: `README.md`, `CLAUDE.md`'s harness rules (no seal token on
`/events` or in another visitor's HTML, strokes validated not clamped, the
own-draft race rule), `docs/adr/0001-*.md`, `docs/progress.md`, `src/server.ts`,
`src/events.ts`, `src/seal.ts`, `src/cookies.ts`, `src/db.ts`, `src/render.ts`,
`public/scroll.js`, `public/ink.js`, `spec/helpers.ts`, `e2e/scroll.e2e.ts`,
the crit 9 account in `PROCESS.md`. In short: raw `node:http` server (Node 24
runs `.ts` directly), `node:sqlite` on `/data`, SSE live strokes, a visitor is
a UUID in an HttpOnly `seal` cookie, brushed colophons, a right-to-left
scroller. The server logs one startup line and unexpected errors, nothing
else. Fly runs one 256 MB shared-cpu machine that auto-stops when idle, plus
one 1 GB volume at `/data`: leave `fly.toml` alone. **Everything the game adds
has to fit that machine.**

## The game (decided; build to this)

Numbers are yours to tune, but put **every number in one file,
`src/sim/balance.ts`**, so playtest-driven tuning touches nothing else.

### Shape

- **One match at a time**, two seats, the seal cookie is the player. No
  lobbies, accounts, names, chat, spectators, replays shown to others. A third
  visitor sees only that a match is under way (and, if a seat is open, how to
  take it). A visitor creates the match, then either waits for a friend to take
  the second seat or presses "play the bot" to fill it. A seat that sends no
  command for 5 minutes forfeits; a match with no command from anyone for 10
  minutes is abandoned. Both are logged. No timers run while no match exists,
  so the machine can still auto-stop.
- **The map is a long strip**, wide and short (aim for about 112×32 tiles, on a
  coarse grid), mirror-symmetric so neither seat has an edge, fixed (hand-built
  as data, not random). The scroller is the camera: players scroll sideways
  along it, the bases at opposite ends. A river crosses the middle with two
  fords; groves, hills and a glade lie between. Reading direction stays
  right-to-left like the painting; say which seat starts at which end.
- **Tick** 4 per second, server-side, deterministic. **The server is
  authoritative**: clients send commands, never state. Target match length is
  8 to 15 minutes between the bot and a competent human.

### Economy and army

- One resource, **grain**, from finite groves. Labourers (勞) gather it and
  carry it to the hall. Labourers also build.
- **Hall** (廳): trains labourers, is the drop-off, and is the thing that, when
  destroyed, loses you the match. **Barracks** (營): built by labourers, trains
  soldiers. **One** soldier type (a spearman). A population cap (about 40 per
  side) keeps the simulation inside its budget; it is also a rule players
  must be told.
- Commands (validated on the server, *rejected not clamped*): `move`, `gather`,
  `build`, `attack`, `train`, `stop`. A command names unit ids, at most 40, and
  a rate cap per seat (about 10 a second). Unit ids are not secret but are
  **never accepted unless they belong to the commanding seat**, and a command
  naming an enemy or nonexistent id must be answered *identically* (a fogged
  enemy's existence must not be probeable through status codes).
- Pathing on the grid (A* with a per-tick budget, or equivalent); say in the
  ADR what you did about units that cannot find a path.

### The creatures (neutral, belong to neither side)

Treat these as figures from Chinese myth and folklore, not "Asian fantasy". Name
each with its characters in the UI and the README, with **one honest line of
source each**. Don't invent citations: only cite what you actually read (web
search/fetch if you have it), else write "inspired by Chinese folklore" and
claim nothing more. Note where a creature is later folklore rather than from
the classics (the *nian* is: it is New Year folklore, not the *Classic of
Mountains and Seas* 山海經). Each creature's behaviour must fit **one
sentence** in the README, because a player must be able to plan around it and a
spec must be able to check it.

| Creature | Role | Rule (one sentence, refine if you must) |
|---|---|---|
| 年 *nian* | Guardian | Sleeps on the richest grove and attacks anything that comes within its leash, then returns to its post and heals. |
| 蛟龍 *jiaolong* | Ambusher | Lurks in the river unseen (hidden even inside your vision) and strikes units on or beside river tiles near it, then dives for a while. |
| 麒麟 *qilin* | Pacifist | Never attacks unless armed units enter its glade or it is attacked; labourers gathering peacefully in its glade work faster, so the question is whether to bring the army. |
| 貔貅 *pixiu* | Patroller | Circles a fixed route around the relic site; whoever carries a labourer to the relic while it is away claims a one-off bonus. |

Four creatures, no more, unless the rest is done and verified.
**If the sim uses randomness at all, it is seeded**, ideally none: nothing here
needs dice. The match must be reproducible from (map, seed, command log).

### Fog of war

Each seat has a visibility set computed on the server from its own units and
buildings. **The server sends a seat only what that seat can see**, as the
map's ground it has revealed plus the entities currently in view (remembered
ground stays inked, entities you can no longer see disappear). The match stream
is per seat and must never carry another seat's hidden entities, any seal
token, or anything but ids, small integers and glyphs. This is the
access-control decision of the game: write it down (ADR 0002).

### Ending, and the chronicle

Destroy the other hall to win. When the match ends, both players see the
result and a **chronicle**: a short text (≤320 characters) generated by the
server from the match log ("鑑 raised its hall in the east; the *nian* took
nine labourers at the grove; 賞's spears crossed the ford at the 11th minute."),
deterministic, no player text in it. Each player is offered a **"Seal the
chronicle"** button; pressing it creates an ordinary *typed* colophon owned by
that player with that text, sealed by the same rules as any colophon (their own
act, exactly once, permanent, nobody edits it). Not pressing it adds nothing to
the scroll. Stretch: instead let the sealed chronicle be a brushed colophon of
the map as it was revealed, drawn with `public/ink.js` and the stroke format of
ADR 0001. Don't touch that format.

### The bot

The bot fills the second seat. It uses **the same command interface and the
same fogged view as a human** (spec: it never reads state through a side
door), plays a competent-but-beatable build order, and is deterministic given
the same view. It is also your headless test opponent and the thing a lone
playtester plays against, so it has to be able to lose and to win.

### Persistence

The sim is a pure function of (state, commands), so persist **the map id, seed
and the command log by tick** in SQLite and write the result when a match ends.
Rebuilding an in-flight match by replay after a restart is a *should*: do it if
it falls out cleanly, else the match is abandoned on restart and that is logged
(an ADR line, not a silent loss). Either way a finished match is reproducible
from its record, and `scripts/replay.ts` runs one headless to a given tick.

## Principles that bind you

From `README.md` and `CLAUDE.md`; if the game truly needs one changed, change
the README's argument first, in the same commit, and say why.

- No accounts, avatars, names, profiles, likes, replies, chat or notifications.
  A player is their seal and nothing else. Nobody stamps another's anything.
- Sealed is permanent: no editing or deleting a sealed colophon, typed, brushed
  or chronicle. Reject at the boundary instead of truncating.
- `--seal` keeps its **one** meaning: "this colophon is yours". **Do not use it
  for units, buildings or map marks.** The two sides are told apart by glyph
  and silhouette in ink (each side's pieces carry that side's seal glyph), not
  by colour. No new accent colour. The only new `var(--seal)` use allowed is the
  sealed chronicle as one of *your* colophons, through the existing
  `.colophon--mine` class. `spec/accent.test.ts` enforces it; extend its
  allowed list only for that.
- Every user-influenced string reaches HTML through `escapeHtml`, including
  anything on the live channel. The match carries none of a player's text, so
  keep it that way: ids, integers, glyphs.
- With JavaScript off the *scroll* still works exactly as today. The game needs
  JavaScript (say so on `/match`, plainly, with no script) and its finished
  matches' chronicles are ordinary colophons that render server-side.
- The README must say what a visitor can expect of watching and being watched:
  now that matches and logs exist it needs one honest paragraph (below).
- `spec/invariants.test.ts` must stay green. The old specs stay green unless a
  change genuinely supersedes one; then edit it deliberately and say so in the
  commit. Don't delete tests to get green.

## The instruments (what crit 10 specifically asks for)

### 1. A name for a person that is safe to write down

The seal token is a bearer credential: it never goes in a log. A visitor's
**mark** is their seal glyph plus six hex characters of a SHA-256 of the token,
e.g. `鑑·3fa9c2`. One small module with a unit spec: stable per token, different
across tokens, not the token. A visitor sees **only their own mark**, quietly,
on their own page, with a line saying it is what the server's log calls them
(that is how a narrator maps a person at a laptop to a log line). It never
appears on `/events`, in another visitor's HTML, or beside someone else's
colophon, and it takes no new colour. Spec each "not in".

### 2. Structured logs that tell people apart

One JSON object per line on stdout from one small module (`src/log.ts`, no
library). Every line has `ts`, `event`, and `who` (a mark, or `"-"`). Log:

- every HTML and API request: method, **matched route pattern**, status,
  duration, `who`. Skip static assets and heartbeats, and say so.
- domain events: `visitor.new`, the colophon and draft events that exist,
  `stream.open/close`, and the game's: `match.create`, `match.join`,
  `match.start`, `match.end` (winner mark, ticks, reason), `match.forfeit`,
  `command` (tick, seat, mark, command type, unit count: never the whole id
  list), `build.start/done`, `unit.trained`, `creature.aggro` (which creature,
  whose unit), `unit.died` (cause: soldier, creature, which), `chronicle.seal`.
- **refusals, with both parties**: a request refused for ownership logs the
  actor's mark and the owner's mark and the reason
  (`{"event":"denied","reason":"not-yours","who":"賞·77c1a0","owner":"鑑·3fa9c2",...}`).
  Caps, rate limits, malformed commands, "not your unit", "match full" all log
  with reason. This is the line a narrator wants most.
- unexpected errors, with stack, route and `who`, never the request body.

**Never in a log**: a token or Cookie header, typed text, stroke points, a
query string with user content, **IP addresses or User-Agent** (a mark tells
people apart; an address would make the log a tracker: if you decide one is
needed, argue it in the ADR first). Anything user-influenced that does reach a
line goes through `JSON.stringify` and a length cap so a crafted path or header
cannot forge a second line; spec that. A logging failure must never fail a
request or kill the process (spec it with an unwritable log path). Never log
every command at full detail if that would flood: say what you aggregate.

### 3. Logs that outlast the crit

Fly keeps only a short rolling window of stdout. Also append the same lines to a
file on the volume (`/data/logs/`, path overridable by env for specs),
**size-capped and rotated** (a few MB per file, a few files, oldest dropped).
The volume is shared with the database and the machine has 256 MB, so a client
that never keeps cookies and mints a visitor per request must not fill either:
write the policy in the ADR. Writes are bounded and non-blocking. **No endpoint
that serves logs**: it would be an access hole in a crit about access control.
Document in `docs/logs.md` (linked from the README) the exact `flyctl logs` and
`flyctl ssh console -C "tail ..."` commands, with `jq` filters for "everything
one person did", "every refusal" and "what happened in the last match".

### 4. The decisions, written down and proven

- **ADR 0002 — who may see and change what**: context, options (default: the
  anonymous seal as it is; plus rate limits; more identity, and why that fights
  the README), decision, costs, and **a table of every route, command and stream
  event**: what a stranger, a visitor, a seated player and the owner may see and
  change, where it is enforced, and the refusal status. The pod will argue for
  the option you didn't pick, so it has to hold up against the README. Fog of
  war and "enemy ids are indistinguishable from nonexistent ones" belong here.
- **ADR 0003 — how the match behaves with several people at once**: tick rate
  and authority, how simultaneous commands are ordered (commands received
  during a tick apply in a deterministic order at the next tick), seat
  ownership and reconnection by cookie, a seat that drops, the match slot being
  global, persistence by replay, and what a slow or hostile client can cost.
- **Audit the server against the table.** Give a subagent the code (not your
  table) and the question "find ways visitor B can read, command or learn about
  visitor A's data, seat, units, or fogged entities, or stop the match for
  others"; look for guessable ids, checks in one route but not another, status
  codes or timing that leak a fogged unit, events carrying more than ids and
  glyphs, a third visitor affecting a match. Fix real gaps. Each gap gets its
  own spec or a new harness rule in `CLAUDE.md` (leave the riff block at the
  top alone).
- **`spec/access.test.ts`**, table-driven: every route and command × {owner,
  other seat, a third visitor, no cookie, forged cookie} against the ADR. It
  should be hard to make the ADR and the code disagree without it failing.

### 5. Narrate from the log

`scripts/narrate.ts`: JSON lines on stdin, one plain sentence per line out,
non-JSON lines (Fly's own) passed through, never a crash. For example
`14:02:19 賞·77c1a0 sent 6 spears to the ford`,
`14:02:31 a 蛟龍 took 3 of 鑑·3fa9c2's labourers at the ford`,
`14:03:02 賞·77c1a0 tried to command a unit that is not theirs: refused`.
Usable as `flyctl logs -a <app> | node scripts/narrate.ts`. One unit spec. It
is what the crit's narrator reads: read its output yourself and ask whether a
stranger would follow the match.

## How you work

**You are the orchestrator, running as Opus 5.5** (whoever launches the run sets
the model; if it's something else, carry on and note it in `PROCESS.md`). You
hold the plan, the ADRs, the README, the feedback file and the checklist; you
triage, review every diff and are **the only one who commits or pushes**.
**You do not write feature code yourself** beyond small glue and docs:
implementation is done by subagents. That keeps your context for judgement over
four hours.

### Implementer subagents

- Default model for bounded module work with tests: Sonnet 5.5. Use Opus for
  the simulation core, the server routes/stream (the fog boundary), and the
  access audit. Your call; note any exception.
- Brief each one fully, because it sees none of this file: the goal, the
  files to read, the files it **owns** (and may edit), the harness rules that
  apply (escape everything, sealed is permanent, `--seal` means yours, no
  tokens in logs or streams, no new dependency), the exact done check, and what
  to return (a short summary, the files changed, anything it could not do).
  Tell it not to commit, to run only its own spec files, and to start any
  server with a timeout on a free port and stop it.
- **File ownership, so parallel agents don't collide.** Suggested slices:
  `src/sim/**` (pure rules, creatures, fog, pathing, balance, with specs);
  `src/bot.ts`; `src/match.ts` + the match tables in `src/db.ts` + the match
  routes in `src/server.ts` and the per-seat stream in `src/events.ts` (one
  agent, because it is the fog boundary and touches shared files);
  `src/log.ts` + `src/mark.ts`; `public/match.js` and match styles in
  `public/styles.css` (one agent); `scripts/play.ts`, `scripts/replay.ts`,
  `scripts/narrate.ts`. Never two agents on one file. Use
  `isolation: "worktree"` if you must overlap, and merge carefully.
- Review each return yourself: read the diff, run `pnpm typecheck` and the
  relevant specs, and re-run the whole `pnpm check` before you commit.
- **Failed or hung subagents:** one that errors, returns nothing or claims
  success while the check fails gets one retry with a narrower brief that
  includes the error text. One that runs more than about 20 minutes on a build
  task (10 on a test run) is stopped and counts as failed. After the retry do
  the item in small steps or cut it. Check `git status`/`git diff` for partial
  edits and finish or revert them.
- Keep your own tool output small (`tail`, `grep`, file ranges). After any
  compaction or long interruption, re-read this file, `docs/progress.md`,
  `docs/feedback.md`, the three ADRs and `CLAUDE.md`'s rules, run
  `git log --oneline -15`, `git status` and `date`, then continue from the first
  unticked item. Trust those files over your memory.

## The playtesters (the backpressure)

Unit specs prove the rules are consistent; they cannot tell you the game is
playable, fair or any fun. Playtester agents are how you find out, and nothing
is "done" until they've stopped finding blockers. They are **blind**: they get
the running game and nothing else.

### What a playtester can use

- **`scripts/play.ts`**, a text client you have a subagent build early (it is a
  milestone M1 deliverable): it joins a match as a seat, prints that seat's
  *fogged* view as text (known ground, own pieces, visible entities, resources,
  tick, events since last call), takes the same commands as the browser, and
  prints the rules (`play.ts help`) from **the same text the match page shows**
  (one source, e.g. `src/rules-text.ts`). If a tester can't work out how to
  play from that text, that is a finding.
- **Manual-tick mode**, because an LLM plays far slower than 4 Hz: an env flag
  (`MATCH_MANUAL_TICKS=1`) under which the match advances only when told
  (`play.ts step 20`). It exists for local test servers only: **the server
  refuses to start with it when `FLY_APP_NAME` is set**, and a spec asserts the
  production boot has it off. It is never an endpoint on the deployed app.
- **The browser** (`playwright-core` as a devDependency, launching installed
  Chrome with `channel: "chrome"`, as `e2e/scroll.e2e.ts` does) for the
  newcomer and UX testers, who play in real time and look at screenshots.
- Each tester gets **its own server instance** on its own port and temp
  `DB_PATH`/log path (the match slot is global, so two testers on one server
  would collide). You start them with a timeout and stop them after.

### The personas

Run these in parallel each round, as subagents, each with the brief below:

1. **Newcomer** (browser, real time). Has never played an RTS. Sees only the
   page. Can they tell within two minutes what to do and what the creatures are?
2. **Economist/turtle** (`play.ts`). Builds up, defends, wins slowly if the
   game lets it. Is turtling dominant, or useless?
3. **Rusher** (`play.ts`). Tries the earliest possible attack. Is there a
   degenerate opening that wins before the bot can respond?
4. **Mythic explorer** (`play.ts`). Provokes and tests every creature and the
   relic and tries to learn each creature's rule from play alone. Does each one
   change a decision? Is any trivial, unfair, or unreadable?
5. **Adversary** (`play.ts` and raw HTTP, local only). Tries to cheat and to
   break it: command units that aren't theirs, probe for fogged enemies, spam
   commands, seize a seat, hold the match slot hostage, malformed commands,
   a stranger touching the match. **Findings here are security findings.**
6. **UX reviewer** (browser, screenshots, against the rubric below). Not a
   player: reviews what the page shows.

Rounds don't need all six. Round 1 uses personas 2–4 (text only, no browser
needed), round 2 uses all six, round 3 uses fresh agents to verify fixes plus
the newcomer.

### The brief you give each playtester (adapt per persona)

> You are a playtester for a small two-player strategy game, 山海 Mountains and
> Seas, running locally at <URL> (use `<play.ts command>` or the browser as
> told). You have **not** seen its code, and **must not read** anything in the
> repo's `src/`, `spec/`, `docs/`, `prompt.md` or `PROCESS.md`: you are
> playing as a stranger would, from the rules text and what you can see. Play
> as <persona>. Play a full match against the bot, or for 25 minutes of game
> activity, whichever comes first. Don't seal anything on any live site. Do not
> start servers yourself. Then report in exactly the shape under "The report each
> tester returns" (paste that section into the brief you give them).

### The report each tester returns

Return it as your final message; the orchestrator is the only writer of files.
For every finding:

- **What happened** and **what you expected**, in the game's own terms;
- **Severity**: `blocker` (crash, can't play, cheat or leak, can't tell what to
  do), `major` (unfair, confusing, a dominant strategy, a creature that doesn't
  matter or can't be understood), `minor`, `idea`;
- **Repro**: the map id, seed and the exact command list (the sim is
  deterministic, so a developer replays it with `scripts/replay.ts`), plus the
  tick where it shows;
- an optional **suggestion**, labelled as one.

Also: a one-line verdict (*would you play a second match?*), the three
moments you remember best, anywhere you didn't know why you lost or why
something happened, and how long the match took.

### The feedback file and the loop

`docs/feedback.md` is the single accumulating record, **written only by you**.
Create it first (a short header explaining the format), then after every round:

1. Append each distinct finding as `### F-<n> [open] <severity> · round <r> ·
   <persona(s)> · <area>` with what / expected / repro, merging duplicates
   (note who else saw it: independent reports of the same thing raise its
   weight).
2. **Triage each one in writing**: `accepted → T-<m>`, `deferred (why)` or
   `rejected (why)`. A rejection needs a reason that cites the README, a spec
   or the brief, not "I disagree". A rejected `blocker` or `major` is also
   listed in `PROCESS.md` for a human to review. `idea`s are accepted only if
   they serve this brief; the rest are deferred, not built.
3. **Every accepted finding becomes a todo** in `docs/progress.md`:
   `- [ ] T-<m> (F-<n>, major) <what> — done when: <the replay or spec that
   now passes>`. The workflow list grows as the feedback arrives; this is the
   point.
4. Dispatch implementer subagents on the todos (give each the F-id, the repro
   and the done check). A fix to a real bug **gets a regression spec, or a rule
   in `CLAUDE.md`** (the harness requires it), ideally built from the tester's
   repro.
5. A finding moves to `[fixed]` when the replay/spec passes, and to
   `[verified]` only when a **fresh** playtester (not the one who reported it)
   no longer reproduces it, or the access spec covers it for security items.
   You do not close your own findings on your own say-so.

### Gates and limits

- **No milestone is complete while a `blocker` or `major` is `open`.**
  Cutting one needs a deferral in writing and a note in `PROCESS.md`.
- Three rounds at most, plus targeted re-tests, so it converges instead of
  looping. Each round: dispatch, collect, triage, fix, then move on; don't
  play the same round twice.
- Don't tune to please one tester: a change prompted by one report is checked
  against what the others found. Balance changes go in `src/sim/balance.ts`
  only, and are re-checked by the bot-vs-bot soak (below).
- Playtest the **instruments** too: in round 2 give a tester only the output
  of `scripts/narrate.ts` (or the raw log) for a finished match and ask them
  to say who did what. Where they can't, the logs are the bug.

## Testing

- **Pure simulation specs** (import `src/sim` directly, no server): the same
  (map, commands) gives the same state at tick N every time; invariants hold
  across a soak of **bot-vs-bot matches on several maps/starts** (no negative
  grain, no unit on a blocked tile, entities within the cap, every match ends or
  hits its tick limit, no thrown errors); each creature's one-sentence rule;
  fog hides what it should; a tick at maximum entities fits its time budget
  (generous bounds, so CI doesn't flake); the bot never reads hidden state.
- **Server specs that need a match** spawn their own `node src/server.ts` on a
  free port with a temp `DB_PATH` and log path, in manual-tick mode, and kill
  it after (the usual HTTP specs in `spec/` check a running app at `APP_URL`
  and must never start a match on a shared or live server). Cover: seat
  ownership, a third visitor, forged cookie, the identical-response rule for
  enemy ids, the per-seat stream carrying no foreign entities or tokens, rate
  caps, forfeit and abandonment, chronicle sealed exactly once, restart/replay
  (or the logged abandon), log lines (no tokens, no addresses, no forgeable
  lines, unwritable log path).
- **Browser checks** go in `e2e/`, run by `pnpm e2e`, never in `spec/`; if
  Chrome won't launch, say so in `PROCESS.md` and rely on HTTP specs, never skip
  silently. Cover the crit scenario: two separate contexts (two Chrome
  profiles), A creates a match, B joins, each commands units, each sees only
  their own fog, B tries A's unit and is refused, one hall falls, both see the
  result, one seals the chronicle. Then read the server's log and assert a
  reader of nothing else can say who did what.
- **Screenshot rubric** (with no criteria an agent always says "looks good"):
  - it reads as a handscroll with ink and silk, not a game UI with a skin;
  - unexplored ground is blank silk, explored-but-unseen ground is lighter ink
    than ground in view, and it is obvious which is which;
  - the two sides, a creature, a building and a labourer are tellable apart in
    ink alone (silhouette and glyph), including to someone who can't see colour;
  - `--seal` appears nowhere on the map; no second accent colour;
  - your resources, tick/time, population and what is selected are readable;
  - nothing scrolls the *page* sideways at 390px (the scroller does that);
    desktop first, touch play is a stretch;
  - the creatures look dangerous without a legend.
  Screenshots go in a gitignored folder.
- No test or tester seals anything on the live site (sealed is permanent). A
  live check may start a bot match, issue a few commands, then forfeit.

## Time, milestones and what to cut

Run `date` first and write the start time down. Compare against the clock at each
milestone.

| When | Milestone |
|---|---|
| 0:00–0:25 | Orient. README rewritten (argument first, headings the invariants spec needs kept), ADR 0002/0003 drafted, `docs/progress.md` and `docs/feedback.md` created, plan written as a checklist. |
| 0:25–1:30 | **M1 — headless match.** Sim, creatures, fog, bot, command validation, match lifecycle, marks and logging, `play.ts`, manual-tick mode, `replay.ts`, pure specs and the bot soak green. Round 1 playtest (personas 2–4). |
| 1:30–2:30 | **M2 — on the scroll.** Per-seat stream, `/match` page and client, seat/join flow, results and chronicle sealing, access matrix, log file + rotation. Triage round 1; fix blockers/majors. Link the game from the scroll page only now. Round 2 (all six). |
| 2:30–3:30 | **M3 — hold up.** Fix round 2, audit findings, balance, `narrate.ts`, `docs/logs.md`, e2e crit scenario. Round 3 verifies. |
| 3:30–4:00 | **Feature freeze at 3:30.** Fixes only. `PROCESS.md`, `reflections/crit-10.md`, final `pnpm check`, push, CI, live check. |

**Cut order when behind**: the stretch (brushed map chronicle), then replay
on restart (use logged abandon), then `narrate.ts` polish, then the pixiu's
bonus, then the nian's healing, then the jiaolong's hiding (it just strikes).
**Never cut**: the server-authoritative match; fog sent per seat; the identical
rejection for enemy ids; marks and the refusal log lines; ADR 0002; the access
spec; the bot; and the playtest rounds' gates. A smaller game that is fair,
legible and honest in its logs beats a bigger one that isn't.

## Track your progress

`docs/progress.md` (replace last run's; `memory/` belongs to the agent's own
ticks, leave it): a checklist in build order, each item with its done check,
ticked only when the check passes, with `date` beside it. Playtest findings add
items as they arrive (see the loop above). At about 1:30, 2:30 and 3:30
compare against the milestone table and cut by the order above if behind.
Commit the progress and feedback files with the work: they are process
evidence.

## Finishing

- `pnpm check` green against the built Docker image (CI's setup: `docker
  build`, then `docker run` with `--tmpfs /data`; the log file and match
  tables must work on a memory-backed `/data`), otherwise against `pnpm start`.
  Run `pnpm check:evidence`; cite only SHAs that exist in this repo.
- `PROCESS.md`: the crit 10 work. What was built and cut; how the orchestration
  went (which subagents, what failed, what you retried); **what the playtest
  rounds found** (counts by severity, the three that changed the game most, any
  rejected blocker/major, what the playtesters could not judge, such as whether
  it is fun for two people who know each other); what is untested (real Fly log
  retention, a flood on the real volume, the full match on the real machine);
  and the decisions a human should review (what is logged about people, no
  addresses, the log-flood policy, fog, the global match slot).
- `reflections/crit-10.md`: the two standing prompts, 150–300 words, not a
  changelog. The README: one honest paragraph on what is recorded about
  players, what never is, who can read it and how long it lives.
- Final commit deletes `prompt.md`. Push, `gh run watch` to the end, fix and push
  again if red. When green, hit the live `/`, start a bot match on the live
  app, play a few commands, forfeit; if `flyctl` and a token are available read
  `flyctl logs` and confirm your own session shows up as a mark with no token,
  piped through `narrate.ts`. If they aren't, say so in `PROCESS.md` rather than
  claiming it.

## Leave alone

The shape of `fly.toml`, the painting, the seal glyph scheme, `escapeHtml`'s
behaviour, the stroke format (ADR 0001), brushed colophons and live drafts
(they keep working exactly as they do), the CI workflow, and the riff block at
the top of `CLAUDE.md`. No new runtime dependency and no game engine, framework
or logging library; `playwright-core` stays dev-only.
