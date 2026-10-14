# Process overview

## From the brief to the object

The final project brief fixes three requirements — multi-user, real-time,
persistent — and leaves everything else, including what "good" means, open.
Rather than start from a stack and look for a use for it, I started from a
lens this agent has carried since its very first crit — Ni Zan, ink-wash
restraint, "taste is what you leave out" — and asked what a genuinely
multi-user, real-time, persistent object already looks like in that world.
Chinese handscroll
colophons answered directly: collectors have been appending inscriptions to
the same scroll for centuries, an actual distributed, asynchronous,
permanent multi-author object, long before the word "multi-user" existed.
Building a small digital version of that — one painting, a line each, no
account, no edits — gave the brief's three fixed requirements a concrete,
historically grounded shape instead of the median chat room with the nouns
swapped, which the brief explicitly warns against. `README.md`
([`8d76d80`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-yunlin/commit/8d76d80)) argues
this in full, against three read sources.

## Building the smallest version of it

[`334d24f`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-yunlin/commit/334d24f) is the
whole first slice: `node:http` for the server and `node:sqlite` for storage,
both Node stdlib, no framework and no bundler. I checked Node 24.21 (the
version this repo pins) directly before committing to this — it runs `.ts`
files unmodified with no build step, and `node:sqlite` needs no native
module compiled in Docker, which is what let the Dockerfile stay a single
`pnpm install --prod` with no build stage. The core write path (posting a
colophon) is a plain HTML form to a POST route that redirects afterward, so
it works with JavaScript off; the real-time layer the brief expects belongs
to next week and would be additive on top of this, not a rewrite of it.

An anonymous per-browser cookie is the only notion of a visitor — no
accounts, matching what `README.md` argues "who counts as a person" should
mean here. The one accent colour (`--seal`) marks exactly one thing: a
colophon the current browser wrote. That's also how this slice answers the
crit's own bar directly — a stranger writes a line, leaves, and the next
time they load the page (even a different day, even after a redeploy, since
the database lives on the Fly volume at `/data`), their own line is still
there, still marked as theirs.

## Corrections that landed in the harness, not just a retry

Two things got caught and fixed by checking rather than assuming:

- The own-seal spec test
  ([`807906b`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-yunlin/commit/807906b))
  first asserted "yours" appeared somewhere in a 400-character slice after
  the marker text — passed for the wrong reason once, then failed for the
  right reason, since "Add yours" (the compose heading) falls inside that
  window too. Fixed by slicing out exactly the `<li>` the marker landed in.
- `CLAUDE.md` ([`33ef6c8`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-yunlin/commit/33ef6c8))
  states "escape all stored text before templating" as a standing rule, not
  just a thing I happened to do once: every colophon body is a stranger's
  own words, persisted forever and re-rendered to every future visitor —
  the one place here where getting it wrong is a stored XSS hole, not a
  cosmetic bug.

A second-run deepen pass found two more, both grounded in this repo's own
harness rules rather than a generic bug hunt:

- `CLAUDE.md` says `--seal` marks exactly one thing, "this colophon is
  yours" — but `styles.css` also spent it on the kicker line, the form-error
  banner and the readme's blockquote border
  ([`6a3ecdf`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-yunlin/commit/6a3ecdf)).
  Moved all three to `--ink`/`--ink-soft` and added a test that greps every
  `var(--seal)` use, rather than trusting the rule's own wording — a prior
  crit's identical drift went unnoticed for several runs.
- `readBody` buffered an incoming POST with no size cap
  ([`abd5dc4`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-yunlin/commit/abd5dc4)):
  a request skipping the form's own `maxlength="320"` could exhaust memory
  on this single-machine deploy. Confirmed with raw sockets, both a
  declared `Content-Length` over budget and a chunked request declaring
  none. Two fix attempts — destroy the connection, then resume-and-respond
  — both raced a still-writing client into a connection error, caught by
  `pnpm check` flaking against the built image across repeated runs.
  Draining the body to its natural end while discarding past the cap
  ([`9ef7505`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-yunlin/commit/9ef7505))
  removed the race: no memory cost, and it only responds once the
  client's own write has finished.

All four are things a quick manual pass can miss: the seal check only shows
up by rereading the whole stylesheet, not the markup a design argument is
framed around; the body cap only matters once a crafted request, not the
form, is asking. I verified the whole slice against the exact image the
`Dockerfile` builds — built it locally with `sudo docker build`, ran it with
a `--tmpfs /data` the same way `.github/workflows/checks.yml` does, and ran
`pnpm check` against that running container rather than a locally-started
dev process, so what passed is what CI would see. I also drove it with
`agent-browser`: filled and submitted the form, reloaded to confirm the
colophon was still there and marked "yours", resized 1280×800 to 390×844
mid-typing with the value and focus intact, and tabbed through to confirm
the horizontal scroll strip is keyboard-reachable, not just mouse-draggable.

A third-run pass asked the same "what could a crafted request do" question
of the Cookie header, not just the POST body: a `seal=%` cookie — invalid
percent-encoding no real browser sends, but nothing stops any client from
sending it — threw uncaught inside `decodeURIComponent` before any route
ran, crashing the whole process. Confirmed live against the built image: the
container exited, and the single Fly machine this app runs on would have
needed a restart to serve the next visitor. Fixed
([`6b5e6fb`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-yunlin/commit/6b5e6fb))
by treating a cookie `decodeURIComponent` rejects the same as no cookie at
all, deployed the same run, and reconfirmed live at
`https://comp4020-final-yunlin.fly.dev/` — a bug this severe, already live,
wasn't one to leave for the finishing run.

## The stack, and what it costs

Plain `node:http` over a framework (Express, Hono, Astro) costs more
hand-written routing and no middleware ecosystem, for a slice this size —
four routes, no auth, no JSON API — that isn't much. It buys directness:
every request's path from cookie to database to rendered HTML is one file,
readable start to end, which matters more than middleware convenience while
the app's shape is still being decided. `node:sqlite` over `better-sqlite3`
(used on an earlier crit) costs a newer, less-battle-tested API; it buys no
native module to compile in Docker, a real simplification against the
256MB/one-machine constraint this repo runs under. Neither choice is
final — if next week's real-time layer needs more than an `EventSource` and
a `node:sqlite` poll can give, that trade-off gets revisited and recorded
here, not silently abandoned.

## Verifying the crit's own bar directly, not just its local stand-in

Every prior run's Docker checks ran against `--tmpfs /data` (matching CI),
which proves nothing about persistence — a tmpfs is memory-backed and never
survives a restart either, local or real. The actual claim this crit's brief
asks for — "deployed on Fly, doing its core thing for a stranger, with a
trace that's still there when they come back" — had never been checked
against a real restart of the live machine. This run did: with two existing
colophons already on the live scroll from earlier proof-of-life checks,
`flyctl machine restart` (a full Firecracker VM reboot, confirmed in
`flyctl logs` — `SIGINT` to the Node process, volume unmounted, then a
genuine `reboot: Restarting system` and a fresh boot) left both colophons
exactly where they were. Also confirmed, while reading those logs, that the
server's default `SIGINT` handling (process exits, no custom handler) never
risked a torn write: every `addColophon` call is one synchronous
`node:sqlite` statement, so there's no multi-step commit a restart could
interrupt partway through. Clean result, not a bug — but a different kind of
check from every other verification logged here, since it tests the real
deploy mechanism rather than a stand-in for it.

## A permanent entry means a permanent layout bug too, not just a content one

A fifth-run deepen pass asked a question none of the prior ones had: every
check so far treated "a colophon can never be edited or deleted" as a
security/content question (XSS, length, ownership) — never as a rendering
one. `.colophon-body` had `white-space: pre-wrap` but no `overflow-wrap`,
so a single word with no spaces — well under the 320-character limit, as
ordinary as a pasted URL — had no point to break at. Confirmed live before
touching anything: a 300-character unbroken string pushed `document.body
.scrollWidth` to 2203px against an `innerWidth` of 1280, visibly blowing the
page out sideways in a screenshot. Because nothing can ever remove a
colophon, that one entry would have stayed broken for every future visitor,
forever. Fixed with `overflow-wrap: anywhere`
([`487d6bc`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-yunlin/commit/487d6bc)) —
confirmed live afterward (`scrollWidth` back to 736, matching the intended
46rem body width) at both the desktop and 390×844 marking viewports — and
added a grep-based regression test (`spec/layout.test.ts`) in the same
commit, per this repo's own rule that a found bug gets a test, not just a
patched line.

## An untrusted cookie is a write-boundary input too, not just the POST body

A sixth-run deepen pass asked the "what could a crafted request do" question
(already applied to the POST body and to cookie decoding) of one more thing:
the *length* of a cookie this server trusts as an existing identity.
`sealToken` accepted any non-empty cookie value verbatim, with no shape
check, and wrote it into the append-only `colophons` table on every insert
from that visitor. Confirmed live before touching anything: a 15,000-byte
garbage `seal` cookie landed in the `token` column byte-for-byte — unlike the
colophon body, capped at 320 characters at the same boundary, nothing capped
the one other piece of attacker-controlled data this app ever persists.
Since every token this server issues is a `randomUUID()`, the fix
([`791839c`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-yunlin/commit/791839c))
only trusts a cookie matching that exact shape; anything else gets a fresh
real token instead, bounding the column to 36 bytes regardless of what a
client sends. Confirmed live after the fix: the same 15,000-byte cookie now
gets issued a fresh UUID, and the garbage is never stored. Added to
`spec/cookie-safety.test.ts` alongside the existing malformed-cookie crash
test, since both ask the same question of the same input at two different
boundaries (decode safety, then shape).

## The static-file route, checked rather than assumed safe

A seventh-run deepen pass asked the same "what could a crafted request do at
the API boundary" question of a route none of the prior six had touched:
`GET /public/*`, which reads `.${url.pathname}` straight off disk, gated only
by `startsWith("/public/")`. Rather than trust that WHATWG URL parsing
collapses dot segments before that check runs, I confirmed it live against a
running instance: plain (`/public/../README.md`), percent-encoded
(`%2e%2e`), double-encoded (`%252e%252e`), backslash, and encoded-slash
traversal attempts all 404 — the normalisation happens during `new URL(...)`
construction itself, before the route's own prefix check ever sees the
string, so a `..` segment never survives to reach the filesystem read. A
clean result, not a bug, but worth locking in as
[`c1c9fdf`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-yunlin/commit/c1c9fdf):
a regression test, not just a reasoned-through assumption, against whatever a
future refactor of that route does.

A ninth-run cross-read of the whole `spec/` directory found that test was
weaker than it claimed. `fetch` (like `curl` without `--path-as-is`) runs a
path through the same WHATWG parser on the client side, so
`/public/../README.md` left the test process as `/README.md`: five of its
eight cases never sent the server a traversal at all, and the "live" check
behind it had the same blind spot. The server was still safe — its own
parser normalises a raw path just the same — but the test couldn't have
failed for the reason it named. Fixed in
[`e58a34c`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-yunlin/commit/e58a34c)
by sending each path verbatim over `node:http`. The same read surfaced a
second gate I'd never credited: only `.avif`/`.css`/`.svg`/`.ico` are ever
read, and nothing with those extensions exists outside `public/` in the
image, so the route's safety rests on two independent checks, not one.

## Concurrent writes and the artefact's HD-band checks, both closed clean

An eighth-run deepen pass tried two angles crit 7's own write-endpoint
lessons name directly but this repo had never run: whether `addColophon`
holds up under genuinely concurrent requests, and the keyboard/resize/
slow-connection trio the course's artefact criterion names by example.

`addColophon` is a single synchronous `node:sqlite` insert with no
read-then-write check, unlike crit 7's booking overlap logic — a different
shape of claim, but still only a reasoned one until tested. Fired 40 real
concurrent `curl` POSTs (backgrounded shell processes, not sequential
`await`s) at a running instance: all 40 landed, each exactly once, no
crash, no corrupted row. Locked in as
[`e10f004`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-yunlin/commit/e10f004):
`spec/colophon-concurrency.test.ts`, 30 genuinely parallel `fetch` calls via
`Promise.all`, each asserting its own marker appears exactly once on the
page afterward.

The HD-band trio, run against this app for the first time: a full keyboard
walk from `<body>` matched DOM order (header link → scroll figure →
textarea → submit → footer link → wraps), and a fully keyboard-driven
submission (focus, type, Tab, Enter) landed correctly. Typing into the
textarea, resizing live from desktop to the 390px marking viewport with no
reload, then continuing to type and submitting, preserved both the value
and focus with no corruption. A raw CDP script (same flatten-mode
`attachToTarget` technique as crit 7's) throttled the connection to
150kbps/400ms and navigated fresh: the page loaded fully styled in ~5.5s
with no FOUC, correct title/heading/form, and no horizontal overflow —
expected for a plain server-rendered page with no client-side hydration to
race, but confirmed rather than assumed. All three closed clean; no fix
needed.

## A fabricated quote in the README's own sourcing

A ninth-run deepen pass closed two reasoned-but-untested claims about the
`sealGlyph`/`mine` identity logic clean — `sealGlyph` can't throw on any
token shape (an empty-string loop just leaves its hash at 0), and `mine`
can never false-match since both `c.token` and `ownToken` always come from
`sealToken`, which only ever returns a validated UUID on either path — then
turned the content-practices discipline this agent has run on every prior
crit's prose onto `README.md`'s own three cited sources for the first time.
Two checked out exactly: the painting attribution (Wang Yi painted the
portrait, Ni Zan added the pine and rock, 1363, Palace Museum Beijing,
confirmed independently) and the Met essay's "continuous dialogue" phrase
(the source text reads "past and present in continuous dialogue"). The
third didn't: the Hundred Rabbits bullet quoted "a lesser home-brewed tool
tailored specifically to our own needs" as if from the cited interview —
that exact phrase, and nothing close to it, appears anywhere in the source
page (checked against the raw HTML, not a summary). Fixed by replacing it
with two real quotes from the same interview ("if we can use less
technology to solve any one task, we will"; software that "gets smaller
over time, that sheds the superfluous") that support the same point the
bullet was already making, rather than inventing a new one. General
lesson, extending this agent's own standing practice: a citation with
quotation marks is a stronger, more specific claim than a paraphrase, and
needs the source's raw text checked directly, not just the general thrust
of the argument.

## What crit 8 left for crit 9

Crit 9 asks for real-time (a colophon appearing in every open session
within about a second) and one written decision about how the app behaves
with several people writing at once. The schema here is already the
smallest version that can carry both: adding a broadcast on write and
picking what happens when two people submit close together are the two
concrete next steps, not a redesign.

## Crit 9: brushed colophons, seen as they're written

This was one unattended pod run (Opus 5.5) against a brief a pod wrote at
crit 8: a colophon is brushed by hand in ink and closed with a seal, and
everyone with the page open watches the ink arrive. The brief fixed the model
(drafts, sealing, the scroll growing after the painting) and left one
decision open: what other people see while someone writes.

### The argument first, then the decision

The README's argument changed before any code did
([`490f71c`](https://github.com/comp4020-agentic-coding-studio/comp4020-riff8-yunlin-4/commit/490f71c)). "Real-time belongs to the next crit" was no longer true, and
the harness says a change that breaks the argument changes the argument
first. The decision went into `docs/adr/0001-strokes-are-seen-as-they-are-brushed.md`
in the same commit: every stroke live, readers invisible, order on the scroll
by sealing rather than by starting. The case for it is historical. Many
colophons were written at gatherings (雅集), the scroll unrolled on a table,
friends watching one of them write, so live strokes reproduce that company.
A "someone is writing" mark or silence until sealing would both turn the
scroll into a place you post to. The cost is written down too: there's no
private hesitation, and whether watching reads as company or surveillance is
a question no test answers.

The stroke format went into the same ADR before the server existed: integer
points in a 240 × 400 panel, a version, caps sized so the largest legal
stroke is about 3 KB against the 16 KB request limit. Everything after it
(validation, SVG rendering, live events, replay, the timelapse) reads from
that one definition.

### Building it

The server came first as a whole path ([`6a58ea5`](https://github.com/comp4020-agentic-coding-studio/comp4020-riff8-yunlin-4/commit/6a58ea5)): drafts owned by the
seal cookie, strokes posted one at a time and broadcast over server-sent
events, sealing as a single conditional `UPDATE` so two seals at once seal
exactly once, and replay by `Last-Event-ID` from a ring buffer, falling back
to a reload when replay can't be exact. Old typed rows read as sealed through
column defaults, with nothing rewritten. Two crit 8 specs broke on purpose,
since a typed colophon now appears on the scroll and in the transcript; both
were narrowed to the transcript with jsdom, keeping their intent.

The scroll then became the page ([`8741e50`](https://github.com/comp4020-agentic-coding-studio/comp4020-riff8-yunlin-4/commit/8741e50)): a right-to-left scroller,
`min(70vh, 36rem)` tall, the painting first and sheets mounted to its left
the way `scroll.avif`'s own colophons run. Right to left also solves two
problems for free: the scroller opens on the painting with no script, and a
sheet added at the far end doesn't move what a reader is looking at, since
scroll position is measured from the right.

`pnpm e2e` drives real Chrome through two browsers, a hidden-tab catch-up,
JavaScript off and a touch stroke at 390px, then leaves screenshots to read
against the brief's rubric. Its first run found what the HTTP specs couldn't:
a page's own `draft` event can beat the response carrying its id, so the
writer saw their own draft mounted as a stranger's and the brush jumped
mid-stroke. It failed twice without the fix and passed three times with it.
Screenshots also showed the ink reading as marker pen, so strokes became a
filled brush outline from one module the server and browser share
([`3271fc5`](https://github.com/comp4020-agentic-coding-studio/comp4020-riff8-yunlin-4/commit/3271fc5)). A sealed sheet looks the same as it did live.

A review subagent then read the diff adversarially ([`74713ce`](https://github.com/comp4020-agentic-coding-studio/comp4020-riff8-yunlin-4/commit/74713ce)). It found
that a client dropping mid-body crashed the whole process. That bug predates
this run, but every brush stroke now reaches it. It also found that cookieless
scripts could take every draft slot, that replay skipped the backpressure
check, and that a stranger's early strokes could be dropped. All four are
fixed, the crash with a raw-socket spec. A screenshot of a hand-drawn
character found the last one ([`4b8affa`](https://github.com/comp4020-agentic-coding-studio/comp4020-riff8-yunlin-4/commit/4b8affa)): a brushed entry's date had
fallen into the seal's column.

### The breakthrough

Before: the brief described live strokes and a scroll growing after the
painting, and the riskiest-looking parts were the transport and the races.
The races the specs name (seal once, replay exactly, only the owner
writes) came out right on the first pass and stayed green over plain HTTP. After: the bugs that mattered all lived where two clocks meet, a
page's own request and the broadcast that echoes it, or a sheet arriving
while someone reads elsewhere on the scroll. Only a real browser with two
contexts open showed them. The e2e loop with screenshots read against a
written rubric was the harness change that moved the work. Every UI bug in
this run came from it or from the review pass, and none came from the spec
suite.

### Cut, untested, and for a human to review

- Nothing from the cut list was cut, and the timelapse stretch was built
  ([`9538625`](https://github.com/comp4020-agentic-coding-studio/comp4020-riff8-yunlin-4/commit/9538625)).
- Not pushed or deployed from this run: the clone has no remote, and pod runs
  leave pushing to the harness and deploying to CI. The live check the brief
  asks for (a stroke in one session reaching another on the deployed app, no
  sealing on the live scroll) is for whoever looks next. `pnpm check` is green
  against the Docker image built the way CI builds it.
- The checklist is in `docs/progress.md`, not `memory/now.md` as the brief
  asked, because the agent's doctrine says pod runs leave `memory/` alone.
- Untested: the stream caps (200, 20 per address) and the 15-minute stream
  lifetime, since a spec that opens 200 streams would starve every other
  spec file running in parallel; the heartbeat; and the per-address draft
  cap from behind Fly's proxy (`Fly-Client-IP`). The six-draft cap is
  tested in `e2e/` only.
- The brief's "drop and restore one context's network" check was done two
  other ways: Chrome's offline emulation doesn't sever an open
  `EventSource`, so `e2e/` hides a tab (which closes its stream) and catches
  it up, and kills and restarts the server under an open page, which is what
  a deploy does.
- Can't be tested: whether watching a stranger brush feels like company or
  like surveillance, and whether a brushed sheet reads as a colophon.
- For review: the painting is 163px tall and now drawn about 3.5× larger, so
  it's soft. The image was on the leave-alone list. The scroll also opens on
  the title slip and blank mounting silk, as a real handscroll does, so the
  painting is a scroll away.
- For review: the brush is pointer-only. A keyboard or screen-reader visitor
  writes a typed line, which is a colophon like any other.
- Known edge: the same visitor in two tabs sees their own draft in the
  second tab as a stranger's until it's sealed, since ownership is never sent
  over the live channel.

## Crit 10: 山海, a game on a second scroll, read back from the logs

One unattended pod run (Opus 5.5 as orchestrator), against a brief a pod
wrote at crit 9: add a two-player real-time strategy game to Colophon, played
on a map that is itself a handscroll, and make the server's log good enough
that a stranger can narrate a match from it alone. The crit's own bar, "two
people your app tells apart, read from its logs", was the part I treated as
non-negotiable; the game was how the pod chose to make that bar interesting.

### Decisions first

The README's argument changed before any code ([`e45a5a8`](https://github.com/comp4020-agentic-coding-studio/comp4020-riff8-yunlin-4/commit/e45a5a8)): why a contest
belongs on this scroll (gatherings round a scroll were also arguments; a
match leaves a trace only if a player seals its chronicle), the four
creatures each with one rule and one source I actually read, and an honest
paragraph on what the log records about people. ADR 0002 picked the
anonymous seal plus rate limits over more identity, since accounts fight the
README's first decision and would put names into a log that outlives the
crit. It made fog of war part of access control, and enemy ids answered
exactly like nonexistent ones. ADR 0003 fixed one global match slot, a 4 Hz
authoritative tick, commands applied next tick seat 0 then seat 1, and an
in-flight match abandoned and logged on restart rather than replayed. I
pinned the shared contract too, in `src/sim/types.ts` ([`6964082`](https://github.com/comp4020-agentic-coding-studio/comp4020-riff8-yunlin-4/commit/6964082)) and
`docs/match-api.md` ([`6d28106`](https://github.com/comp4020-agentic-coding-studio/comp4020-riff8-yunlin-4/commit/6d28106)), so agents could build in parallel
without colliding.

### Orchestration

I wrote docs and glue and committed; subagents wrote the code, each with its
own files. Opus took the simulation ([`e2aad04`](https://github.com/comp4020-agentic-coding-studio/comp4020-riff8-yunlin-4/commit/e2aad04)), the match server
([`def7492`](https://github.com/comp4020-agentic-coding-studio/comp4020-riff8-yunlin-4/commit/def7492)), the board ([`50a78cf`](https://github.com/comp4020-agentic-coding-studio/comp4020-riff8-yunlin-4/commit/50a78cf)), the blind code audit and the
security fixes. Sonnet took marks and logging ([`6a7cb47`](https://github.com/comp4020-agentic-coding-studio/comp4020-riff8-yunlin-4/commit/6a7cb47)), the narrator
([`e0895a4`](https://github.com/comp4020-agentic-coding-studio/comp4020-riff8-yunlin-4/commit/e0895a4)), the bot ([`7ea0395`](https://github.com/comp4020-agentic-coding-studio/comp4020-riff8-yunlin-4/commit/7ea0395)), the text client ([`9a6a9ba`](https://github.com/comp4020-agentic-coding-studio/comp4020-riff8-yunlin-4/commit/9a6a9ba)),
the access matrix ([`6387a2c`](https://github.com/comp4020-agentic-coding-studio/comp4020-riff8-yunlin-4/commit/6387a2c)) and most fixes. No agent failed or hung.
The cost was waiting: the sim took 40 minutes against a brief that hoped for
25. I spent that time on the README, ADRs, `docs/logs.md` and the board, which
only needed the contract. Twice an agent touched a file another agent held.
The client fixer added a status field to `spec/access.test.ts`, and the sim
fixer stashed and unstashed while another agent's edits sat uncommitted. I
caught both from `git status` and committed by path, one slice at a time.

### What the playtesters found

Three rounds of blind testers (17 testers in all), with two log-only
readers and a code audit alongside, produced 51 findings: 4 blockers, 24
majors, 18 minors and 5 ideas (`docs/feedback.md`). Every accepted finding
became a todo in `docs/progress.md`, and every bug fix got a spec. A finding
counted as verified only when a fresh tester, not the one who reported it,
no longer reproduced it. 21 reached that bar, including all four blockers.
The rest are fixed with a spec but weren't re-reached in play, mostly
creature legibility, since few testers met a creature before the bot arrived.
Three findings changed the game most.

- **Matches were over in six minutes.** All three round 1 testers lost to
  the bot's first wave at about 4:30. Slowing the barracks and spearmen and
  doubling the hall's hp ([`4bbf1c8`](https://github.com/comp4020-agentic-coding-studio/comp4020-riff8-yunlin-4/commit/4bbf1c8)) put human matches at 8 to 11
  minutes, and bot against bot at 11 to 14.
- **The fog leaked through ids.** The blind audit and, independently, the
  adversarial tester saw that one global id counter let a seat count the
  enemy's hidden production from gaps in its own ids. The audit also found
  routes planned on the true map, which made detours reveal hidden
  buildings. Per-side id sequences and paths planned on what a seat knows
  ([`c340a9f`](https://github.com/comp4020-agentic-coding-studio/comp4020-riff8-yunlin-4/commit/c340a9f)) closed both, and ADR 0002 now says what the fog hides
  besides pieces ([`db172e4`](https://github.com/comp4020-agentic-coding-studio/comp4020-riff8-yunlin-4/commit/db172e4)).
- **Any seated visitor could crash the server.** A match stream ended at
  its lifetime stayed in the broadcast set, and the next frame was written
  after the end, an unhandled error that killed the process for everyone. The
  auditor reproduced it 3 times out of 3, and the fix went in with a spec and
  a harness rule ([`52b4598`](https://github.com/comp4020-agentic-coding-studio/comp4020-riff8-yunlin-4/commit/52b4598)).

The log-only reader followed a match but couldn't tell "gave 2 train orders
to 0 units" from a failure, or wall-clock time from game time. The lines and
the narrator were fixed for that ([`f645568`](https://github.com/comp4020-agentic-coding-studio/comp4020-riff8-yunlin-4/commit/f645568)). Then `e2e/match.e2e.ts`
plays the crit scenario in two Chrome profiles and asserts that the narrated
log names each person for each act and holds no token, address or User-Agent
([`0db4778`](https://github.com/comp4020-agentic-coding-studio/comp4020-riff8-yunlin-4/commit/0db4778)).

Rejected majors or blockers, for a human to review: none. Finding F-28 (a
newcomer locked out of their own match after their browser session reset)
was accepted as a legibility fix, not a seat restore. A seat is a seal, and
nothing can hand it back without the accounts the README rules out. Deferred:
showing the pixiu's heading on first sighting (F-37), touch play (F-46), and
an HMAC-signed seal so marks can't be brute-forced (F-25). Marks gate
nothing, they only tell people apart.

Round 3 was meant to verify fixes, and it found new problems, all of them
in the gaps between two things that each worked alone. A raid that started
and ended between two looks gave no warning. Idle spearmen stood twelve tiles
from labourers being killed. A hint vanished after the wrong kind of order.
I fixed all of them with specs, and a targeted re-test and a final newcomer
confirmed the fixes.

What the testers couldn't judge: whether it's fun for two people who know
each other. Every tester played the bot alone, and the only two-human
matches were the e2e script and the access spec.

### Cut, untested, and for a human to review

- Nothing from the cut list was cut. The stretch (a brushed chronicle of the
  revealed map) wasn't attempted. In-flight replay on restart was decided
  against in ADR 0003 (logged abandon) before any code existed, not cut for
  time.
- Not pushed or deployed from this run: the clone has no remote, pod runs
  leave pushing to the harness and deploying to CI, and `flyctl` was not
  used. The brief's live check (a bot match on the live app, a few commands,
  a forfeit, the session read from `flyctl logs` as a mark with no token) was
  done against the Docker image CI builds, with `--tmpfs /data`. There
  `pnpm check` passed, memory stayed at 55 MiB through a live bot match, the
  log file was written to `/data/logs`, and the visitor's token appeared zero
  times in the log. On the real app it's untested, and so are Fly's log
  retention, a log flood on the real volume and a full match on the real
  machine.
- For review: what is logged about people (marks, acts, refusals naming
  both parties; no address, User-Agent, text or token); the flood policy (a
  50-a-second token bucket, 4 × 4 MiB rotation); fog as the access-control
  decision; the single global slot, with an unjoined match lapsing after
  three minutes and a bot match yielding after ten.
- `spec/match-robustness` drives a stalled reader through python3, because a
  Node socket can't shrink its receive buffer. CI's Ubuntu runner has
  python3.
