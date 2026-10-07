# MEMORY

Durable self-knowledge, curated run by run; ephemeral state belongs in
`now.md`, not here.

## Aesthetic throughline

Crit 1 (comp4020-crit1-yunlin) established a voice worth carrying forward
where a brief leaves the look open: pre-CSS/brutalist restraint --- system
serif, paper-toned background, classic blue links, one colour held back for a
single accent --- argued through content, not just applied as a skin. That
crit's site is a shrine to Ni Zan (倪瓒), the painter this agent is named
after; the pairing of "sparse ink-wash, empty paper, almost no figures" with
"taste is what you leave out" is this agent's own idea and can be reused as a
lens (not necessarily the literal content) when a future brief's subject
matter is open-ended.

Crit 2 (comp4020-crit2-yunlin, "unsolicited redesign" --- content given, look
open) confirmed the lens travels: kept system serif / paper tone / classic
blue, but the single accent colour became a "seal stamp" (one red, used for
exactly two things: a kicker line and the current-nav underline), argued in
that crit's colophon as the ink-wash equivalent of a single red seal on an
otherwise monochrome scroll. The throughline isn't "reuse Ni Zan content"
--- it's "one held-back accent colour, justified by an ink-wash logic, argued
in prose the site itself carries (usually a colophon page)." Reuse that
pattern, not the specific seal/scroll framing, when a future brief again
leaves the look open.

Crit 4 (comp4020-crit4-yunlin, "an instrument" --- a browser-based musical
instrument, first genuinely non-document brief) confirmed the lens survives
the jump from prose/document sites to an interactive, sound-making page: kept
paper tone, system-serif stack, and the single held-back accent (`--seal`,
the same muted red), but reused it for a single *meaning* --- "this tube is
sounding" --- rather than two fixed roles, since a one-page instrument has no
kicker line or nav underline to hang the pattern on. Worth noting for the
next brief that isn't document-shaped: the pattern generalises as "the
accent marks one recurring event/state in the interaction," not just "two
named UI elements," and it's fine for that one meaning to touch more than
two DOM locations (here: strike glow, focus ring, favicon) as long as they
all mean the same thing. No colophon page was written to carry the prose
argument this time --- the brief's spec explicitly wants a single opening
screen that is the whole instrument, and a second page would cut against
"the browser is the instrument" rather than support it. The argument instead
lives in `PROCESS.md`/the reflection, not in the shipped site --- a
different split from crits 1--2 that future weeks should expect whenever the
brief itself asks for minimal chrome, not just an open-ended look.

Crit 5 (comp4020-crit5-yunlin, "a game" --- one mechanic, no tutorial, a
player can fail) confirmed the lens survives the jump from instrument to
game: kept paper tone, system serif, and `--seal`, again reused for one
recurring meaning rather than fixed roles --- here, "the moment of
decision/consequence," touching the charge meter (filling while committing
to a jump) and the splash rings (the moment a jump fails). Score text also
uses `--seal` since it's the running readout of that same decision loop. No
colophon this time either, same reasoning as crit 4: a no-tutorial one-screen
game brief leaves no room for a second page to carry the argument without
undercutting "the opening screen has to teach itself." Worth continuing to
expect this split (argument in `PROCESS.md`, not a shipped colophon)
whenever a brief specifies a single self-teaching screen, and treating the
"one held-back accent marks one recurring meaning" version of the pattern
(not the original two-fixed-roles version) as the default for any future
non-document brief.

Crit 7 (comp4020-crit7-yunlin, "build the ANU system you wish existed" ---
the first full-stack/database-backed brief, Astro+Drizzle+SQLite on Fly.io)
confirmed the lens survives the jump from a static/interactive page to a
data-backed app with real persistence and cross-tab live state: kept paper
tone, system serif, and `--seal`, reused for one recurring meaning computed
from a live value rather than a static row property --- "this slot is
happening right now," derived from the wall clock (`Australia/Canberra`)
against a booking's stored start/end time, not from any flag stored in the
row itself. No colophon or PROCESS-only argument split question arose here,
since this brief's own `README.md` is exactly the right place to carry the
one-accent argument (the brief expects a README describing what the app
models). Worth treating "the accent's one meaning is computed live against
the data, not stored as a property of it" as the version of the pattern to
reach for whenever a future brief is itself data/state-backed rather than a
static page or a single interactive session.

A fourth deepen-phase run on crit 7 found the "one accent, one meaning" rule
had been silently broken since the very commit that introduced `--seal`
(`917103f`): that commit's own message claimed "the one accent colour marks
exactly one thing," but its stylesheet also used `--seal` for an unrelated
`.error` validation/conflict banner --- present, unnoticed, through several
prior deepen runs that all reasoned about the accent from the room-board
rows the rule is framed around, never by rereading the whole stylesheet for
every `var(--seal)` use. Fixed by moving `.error` to plain ink styling.
General lesson, extending the crit 1--2 "content practices" self-referential-
claim discipline from prose to CSS: whenever a brief states a "one accent,
one meaning" (or similarly absolute) rule, grep the stylesheet for every use
of that custom property directly, rather than trusting a commit message's
own claim about it or reasoning only about the UI surface the rule was
originally framed around --- a second, incidental use is exactly the kind of
thing that's easy to introduce in the same commit that states the rule and
easy to miss on every subsequent read that starts from the rule's own
framing instead of the code.

The final project (comp4020-final-yunlin, opening at crit 8 "It's alive!",
the first genuinely open-ended full-stack brief --- multi-user, real-time,
persistent, "good" entirely the agent's own call) confirmed the lens
extends one layer further than any prior crit: past visual style (crits
1--2), past a single interaction session (crits 4--5), past a data-backed
app with no fixed subject (crit 7's room board), to *choosing the app's own
core mechanic* from the throughline itself. Rather than build a generic
multi-user app and skin it, the brief's three fixed requirements (multi-
user, real-time, persistent) were read against Ni Zan's own world first:
Chinese handscroll colophons --- collectors appending inscriptions to the
same scroll over centuries --- are a real, historical, distributed,
asynchronous, permanent multi-author object, and building a small digital
version of that (one real public-domain painting, one line each, no
account, no edits, an anonymous per-visitor "seal" standing in for a name)
gave the brief's abstract requirements a concrete answer instead of risking
the median chat-room-with-the-nouns-swapped the brief explicitly warns
against. `--seal` (here, a literal reference: the accent is styled after a
real vermilion seal-ink stamp) keeps the one-recurring-meaning pattern
again, now meaning "this colophon is yours" rather than a UI role pair. Worth
carrying forward for any future brief in this vein: when a brief fixes
abstract technical requirements and leaves the subject open, look for a
domain the agent's own established lens already has a genuine, historically-
grounded fit for, rather than treating "what good means" as a free-floating
essay question answered after the build.

## Full-stack write-endpoint practice (crit 7)

**The API boundary, not the HTML form, is where a full-stack deliverable's
malformed/malicious input actually arrives, and this repo's own spec tests
already prove it** --- `spec/booking.test.ts` posts to `/api/bookings` over
raw `fetch`, bypassing every constraint the form's own `<select>`/`type=
"time"` inputs enforce, which means any future crafted request (a bug in a
client, an attacker, a copy-paste of a bad request) can too. Crit 7's write
endpoint validated `roomId` as merely "an integer" and time strings as
merely "start lexicographically less than end," which meant: a nonexistent
`roomId` reached the database, tripped the (already-enforced) foreign-key
constraint, and crashed with an unhandled `SqliteError` and a raw 500 ---
the only endpoint response shape in the whole app that wasn't a clean
redirect; and a garbage time string like `"0"`/`"9"` that happened to sort
correctly by the one check present got written verbatim, corrupting the
exact column the overlap check and the accent-colour "happening now" logic
both string-compare against. Found by reading the write endpoint fresh with
a "what could a crafted request bypassing the form do here" question, then
confirmed live with `curl` (not just unit tests) against both the local
built server and, after fixing and redeploying, the live Fly URL directly.
Fixed by validating room existence (`listRooms().some(...)`) and a strict
`YYYY-MM-DD`/`HH:MM` regex shape at the API boundary, per this project's own
CLAUDE.md instruction to validate at system boundaries rather than
everywhere. General lesson for any future full-stack/database-backed
deliverable in this course: once a write endpoint exists, ask what a raw
`fetch`/`curl` past the browser's own input constraints could write into
the schema, and check it live against a running server (local build first,
then the redeployed live URL) rather than trusting that the HTML form's
`<select>`/`type="time"`/`required` attributes are the only path in ---
they aren't, and the spec's own test style (posting directly to API routes)
is proof of that on this very template.

**Astro's compiler trims a whitespace-only text node that sits directly
before an element's own start tag, rather than collapsing it to a single
space like ordinary HTML line-wrap.** Crit 7's `index.astro` had
`<a href="/readme/">the README</a>` starting its own source line, right
after a line ending in "…what's free — see"; the built HTML had zero
whitespace between "see" and the anchor, rendering as "seethe README"
glued together in a real browser. A line break *inside* the same text
node (e.g. between "free" and "— see" a few words earlier in the same
paragraph) collapses to a space exactly as expected --- only the newline
immediately preceding a tag gets dropped outright. Found on a mobile-
viewport `agent-browser` screenshot (a routine deepen-phase pass, not a
targeted hunt for this), confirmed by `curl`-ing the built server's raw
HTML rather than trusting the screenshot alone. Fixed by moving the
anchor onto the same source line as the word before it, keeping the line
break inside one text node. General lesson for any future Astro-based
deliverable: a hyperlink or other inline element starting its own line in
a `.astro` template's prose is a latent missing-space bug, invisible to
`astro check`/`tsc`/vitest (nothing about it is a type or test-assertable
error) and easy to miss on a desktop screenshot where justified text can
still look plausible --- worth grepping prose paragraphs for an inline
element beginning a fresh source line, or just keeping inline links on
the same line as their surrounding words from the first draft.

## Content practices

When prose makes a specific, checkable claim --- a date, a name, an
attribution, a "this page does X" claim about the site itself --- verify it
before shipping rather than trusting memory or a first draft. Crit 1 caught
three, in two distinct categories:

- **Self-referential claims about the site's own markup/design**, checkable
  against the code on the same page: `colophon.html` claiming a motif ran on
  every page when it only existed on one (checked against the rendered
  site), and later claiming its own SVG motif was "three horizontal lines"
  when it's actually one horizontal line plus five vertical strokes (checked
  by counting the `<line>` elements two paragraphs above the claim). Both
  were caught on separate passes despite the SVG source sitting right there
  --- a design self-description needs the same scrutiny as a historical one,
  and doesn't get caught by proofreading for rhythm or by fact-checking
  external claims, since it's neither.
- **External historical/factual claims**: `rongxi.html` misattributing a
  painting's dedication (checked against China Online Museum / NPM
  exhibition notes, not memory). `ni-zan.html`'s biography (birth year/place,
  courtesy name Yuanzhen, the ~1352 property-giveaway timing relative to the
  Red Turban Rebellion, the "yi qi" colophon philosophy) got the same
  treatment a few runs later, against Britannica, China Online Museum, and
  a third independent source (Ink & Brush) --- and checked out clean, no fix
  needed. Worth noting: this page had never had an explicit fact-check
  logged before, despite being the most fact-dense page in the site and
  present since the very first build commit --- it's easy to fact-check the
  page a bug was already found on and assume the others are fine by
  association.

All three were plausible-sounding and all were wrong. Worth a deliberate pass
of *both* kinds whenever a future brief's content leans on factual detail or
describes its own design --- treat "here's what this page/motif/layout does"
as its own checkable-claim category, not a subset of proofreading.

Crit 2 added a fourth failure shape to watch for: **the same fact stated
twice with two different numbers, neither one wrong in isolation.**
`index.html` said TUG's typesetting system was "45-year-old"; `tex.html`'s
meta description said it was "still used forty years on" --- both about the
same 1978 start date, on the same site, five years apart from each other.
Neither claim looks wrong read alone (a fresh single-page proofread would
pass both), and it isn't the "wrong count on one page" shape from crit 1
either --- it only surfaces by holding two pages' claims about the same fact
next to each other. Fixed by rewording both to non-numeric "decades-old" /
"decades on," per the existing lesson below that a loose term is safer than
a specific number when the number is going to keep drifting anyway (here,
against each other, not just against the calendar). Worth a deliberate
cross-page pass --- not just per-page --- whenever content repeats the same
fact (an age, a count, a date) more than once across a multi-page site.

Not every self-referential claim is a bug waiting to be found, though, and
it's worth telling the two failure modes apart. `colophon.html`'s "Type is
the system serif" describes an ordered fallback stack
(`Georgia, "Times New Roman", Times, serif`) rather than the bare `serif`
keyword --- but "system serif" is standard shorthand for "no webfont, use
whatever serif the OS has," which an ordered stack is exactly how you
implement portably. Judged this a defensible use of shorthand, not a false
claim, and left it alone after two passes considered it. Contrast with a
fourth self-referential check this same crit: "drawn once and repeated on
every page" (colophon.html, about its own motif), verified by diffing the
SVG block across all four pages --- genuinely identical, so this one checked
out true. The lesson: checkable design-claims are worth verifying against
the code every time, but verification sometimes confirms the prose rather
than correcting it, and a specific count or coverage claim (wrong twice
here) is a different risk level than a loose descriptive term like "system"
or "a handful" (not wrong, just imprecise by design).

Assignment 2 (comp4020-ass2-yunlin, a fictional course built around
apophatic theology and Ni Zan) found a fifth failure shape, a cousin of
the "same fact, two numbers" one above but about *computing* a fact
rather than repeating it: **the elapsed time between two real historical
dates, stated as a rhetorical flourish, invented independently twice and
wrong both times in the same direction.** A lecture said Maimonides
answered Pseudo-Dionysius "three centuries later" (actual gap, c. 500 CE
to c. 1190: about seven centuries) and a slide deck said the apophatic
move went "twelve centuries before it needed a name" via Taleb's
`Antifragile` (actual gap to 2012: about fifteen centuries) --- both
undercounted by roughly 300--400 years, each written without doing the
subtraction against the two dates already sitting in the same
paragraph's own claims. Caught by a `WebSearch` for each figure's actual
dates rather than trusting the arithmetic. Worth explicitly subtracting
the two dates a "N centuries/years later" claim depends on, not just
verifying that each named event/date is individually real, whenever
prose states an elapsed-time relationship between two historical facts.
The same run also found a same-shape-different-domain bug: two pages
called a `role: tutor` person a "convenor" (a defined role enum on this
template, with only one person actually holding it) --- worth checking
a person's asserted title/role against their own frontmatter field
wherever prose refers to them collectively ("both convenors," "all the
teachers"), not just checking each person's own bio page in isolation.

## Redesign-brief practice (crit 2)

When a brief hands the agent someone else's real content to restructure
(crit 2's "unsolicited redesign" of a real organisation's site), the
content-practices discipline above --- verify, don't trust memory or a first
draft --- extends to *sourcing*, not just claims already drafted. Picking
tug.org (TeX Users Group) as the target, every fact used (founding year,
Knuth's `Art of Computer Programming` history, the postal address, membership
aims) was pulled by `curl`-ing the organisation's real pages directly and
reading the raw HTML, not from a `WebSearch`/`WebFetch` summary of the site.
Two reasons this mattered here specifically: `WebFetch` returned a flat 403
on tug.org (some sites block it outright, so it can't always be reached even
if you wanted the shortcut), and a search engine's paraphrase of "what the
site is like" is already one layer of restructuring removed from the ground
truth a redesign brief is asking the agent to improve on honestly. `curl` on
the same URL worked fine. Worth trying `curl` before concluding a page is
unreachable, and worth doing so anyway even when `WebFetch` succeeds, since a
redesign's whole premise depends on the *original* being read accurately, not
summarized.

A second lesson from the same crit: **picking the subject is itself a design
decision**, not a precondition to design. Choosing an organisation whose own
mission (typesetting quality) makes the redesign's thesis checkable and a
little ironic (their site about good typesetting isn't itself well-typeset)
did real argumentative work that a safer, more generic choice (a local café,
a gym) wouldn't have. Worth spending real deliberation on the subject choice
itself next time a brief leaves it open, rather than treating it as a fast
precursor to the "real" work of building.

## Deepen-phase practice

Once content and rendering checks are both settled and read passes hit
diminishing returns, the temptation in a long deepen phase (days of >24h-out
runs with nothing newly broken) is either to manufacture a redundant pass or
to declare victory. A third option earned its keep in crit 1: re-read the
whole site fresh looking for a real, checkable *absence* rather than a wrong
claim --- a spec line the site asserts about itself ("a committed visual
style") that isn't actually backed up anywhere (crit 1: no favicon, every
tab silently using the browser default). The habit that keeps this from
becoming its own busywork: verify the absence is real before spending a
commit on it, the same "check it, don't assume it" discipline as the content
practices above, applied to gaps instead of claims --- `curl` the built site
for the missing asset (favicon.ico 404 confirmed) and check `agent-browser
console` to confirm it wasn't already failing a stated bar (no console
error logged, so this was polish, not a regression). Cheap to check, and
it's the difference between a genuine improvement and inventing work to
look busy.

Crit 2 hit the exact same absence --- no favicon, confirmed missing from
every page's `<head>` before adding one --- which makes it worth promoting
from "a thing crit 1 happened to find" to a standing item on the deepen-phase
absence-check for this starter template specifically: it doesn't ship one,
and it's cheap enough (one small SVG reusing the site's own accent colour,
one `<link rel="icon">` per page) to just check and fix routinely rather than
wait to rediscover it each time.

Assignment 1 (comp4020-ass1-yunlin, a gerrymandering explainer) hit it a
third time, in a different repo built from the same starter --- confirms
this is a property of the starter template itself, not something specific
to the crit repos, so check for it on every deliverable built from this
template, assignments included. Fixed the same way: an SVG favicon that
reused the site's own two accent colours already in `styles.css`
(`--party-a`/`--party-b`, a 60/40 pie split matching the fixed vote share
the mechanic is about) rather than inventing a new colour, one `<link
rel="icon">` in the single `index.html`.

A related question that comes up once the absence-check is also exhausted:
whether to widen scope, since a brief that only asks for "a handful of
pages" rarely sets a hard ceiling. For crit 1 the answer was no --- the
site's own thesis is "taste is what you leave out," so padding it with more
pages for the sake of having more would undercut the argument the site
makes about itself rather than strengthen it. Restraint-themed work has an
unusually low scope-creep ceiling: check what the site is *arguing*, not
just what the brief technically permits, before treating "I could add more"
as a deepen-phase task.

The 24h finishing-steps threshold in the doctrine is a guideline for a
judgment call, not a literal clock to wait out. Crit 1's last few deepen
runs (28h down to ~39h out) had already exhausted both the content
read-passes and the absence-check, to the point that `now.md` itself
flagged repeating the same "not enough time elapsed" due-diligence check
every run as the busywork the deepen phase warns against. At 28h --- close
to but technically still outside the 24h mark --- the right call was to
start the finishing steps anyway (reflection, final sensor sweep, browser
pass at both viewports, commit, push) rather than run one more no-op pass
waiting to cross the line. The tell: if a fresh deepen-phase pass would
have nothing new to check, that's the signal to finish early, not a reason
to wait for the threshold to become literally true.

When several consecutive deepen runs on the same deliverable have already
re-checked source, links, audits and a manual keyboard pass with nothing new
turning up (assignment 1, ~117h out, after two prior runs found nothing),
the rubric itself is a source of genuinely new, non-redundant checks: its
HD band for the artefact criterion named a specific scenario --- "holds up
under use it wasn't designed for: the keyboard, a resize mid-interaction, a
slow connection" --- that hadn't been tested yet, distinct from the earlier
keyboard-only pass. Ran it with `agent-browser`: selected a district,
redrew one cell, resized the live session from 1920x1080 to 390x844
mid-interaction (`agent-browser set viewport`, no reload), and confirmed
the redrawn cell kept its new district state and styling, the mechanic
still worked post-resize, and Tab/Enter still moved focus onto the correct
rebuilt button afterward. All held up; nothing to fix, but it closed a real
verification gap the rubric explicitly names rather than repeating a check
already known to be green. Worth doing this --- reread the marking bands
themselves for a named scenario not yet tried --- before declaring a
deepen phase truly dry, on any future deliverable whose rubric spells out
specific resilience scenarios.

## Working environment

- **Two `memory/now.md` files exist for this agent, and only one of them is
  the doctrine-mandated hand-off.** `agents/yunlin/memory/now.md` (sibling to
  every deliverable repo, imported nowhere by any `CLAUDE.md`) is a stray
  duplicate; `<deliverable-repo>/memory/now.md` (e.g.
  `comp4020-ass2-yunlin/memory/now.md`) is the real one --- it's what the
  doctrine's "memory/ is yours, and it publishes with your work" means, and
  it's what the repo's own git history shows being committed every run as
  "memory: hand off state..." Assignment 2's fourteenth run ran `cat
  ../memory/now.md` from inside the deliverable repo, which silently
  resolved to the wrong (stray, unpublished) file one level up, and wrote
  that run's hand-off there before catching the mismatch by diffing it
  against the repo-local file. Always resolve `memory/now.md` to a path
  literally inside the current deliverable repo's own working tree (`ls
  memory/` from the repo root, or an explicit `<repo>/memory/now.md`) rather
  than a bare relative `../memory/now.md`, which depends on cwd and can
  land outside the repo entirely.
- **Making a deliverable repo public / turning on GitHub Pages is not this
  agent's job.** The doctrine is explicit: "the trusted harness scans,
  publishes, deploys and freezes the exact commit you pushed; you never
  receive its GitHub credential." Confirmed concretely in assignment 1 at
  111h out: `gh auth login` is unconfigured in this environment, so there's
  no credential to act with even if the doctrine didn't already say not to.
  A prior `now.md` draft drifted into treating "make the repo public per the
  submission mechanism" as a finishing step for this agent to do —
  corrected; my job stops at a clean, pushed commit. Worth re-checking this
  file against the doctrine text if a future `now.md` hand-off ever again
  implies publishing/deploying is something to act on directly.
- A fresh shell needs `mise trust /home/ben/.config/mise/config.local.toml`
  before any `pnpm`/mise-shimmed command works --- it errors with "not
  trusted" otherwise. Safe to trust; it only holds low-stakes env vars per
  Ben's global CLAUDE.md.
- `agent-browser`: launching with `--width`/`--height` on the *first* open of
  a session reliably times out on `Page.navigate` (Chrome also needs `--args
  "--no-sandbox"` in this container). Reliable sequence: `open <url>` once
  with no size args to get a live session, then `agent-browser set viewport
  <w> <h>`, then `open <url>` again --- that combination actually changed
  `window.innerWidth`/`innerHeight` in testing, unlike passing size flags to
  `open` directly.
- This template's stylelint config (`stylelint-config-standard`) wants
  **range context** media queries (`(width <= 480px)`, not `(max-width:
  480px)`) and the **shortest valid hex** for colours (`#00e` not `#0000ee`)
  --- catches these on the first `pnpm check`, not before. Worth writing CSS
  with both in mind from the start in future weeks using the same template.
- Same config's `no-descending-specificity` rule fires on **source order
  relative to specificity**, not on any one rule being invalid: a plain-element
  selector (`a`, `footer a`) written *after* a higher-specificity one
  (`.site-title a`, `a:visited`) that touches the same property fails, even
  across unrelated sections of the file, and `vite build` succeeds while it
  does. Crit 2's stylesheet hit this three times in one `pnpm check` run
  because element selectors (`a`, `h1`, `p`) were interleaved after
  class/attribute selectors. Fix: order the whole file low-to-high specificity
  --- bare elements first, then layout containers, then component
  classes/attribute selectors last --- from the first draft, not as a
  post-hoc reorder (fixing one error exposes the next, one at a time).
- `pnpm add` can fail with `ERR_PNPM_UNEXPECTED_STORE` (store at
  `~/.local/share/pnpm/store/v11` vs a project-local one it wants to switch
  to) --- fixed by pinning the existing store. The specific path varies by
  repo (each repo's own `node_modules` records which store it was installed
  against, and pnpm's error message names the one it wants): assignment 1
  needed `--store-dir /home/ben/.local/share/pnpm/store/v11`, but crit 4
  needed the opposite direction, a *repo-local*
  `.local/share/pnpm/store/v11` under the checkout itself --- read the
  `ERR_PNPM_UNEXPECTED_STORE` message's own two paths rather than assuming
  either direction from memory.
- Lighthouse accessibility/performance audits don't need a second browser
  install: `chrome-launcher`'s `launch({ chromePath })` can point straight at
  the Chrome binary `agent-browser` already keeps at
  `~/.agent-browser/browsers/chrome-<version>/chrome`, with flags
  `["--headless=new", "--no-sandbox", "--disable-gpu"]`. Used this in
  crit-1's `scripts/audit.ts` to wire the accessibility+performance sensor
  the starter template names but doesn't provide --- worth reusing whenever a
  future week's template has the same gap. Ported directly into assignment
  1's `scripts/audit.ts` (same script, `check:audit` script name, same two
  new devDependencies) and it paid for itself immediately: first run found
  two real defects a green `pnpm check` and a manual `agent-browser`
  keyboard pass had both missed (see the next bullet, and the label-mismatch
  one below) --- worth running once any widget has custom ARIA, not only
  once per template as a box-ticking exercise. Ported a third time into
  crit 4 (bamboo chimes) at 141h out, mid-deepen, specifically because a
  fresh "is the deepen list really dry" pass found this sensor had never
  been wired for that repo at all --- and this time it came back **100/100
  clean on the first run**, no defects. Worth recording the null result
  alongside the two positive ones: the pattern is worth porting on its own
  terms (a real accessibility+performance sensor a green `pnpm check`
  doesn't provide), not just because it has a track record of finding bugs
  --- a clean result is still a genuine check discharged, not evidence the
  porting was wasted effort.
- Lighthouse/axe's `label-content-name-mismatch` check treats **any**
  `aria-hidden="true"` DOM text node as a "visible label" that must be
  echoed in the element's accessible name --- being `aria-hidden` doesn't
  exempt it, even though that same text is (correctly) excluded from the
  accessible name computation itself. Assignment 1 had per-cell party
  letters and district-number badges as `aria-hidden` spans purely for
  sighted-user visual reinforcement (the full description already lives in
  the button's `aria-label`), and every one of the 50 grid cells failed the
  check. Fix: move that decorative text out of DOM text nodes entirely into
  CSS generated content (`content: attr(data-party)` / `attr(data-district)`
  via `::before`/`::after`) --- generated content isn't part of
  `textContent` so the check no longer sees it, and it's a more accurate
  model of what that text always was (decoration, not an independent
  label). Contrast colour failures on the same audit run are the plainer
  case: `--party-a`/`--party-b` text at 4.18:1/3.74:1 against the page
  background were both under WCAG AA's 4.5:1 floor for bold body text;
  darkening the same hue (keep favicon/JS colour constants in sync if a
  favicon or canvas fill duplicates the CSS custom property in hex) is the
  whole fix. Worth checking both audits on any widget with custom ARIA or
  a light-background accent colour, even after a clean manual pass ---
  they catch a different failure family than a keyboard walk does.
- `agent-browser find text "<X>" click` matches whichever element contains
  that text first, silently, with no error if it's the wrong one --- in
  assignment 1 it clicked a `<strong>B</strong>` in a paragraph instead of a
  grid cell whose visible letter was also "B", and the resulting screenshot
  looked identical to before, reading as "nothing happened" when actually a
  different click just landed. `agent-browser snapshot` (accessibility-tree
  dump with `[ref=eN]` ids) followed by `click "ref=eN"` is the reliable
  pattern once a page has more than one element sharing visible text ---
  re-run `snapshot` after any render that could have replaced the DOM, since
  a stale ref fails to resolve rather than clicking the wrong thing.
- **jsdom does not model keyboard-focus loss on DOM-node removal the way a
  real browser does.** A widget whose click handler does
  `container.innerHTML = ""` and rebuilds children (a common pattern for
  "re-render on state change") will silently drop focus to `<body>` in
  Chrome on every click --- but a jsdom-based interaction test that only
  asserts the resulting DOM state (text, aria-labels, attributes) stays
  green straight through that regression, since jsdom's activeElement
  behaviour around removed nodes doesn't reproduce the real-browser gap.
  Assignment 1's `spec/interaction.test.ts` was fully green while the live
  page bounced a keyboard user back to the top of the document after every
  click. Only caught by manually driving the dev server with `agent-browser`
  (`press Tab`, `press Enter`, then reading `document.activeElement`) rather
  than trusting the automated suite. Any future widget with a
  rebuild-on-click render pattern needs this specific manual keyboard check
  --- it is not a case automated jsdom tests can substitute for, however
  thorough the assertions.
- **`:nth-child` miscounts the moment a decorative, non-repeating sibling
  sits among the repeated items it's meant to style.** Crit 4's chime rack
  had a `<div class="beam">` as the grove's first child before seven
  `<button class="chime">` siblings; `.chime:nth-child(2)` through `(8)` was
  meant to give each button a distinct height but every index was off by
  one, so the wrong buttons got the wrong heights. `tsc`, `vite build` and
  the vitest suite all stayed green --- nothing about that bug is
  type-checkable or assertable from markup structure, it's purely a rendered
  proportions bug --- and it was only visible once actually screenshotted in
  a browser (per the standing "open it and look" practice). Fixed by
  dropping the sibling-counting selector entirely: an inline
  `style="--h: 88%"` custom property per button plus one CSS rule
  (`height: var(--h, 100%)`) is both more robust (survives a sibling being
  added/removed/reordered) and easier to read than any `:nth-of-type` fix.
  Prefer explicit per-element custom properties over `:nth-child`/
  `:nth-of-type` arithmetic for per-item variation whenever the list of
  repeated elements might have any non-repeating sibling nearby (a
  decorative wrapper, a label, a beam) --- don't wait for the visual bug to
  reintroduce the lesson.
- `agent-browser drag <src> <dst>` (CSS selectors, not refs) drives a real
  pointer-down/move/up sequence across two elements in one call --- useful
  for exercising a continuous multi-target gesture (crit 4's drag-strum
  across four chime buttons) without hand-rolling `move`/`down`/`up`
  primitives, which this CLI's `--help` doesn't actually expose as separate
  subcommands despite mentioning them in usage text.
- A screenshot taken immediately after a gesture on a *physically-modelled*
  (not just CSS-transitioned) widget can look broken purely from timing, not
  from a real bug. Crit 4's drag-strum screenshot showed the struck tubes
  visibly skewed/leaning --- read at first glance as a stuck transform --- but
  a second screenshot ~1.5s later showed them settled back to vertical: a
  deliberate sway-on-strike animation, not stuck state. The fix for that
  false alarm was "wait and reshoot," not "go read the animation code."
  Worth a deliberate pause-and-reshoot before logging any visual anomaly as a
  bug on a widget whose whole point is a continuous physical decay/settle
  curve rather than a snap transition.
- `agent-browser set media light reduced-motion` emulates
  `prefers-reduced-motion: reduce` on a live session; combined with a
  strike/click and an `eval` reading `matchMedia(...).matches`,
  `getComputedStyle(...).transitionDuration`/`.animationName`, and the
  `errors`/`console` output, it's a direct way to confirm a
  `@media (prefers-reduced-motion: reduce)` CSS block actually disables the
  motion (crit 4: `styles.css`'s block zeroed transition/animation as
  expected) without silently breaking the interaction path it decorates
  (the chime's strike-to-sound handler fired with no errors, class still
  applied). A CSS media query's mere presence in the stylesheet --- which a
  build/lint pass can already confirm --- doesn't tell you the reduced path
  still works end to end; worth this specific browser check on any widget
  that both animates on interaction and makes sound or changes state on
  that same interaction.
- A DOM test confirming a control is a real `<button>` (keyboard-focusable
  by markup) is not the same claim as "a keyboard user can actually trigger
  the sound," whenever the sound is gated behind the Web Audio autoplay
  policy ("the context starts suspended until a user gesture resumes it").
  jsdom has no autoplay policy to violate, so `spec/instrument.test.ts`
  passing on chime buttons being real `<button>` elements says nothing
  about whether a real browser treats an Enter/Space-triggered click as the
  qualifying gesture. Checked live in crit 4: wrapped the `AudioContext`
  constructor via `agent-browser eval` to capture the instance
  (`window.AudioContext = function(...a){ const c = new orig(...a); window.__ctx
  = c; return c }`), tabbed to a chime, pressed Enter, read
  `window.__ctx.state` --- `"running"`, no console errors; repeated with
  Space on a second chime, `.struck` class applied too. Clean result here,
  but worth the same live check (not just the structural DOM test) on any
  future instrument/game brief that both requires keyboard operability and
  gates its first sound behind a user-gesture-unlocked `AudioContext`.
- **Before manufacturing a touch-specific manual test, check whether the code
  branches on `event.pointerType` at all.** This CLI has no dedicated
  touch-dispatch subcommand outside the MCP `mobile` tools profile ---
  `agent-browser set device "<name>"` changes viewport/UA but not
  `navigator.maxTouchPoints`/`ontouchstart`, so a genuine CDP touch event is
  awkward to force through the plain CLI. Checked crit 4's `main.ts` first:
  its pointer/click handlers never branch on `pointerType`, so a mouse-driven
  `pointerdown`/`click` (already exercised elsewhere) exercises the identical
  code path a real touch tap would. Concluded touch playability didn't need
  a separate forced-touch test rather than spending more effort trying to
  fake one --- worth this same "read the handler for a pointerType branch
  first" check before treating "I can't easily emulate touch" as a
  verification gap that needs closing by force.
- **A fixed-palette page's dark-mode "absence" and a Web-Audio page's
  tab-hidden behaviour are both worth checking live rather than reasoning
  about from the source alone, even when the code gives a strong hint of
  what will happen.** Crit 4 had neither a `prefers-color-scheme` media
  query nor a `visibilitychange` handler, and reading `styles.css`/`main.ts`
  suggested both were fine: colours are hardcoded custom properties
  (`--paper`/`--ink`) rather than referencing system colours, so nothing
  should respond to an OS dark-mode toggle; and strike envelopes are
  scheduled with `AudioParam` automation on the audio thread, not
  `setTimeout` on the main thread, so background-tab timer throttling
  shouldn't matter. Confirmed both live rather than trusting the reasoning:
  `agent-browser set media dark` plus a screenshot showed identical
  paper-toned rendering and unchanged `getComputedStyle` body colours (the
  absence is a deliberate part of the paper-tone aesthetic, not an
  oversight); overriding `document.hidden`/`visibilityState` and dispatching
  `visibilitychange` mid-strike (via a patched `window.AudioContext` capturing
  the instance, same technique as the keyboard-gesture check already logged
  here) kept `audioCtx.state` at `"running"` throughout with no console
  errors, and a fresh strike after restoring visibility still fired clean.
  Worth the live check specifically because "the code suggests X should be
  safe" and "X is confirmed safe" are different claims, and the live check
  is cheap once the AudioContext-patching technique already exists.
- **A hovering simulated cursor is a second concrete cause of the
  "screenshot looks broken right after a gesture, but isn't" false-alarm
  shape**, distinct from the sway-in-progress one already logged above. Crit
  4's shortest chime tube rendered solid dark with no visible lighter
  gradient at its base right after being struck, unlike its neighbours ---
  looked like a real rendering bug at a glance. Checked computed styles
  first (identical gradient stops on every tube, `.struck` class already
  cleared): the actual cause was the CDP-driven mouse cursor still resting
  on that tube from the preceding click, so `:hover` (`opacity: 1`) removed
  the alpha-blend with the pale page background that makes every other
  tube's lighter gradient read as "lighter" at the default `opacity: 0.82`.
  `agent-browser mouse move` to a neutral point and reshooting confirmed all
  tubes render identically. Worth moving the simulated cursor away before
  screenshotting any hover-sensitive widget, and worth checking computed
  styles (not just re-reading animation code) as the first diagnostic step
  when a screenshot looks wrong right after a click.
- **A third cause of the same false-alarm shape, found on a content site
  rather than a game/instrument: Astro View Transitions (`transition:name`
  in a theme's layouts) cross-fade the old and new page during a client-side
  navigation, and a screenshot taken immediately after clicking a nav link
  can catch both pages' text overlaid/ghosted mid-fade.** Assignment 2's
  seventh run hit this clicking "Policies" from the mobile hamburger menu:
  the screenshot showed the homepage hero text and the policies page's
  heading/body both rendered on top of each other, translucent --- read at
  first glance as a real rendering bug (stuck overlay, or the mobile menu
  failing to close on navigation). A reshoot roughly a second later showed
  it settled cleanly to just the policies page. Confirmed the mechanism by
  grepping the installed theme's `.astro` layouts/components for
  `transition:name`/`transition:animate` rather than guessing. General
  lesson: on any site using Astro (or other framework-level) View
  Transitions, budget the same pause-and-reshoot instinct already logged
  above for CSS keyframe animations and hover states --- a screenshot
  fired the instant after a navigation click is exactly when a cross-fade
  is mid-flight, and the fix for the false alarm is "wait and reshoot,"
  never "go patch the navigation."
- **Two independently-correct event listeners on the same interaction can
  silently double-fire it, and nothing structural catches this.** Crit 4's
  chime grove had a delegated `pointerdown` listener on the container (via a
  debounced `maybeStrike`, needed so drag-strum could hit multiple tubes on
  `pointermove`) *and* a plain `click` listener on each button calling
  `playChime` directly (needed because keyboard Enter/Space dispatches
  `click` with no preceding `pointerdown`). Every mouse or touch tap fires
  both `pointerdown` *and* a synthesized `click`, so every tap struck the
  chime twice --- two overlapping, independently-detuned/panned notes
  instead of one, audible as a flam rather than a clean strike. Each
  listener was individually reasonable and individually correct in
  isolation; the bug only exists in their combination, which is exactly why
  `tsc`, `vite build`, and 23 green vitest assertions (none of which drive a
  real click-then-keyboard-focus sequence through both paths) never caught
  it, and neither did any prior manual pass, because a single manual click
  sounds fine unless you're specifically listening for a doubled note.
  Caught by patching `AudioContext.prototype.createOscillator` via
  `agent-browser eval` to count calls per gesture (this instrument's
  `strike()` creates exactly 2 oscillators per note): a mouse click read 4
  (double-strike) where keyboard Enter read 2 (correct) on the same build.
  Fixed by routing the `click` listener through the same debounced
  `maybeStrike` instead of calling `playChime` directly, so a tap's own
  `pointerdown` suppresses its later synthesized `click` while a bare
  keyboard `click` (no preceding `pointerdown` in the debounce map) still
  fires once. General lesson: whenever a widget wires *both* a delegated
  pointer listener (for drag/multi-target gestures) *and* a per-element
  `click` listener (for keyboard activation) on the same control, check for
  double-firing on a plain click/tap specifically --- the
  oscillator-call-counting technique generalises to any Web Audio instrument
  by patching whatever node-creation call is unique-per-strike and diffing
  the count between a mouse gesture and a keyboard gesture on the same
  control.
- **A pointer-drag state machine that resets on `pointerup`/`pointerleave`
  but not `pointercancel` will get stuck "down."** Two runs after the
  double-strike fix above, re-reading the same grove's drag-strum wiring
  (a local `pointerDown` boolean gating whether `pointermove` counts as a
  strike) found a second bug in the same event set: `pointercancel` --- the
  event a touch fires when the system interrupts it mid-gesture (a
  notification swipe, an incoming call, palm rejection) *instead of*
  `pointerup` --- had no listener, so `pointerDown` stayed `true` forever
  once that happened. The next bare `pointermove` over any untouched tube,
  with nothing actually pressed, then read as an in-progress drag and
  phantom-struck it. Confirmed with the same oscillator-count technique:
  dispatch real `PointerEvent`s (`pointerdown` on tube A, `pointercancel`,
  then a bare `pointermove` on never-struck tube B) and diff the count
  before/after the fix (2 → 4 broken, 2 → 2 fixed). Fixed by adding a
  `pointercancel` listener mirroring the existing `pointerup`/`pointerleave`
  ones. General lesson, generalising the double-strike one above: an
  interaction state machine driven by DOM events is only as complete as its
  *reset* paths, and `tsc`/build/vitest can't see a missing one --- when a
  boolean gates behaviour across a pointer gesture, explicitly enumerate
  every event that should end the gesture (`pointerup`, `pointerleave`,
  *and* `pointercancel` at minimum) rather than reasoning from the "happy
  path" events alone, and worth the same live re-read/probe pass on any
  future pointer-driven widget in this repo family, not just this one.
- **That same boolean must also be scoped per `pointerId`, not shared
  globally, or an unrelated pointer's end-of-gesture event corrupts a
  different pointer's still-active gesture.** A third pass over the same
  drag-strum wiring, well after the double-strike and pointercancel fixes
  above were both closed and the deepen list had been declared dry, asked a
  different question of the same code --- not "which events are missing" but
  "what if a *second, unrelated* pointer fires one of the events this code
  already listens for?" `pointerDown = true/false` was set by *any*
  pointerdown/pointerup/pointerleave/pointercancel on the container,
  regardless of whose pointer fired it: a resting palm or an incidental
  second finger releasing mid-drag zeroed the shared flag and silently ended
  a *different*, still-down finger's drag-strum for the rest of the gesture.
  Confirmed with the same oscillator-count technique, this time dispatching
  two distinct `pointerId`s: pointerdown id=1, pointermove id=1 (strikes,
  correct), pointerup id=2 (a different id), pointermove id=1 (pre-fix: no
  strike, count stuck; post-fix: strikes, count rises) --- and re-checked
  that a genuine same-id pointerup still correctly ends *that* pointer's own
  gesture, no regression. Fixed by replacing the boolean with a
  `Set<number>` of active pointer ids, added/removed by `event.pointerId` on
  every listener. General lesson, sitting one level above the pointercancel
  fix's "enumerate every reset event": a boolean shared across *all*
  pointers conflates "my gesture ended" with "some gesture ended," and the
  fix for one doesn't fix the other --- once a widget's event set is
  confirmed complete (every reset path enumerated), still check whether the
  state those events flip is scoped to the pointer that fired them. This
  bug shape also survived two entire prior "declare the deepen phase dry"
  hand-offs undetected, because both previous passes re-verified *already-
  found* angles rather than asking a genuinely new question of the same
  code --- worth remembering that "re-read with a different question" can
  out-perform "re-verify the existing checklist" once a deepen phase
  otherwise reads as exhausted.
- **Touch pointers get implicit pointer capture on `pointerdown`: `event.target`
  in later `pointermove`s stays pinned to the element first touched, even as
  the finger slides onto a sibling** --- distinct from the two event-*absence*
  bugs above (this one fires on every touch drag, not an edge-case event).
  Crit 4's drag-strum read `event.target` off the `pointermove` event to
  decide which tube to strike next; on a real touchscreen this would never
  see a different tube once the finger moved off the one it started on,
  because capture keeps re-targeting events at the original element
  regardless of where the finger physically is (mouse pointers aren't
  captured this way, so a mouse-driven manual pass over this exact code
  wouldn't have surfaced it). Confirmed via `WebSearch` against MDN/W3C
  spec text and the `openseadragon`/Mozilla bug trackers before treating it
  as real, then verified live: patched `AudioContext.createOscillator` to
  count (same technique as the double-strike/pointercancel fixes),
  dispatched a real `pointerdown` on tube 0, then a `pointermove` **also
  dispatched on tube 0** (simulating capture) but with `clientX`/`clientY`
  over tube 1 --- oscillator count rose from 2 to 4 and the `.struck` class
  landed on tube 1, confirming `document.elementFromPoint(event.clientX,
  event.clientY)` (which re-does hit-testing at the real coordinates,
  ignoring capture) fixes it where `event.target` couldn't. Checked the
  target buttons were childless (`<button class="chime">`, no descendant
  spans/svgs) before relying on `elementFromPoint`, since if hit-testing had
  landed on a child element the existing `instanceof HTMLButtonElement`
  check would have silently failed instead. General lesson: for any
  pointer-driven widget where a *drag across multiple elements* matters
  (not just press/release on one), don't trust `event.target` in
  `pointermove`/`pointerup` handlers on principle --- use
  `document.elementFromPoint` (or per-`pointerId` capture bookkeeping) from
  the first draft, since this bug is invisible to `tsc`/build/vitest/a
  mouse-driven manual pass alike, and only shows up on real touch hardware
  or a deliberately capture-simulating dispatch like the one above.
- **Calling `AudioParam.setTargetAtTime` (or any automation method) from a
  raw, unthrottled DOM event handler schedules a permanent entry on that
  param's timeline every single call, with no spec-mandated pruning of past
  events.** Crit 4's continuous wind layer called `setTargetAtTime` on
  `windGain.gain`/`windFilter.frequency` directly from a `pointermove`
  listener with no rate limit --- confirmed via `WebSearch` against MDN and
  a Firefox bugzilla thread that browsers keep every scheduled event in an
  AudioParam's automation timeline indefinitely unless explicitly cleared
  with `cancelScheduledValues`, since (unlike `setValueAtTime`)
  `setTargetAtTime`'s open-ended exponential approach has no natural
  endpoint the engine can prune from. Verified live: patched
  `AudioParam.prototype.setTargetAtTime` to count calls, dispatched 200
  synthetic `pointermove` events in a tight synchronous loop, got 400 calls
  (2 params x 1 per move) with zero throttling --- a real drag at typical
  60--120Hz would schedule tens of thousands of never-pruned entries per
  minute. This is a different bug shape from every event-wiring fix logged
  above (those were about *which* event fired or what its payload claimed;
  this is unbounded resource growth from a *correctly*-firing, correctly-
  targeted event called too often). Found by deliberately reading the
  audio-graph code (`strike()`/`updateWind()`/`ensureAudio()`) with a
  "what could grow unbounded under rapid interaction" question in mind,
  after three straight event-wiring fixes had made "re-read the event
  wiring" feel exhausted --- worth switching questions, not just re-reading
  the same code, once one angle stops turning up anything new. Fixed by
  throttling the call to once per 40ms, comfortably under the params' own
  0.12s/0.2s `setTargetAtTime` smoothing time constants so nothing audible
  is lost; confirmed the same burst technique now yields 2 calls instead of
  400, and confirmed a realistically-spaced synthetic drag (~50ms between
  moves) still updates the wind layer on every move. General lesson: any
  future instrument/widget that maps continuous pointer/sensor input
  straight to `setTargetAtTime`/`linearRampToValueAtTime`/etc. on every
  raw event needs an explicit throttle matched to the param's own time
  constant, not just "call it when the value changes" --- the same
  oscillator/param-call-counting technique used for the double-strike and
  implicit-capture bugs generalises cleanly to catching this one too.
- **`FinalizationRegistry` is a direct way to verify Web Audio node
  garbage-collection claims live, rather than trusting the spec's automatic-
  lifetime-management wording.** Crit 4's `strike()` never stores or
  disconnects its per-note oscillator/gain nodes --- correct per spec (a
  stopped source node with no external references becomes eligible for GC),
  but unverified until checked directly. Patched
  `AudioContext.prototype.createOscillator` to register every created node
  in a `FinalizationRegistry`, fired 420 oscillators across 30 rounds of
  rapid strikes, waited past their decay envelopes, then nudged V8's GC with
  several rounds of large-array allocate/discard (no `window.gc()` exposed
  without `--js-flags=--expose-gc`, which this Chrome launch doesn't set).
  All 420 fired their finalizer --- confirmed collected, a clean result
  closing the "is this actually collected" gap a prior hand-off had flagged
  as plausible-but-unverified. Worth this technique on any future
  instrument/widget whose per-interaction node graph relies on implicit
  spec-mandated cleanup rather than explicit `disconnect()` calls.
- **Chrome's CDP `Page.setWebLifecycleState` (`"frozen"`/`"active"`) models
  real OS-triggered tab backgrounding more faithfully than overriding
  `document.hidden`/dispatching `visibilitychange`** (the latter already
  logged above as its own check) --- and it must be driven against the
  *built/preview* server, not `pnpm dev`. `agent-browser` has no built-in
  command for this CDP method; drove it directly by taking the browser
  websocket URL (`agent-browser get cdp-url`) into a small Node script
  (Node 24's native `WebSocket`) that calls `Target.getTargets` ->
  `Target.attachToTarget` (flatten mode, to get a `sessionId`) ->
  `Page.setWebLifecycleState`, then `Runtime.evaluate` with that
  `sessionId` to read page state before/after. First run against
  `localhost:5173` (`pnpm dev`) showed the page's JS realm reset after
  thaw --- an injected `AudioContext`-wrapping patch and its captured
  instance both vanished --- which looked like a real freeze/thaw bug until
  `agent-browser console` showed Vite's dev-mode HMR client logging "server
  connection lost. Polling for restart..." and reconnecting: freezing the
  page drops the dev WebSocket, and Vite's client forces a full reload on
  reconnect, a dev-tooling artifact with zero counterpart in the shipped
  static build. Re-ran against `pnpm build && pnpm preview` (no HMR client)
  instead: the `AudioContext` stayed `"running"` across a full
  frozen->1.5s->active cycle, no console errors, and a strike fired clean
  immediately after thaw. General lesson: any future CDP-level test that
  simulates browser/OS-level page lifecycle events on a repo from this
  starter template needs to target the built preview server specifically,
  or Vite's own dev-reconnect behaviour will read as a false bug. Also
  worth remembering separately: `window.audioCtx`-style checks only work if
  the variable is genuinely global --- this repo's `audioCtx` is a
  module-scoped `let` in `main.ts`, invisible on `window`, so any live probe
  needs to wrap the global `AudioContext`/`OscillatorNode` constructors (as
  this and the double-strike/pointercancel/wind-throttle checks above all
  do) rather than expecting to read the app's internal state directly. And
  a synthetic `element.click()` via `eval` does **not** count as a user
  gesture for the Web Audio autoplay policy (a context created that way
  starts `"suspended"`) --- use `agent-browser click <sel>` (a real
  CDP-dispatched click) when a live check needs a genuinely unlocked,
  `"running"` context.
- **Resizing the viewport mid-gesture is worth a live check on any widget
  whose hit-testing already switched from `event.target` to
  `elementFromPoint`** (logged above for implicit touch capture) --- a
  resize is a different way the DOM-to-screen mapping can change mid-drag
  from the capture case, and it's cheap to confirm rather than assume once
  the technique already exists. Checked crit 4's drag-strum: patched
  `AudioContext.createOscillator` to count (same technique as the
  double-strike/pointercancel/capture fixes), dispatched a real
  `pointerdown` on one chime at 1280x577, resized the live session to
  800x600 mid-gesture (`agent-browser set viewport`, same `pointerId` still
  tracked as active), then dispatched `pointermove` at a *different*
  chime's new, post-resize screen coordinates --- it struck exactly once at
  the correct post-resize target, since `elementFromPoint` recomputes real
  coordinates on every event rather than caching a rect. Clean result, no
  fix needed --- worth recording alongside the other clean verification
  passes (node GC, CDP page-freeze) as a genuine check discharged, not
  wasted effort, and worth the same live resize-mid-gesture check on any
  future widget that already relies on live coordinate hit-testing.
- **A per-interaction `setTimeout` scheduled to clear a CSS animation class
  is stale the moment the same element is re-triggered before it fires** ---
  a different failure family from every event-wiring bug logged above (those
  were about DOM events; this is about `setTimeout` callbacks racing each
  other, no pointer/keyboard code involved at all). Crit 4's chime strike
  animation (`.struck`, a 1.6s CSS `@keyframes swing`) was cleared by a bare
  `setTimeout(() => classList.remove("struck"), 1600)` scheduled on every
  strike. A fast roll on one tube --- outside the 90ms debounce, inside the
  1.6s animation, entirely legitimate expressive play --- left two
  overlapping timers; the *earlier* strike's timer still fired on its
  original schedule and removed the class mid-animation for the *later*
  strike, cutting its visible swing short. Found by asking a *different*
  subsystem the same question that had already paid off in the event-wiring
  fixes above ("can an earlier-scheduled callback fire after something later
  supersedes it, and does anything check for that?") once the event-wiring
  angle itself read exhausted, rather than re-verifying an already-closed
  check. Confirmed live on the dev server (pure DOM/CSS, no audio/gesture
  policy involved): clicked the same chime at t=0 and t=300ms, sampled
  `classList.contains("struck")` at several timestamps --- pre-fix it flipped
  false at ~1600ms (the *first* strike's timer) though the second strike's
  animation should run to ~1900ms; post-fix it correctly held true through
  1900ms. Fixed with a `Map<element, number>` per-element generation token,
  incremented on every (re-)trigger, checked by the timeout before it acts:
  a stale timer whose token no longer matches is a no-op. General lesson:
  any bare `setTimeout` that clears a CSS class/animation state --- not just
  audio-graph state --- needs the same "is this callback still the current
  one" guard the moment the same element can be re-triggered before the
  timer fires; `tsc`/build/vitest can't see this either, since nothing about
  it is a type or DOM-shape error, only a timing race visible in a live
  browser.
- **Back-forward cache (bfcache) restore --- a user navigating away via a
  link/address bar and returning with Back --- is a distinct scenario from
  both the tab-visibility-change check and the CDP
  `Page.setWebLifecycleState` freeze/thaw check already logged above, and
  worth its own live pass on any Web Audio page**, since neither of those
  simulates an actual history navigation. Checked crit 4 against the built
  `pnpm preview` server (not `pnpm dev`, per the standing HMR note above ---
  Vite's dev client forces a reload on reconnect and would read as a false
  bfcache bug). Patched `window.AudioContext`/`createOscillator` via
  `agent-browser eval` (capturing the instance and a call counter, same
  technique as the double-strike/wind-throttle checks), unlocked audio with
  a real `agent-browser click`, navigated to an external URL with `open`,
  then used `agent-browser back` (a genuine history navigation, distinct
  from re-`open`-ing the original URL) to return. Chrome restored the page
  from bfcache with the JS realm fully intact --- the eval-injected patches
  and captured `AudioContext` instance both survived, unlike the dev-server
  HMR-reload case --- and `audioCtx.state` stayed `"running"` throughout
  with no console errors; a real click immediately after the restore still
  struck cleanly (oscillator count rose, `.struck` applied correctly once
  re-checked right after the click --- an earlier read of `false` was just
  command-dispatch latency past the 1.6s animation window, not a bug).
  Clean result, no fix needed, but a genuinely different lifecycle path than
  the ones already checked --- worth the same live bfcache pass (not just
  tab-hidden or CDP-freeze) on any future page whose first sound is gated
  behind an `AudioContext` unlock. Also worth noting as a harness quirk, not
  an app finding: a backgrounded `vite preview` shell reported "completed"
  in a stale task notification while still actually serving traffic, and
  the PID the background-task tool tracked wasn't the PID actually holding
  the listening socket --- `lsof -i :<port>` (or `ss -ltnp`) found the real
  listener reliably when a plain `kill` on the tracked PID didn't stop the
  server.
- **`agent-browser`'s separate `mouse down`/`sleep <n>`/`mouse up` CLI
  invocations carry enough per-invocation round-trip latency (~120ms,
  measured directly) to make a fixed-duration hold unreliable for anything
  millisecond-sensitive.** Crit 5's charge-and-release jump mechanic (hold
  duration linearly maps to distance) needs holds accurate to within tens of
  milliseconds to hit a narrow stone; an intended 420ms hold via three
  separate CLI calls measured ~540ms browser-side (confirmed by
  timestamping real `pointerdown`/`pointerup` events with
  `performance.now()`), enough to overshoot every single attempt. Fixed by
  dispatching synthetic `PointerEvent`s with a fixed `pointerId` and an
  in-page `setTimeout` for the hold duration, all inside one
  `agent-browser eval` call --- this removes CLI round-trip latency from the
  measured interval entirely, and confirmed the game's actual difficulty
  ramp was fine (a genuine, narrow, learnable sweet-spot window that
  narrows as score climbs) once timing was accurate. Worth this
  single-`eval`-with-in-page-timing technique on any future widget where a
  press/hold/release duration itself is the thing being tested, rather than
  chaining separate CLI mouse/sleep/mouse commands.
- **Two animation paths that should represent the same underlying
  time-based quantity but each apply their own easing function will
  visibly desync, even when each formula is individually correct.** Crit
  5's camera scrolls the world using an eased `scrollOffset` (`easeInOutQuad`
  on elapsed jump time) so the player token renders at a fixed screen x; an
  early draft of the player's own horizontal draw position was computed
  separately as `worldToScreen(linearProgress)`, i.e. the *same* elapsed
  time fed through a *different* (linear) curve than the one driving
  `scrollOffset`. Caught by code review before ever running the app: since
  the camera always recenters on the player's own trajectory, the player's
  screen x is provably the fixed constant in every phase, and the
  linear-vs-eased mismatch would have made it visibly wobble mid-jump had it
  shipped. Fixed by deleting the redundant calculation and hardcoding the
  constant with a comment explaining why it's provably constant, rather
  than leaving a `worldToScreen` call that looks variable but never
  actually varies. General lesson: whenever two code paths derive from the
  same clock/progress value but each independently choose an easing curve
  for what's conceptually one quantity, check they're actually the same
  curve (or better, that only one of them needs computing at all) before
  trusting either in isolation.
- **A UI feedback element sized in the game's own virtual coordinate space
  can look fine by the numbers and still be near-illegible once actually
  played at the narrower marking viewport** --- a distinct failure shape
  from the resize-mid-gesture and touch-capture checks above (those were
  about correctness under a size change; this is about legibility at a
  size that was never wrong, just small). Crit 5's charge meter (40x10 in
  an 800x600 virtual space) read as marginal even on desktop, since the
  canvas itself caps at `max-width: 40rem` (640px) regardless of viewport
  width, and became a barely-visible ~17x4px sliver at the 390px mobile
  marking viewport --- undermining the only visual readout for the "judge
  the hold" mechanic on one of the two required marking viewports. Found
  by actually playing (charging a real jump, screenshotting) rather than
  by reading the `40, 10` constants, which read as plausible on paper.
  Fixed by roughly doubling both dimensions and thickening the border.
  Worth deliberately screenshotting any small interactive readout
  (meter, timer, counter) at the mobile marking viewport specifically, not
  just checking it renders without error --- "renders" and "legible at
  390px" are different claims, and only playing (not reading the source)
  tends to surface the gap. This is also a clean example of the brief's
  "one change you made came from playing rather than reading its code"
  spec line for a game deliverable --- worth treating a genuine multi-round
  playthrough (hold durations judged by eye from screenshots, not computed
  from the known formula) as a standing deepen-phase task for any future
  game brief, specifically hunting for a feel/legibility issue reading the
  source wouldn't surface, rather than treating that spec line as
  automatically satisfied by writing tests or by a synthetic input scan.
- **Two per-score scaling formulas that each look reasonable in isolation
  can combine into an impossible constraint neither one violates alone.**
  Crit 5's stone-narrowing (`stoneWidth`, floor 18) and gap-widening
  (`maxDistance`, ceiling 270) formulas both capped sensibly on their own,
  but at score >= 26 their combination could put a stone's near edge
  (`distance - stoneWidth/2`) past 260, the longest jump the charge mechanic
  can ever produce --- an unwinnable stone, not a hard one, about 0.56% of
  hops in that range. Found by working through the two formulas' bounds
  together (not by playing --- reaching score 26 organically is already a
  feat), then confirmed with a throwaway brute-force script
  (`node --experimental-strip-types -e`, 2M random rolls, before and after
  the fix) rather than trusting the algebra alone. Fixed by giving the gap
  generator the caller's own max-reachable-distance constant and clamping
  the generated range to it, plus a regression test sweeping every score
  0--60. General lesson: whenever two formulas both scale with the same
  driving variable (here, score) and one's output feeds a bound the other
  has to stay inside, check the combination across the whole range that
  variable can reach --- each formula's own local cap being sane doesn't
  mean their combination is, and this is exactly the kind of thing neither
  `tsc`/build/vitest nor a short manual playthrough reliably catches, only
  a brute-force sweep across the shared variable's full range does.
- **When a game mechanic's difficulty is driven by a source-visible random
  range, playtesting "does the ramp feel fair" is better answered by
  computing the midpoint of that range at each step and holding for it,
  than by either a synthetic sweep against known constants or eyeballing
  screenshots by eye.** A follow-up run on crit 5's Far Bank, after the
  mobile-meter and gap-reachability fixes were both closed, ran an extended
  ~55-hop session (still using the standing in-page synthetic-PointerEvent
  + `setTimeout` technique to keep hold timing accurate) where each hold was
  computed from `nextGap`'s own formula to target the midpoint of the
  current score's distance range, rather than a fixed value or an eyeballed
  guess. Landing roughly half the time at every score tested, with a best
  streak of 6, confirmed the difficulty ramp is genuinely variance-driven
  rather than spiky or dead --- a different question from either the
  mobile-legibility playthrough (which deliberately picked holds by eye to
  surface a feel/rendering issue) or the reachability check (which worked
  the formulas' bounds analytically, never playing at all). Worth this
  specific "aim at the known midpoint, play a real multi-round session"
  technique on any future game whose core RNG parameter's distribution is
  readable from source, as a distinct check from both of those --- it's the
  one that actually answers whether skill (not luck or unfairness) is what
  separates a short run from a long one.
- **A brief's own "one mechanic is usually enough, two is the harder,
  better move" framing is itself a scope decision worth making
  deliberately, not by default** --- the same restraint-ceiling reasoning
  MEMORY.md already logged for crit 1 (check what the piece is *arguing*
  before treating "I could add more" as free) extends past page count to a
  mechanic count. Decided, after the fairness playthrough above found the
  single mechanic already escalates cleanly across its full score range and
  already carries the whole design (charge meter, stone/gap formulas, the
  fairness check itself), not to attempt the optional second interacting
  mechanic for Far Bank --- adding one now would be scope without an
  argument grounded in what the game does, not a response to a found gap.
  Worth the same explicit for-or-against call, reasoned from what a
  deepen-phase check already found rather than made by default, whenever a
  future brief offers an optional harder variant on top of a working
  minimum.
- **The "enumerate every event that ends a gesture" lesson (crit 4,
  pointercancel) extends past pointer events to window-level focus/
  visibility events, and a codebase can go several deepen runs without
  ever having that specific question asked of it.** Far Bank's charge
  gesture (hold to charge, release to jump) reset on `keyup`/`pointerup`/
  `pointercancel` but had no `blur` or `visibilitychange` handling at all.
  Losing window focus mid-hold --- alt-tab, switching tabs, clicking
  another app --- meant the matching keyup/pointerup could go missing
  entirely (many browsers don't deliver it to a backgrounded page once the
  key/button is released elsewhere), leaving `phase` stuck at `"charging"`
  forever: the meter frozen full, and every fresh press silently swallowed
  since `press()` only acts from `phase === "ready"` --- no recovery short
  of a reload. Confirmed live with `agent-browser eval`: dispatched a real
  `keydown`, waited past the charge cap, screenshotted the frozen meter,
  dispatched a second `keydown` and showed nothing happened. Fixed with a
  `cancelCharge()` method (charging -> ready, no scoring, no jump played
  out --- the player didn't choose that hold) wired to both `window`'s
  `blur` and `document`'s `visibilitychange`/`hidden`, verified both paths
  live the same way. Found on the fourth run on this deliverable, after
  three prior runs (including one that explicitly declared the deepen list
  dry) had all reasoned about pointer/keyboard completeness without ever
  asking this specific question of this specific gesture --- confirms the
  crit-4 lesson to "ask a genuinely new question, not re-verify the
  existing checklist" generalises across deliverables, not just within
  one. Worth checking any future hold-to-act mechanic (charge, drag, long
  -press) for `blur`/`visibilitychange` handling from the first draft, not
  just the pointer-event set already covered by `pointercancel`.
- **Not every event-completeness question the "enumerate every event that
  ends a gesture" lesson raises turns out to be a real gap --- and the
  architecture that closes it can be "release listeners were already
  window-scoped, not element-scoped" rather than a new handler.** A fifth
  run on Far Bank tested the specific follow-up the fourth run's hand-off
  flagged: a pointer leaving the canvas mid-charge (`pointerleave`)
  without leaving the window. Live-checked with `agent-browser eval`:
  dispatched `pointerdown` on the canvas, then `pointermove`/`pointerleave`
  to coordinates outside the canvas but inside the window --- the charge
  meter kept filling correctly, because the release listeners
  (`pointerup`/`pointercancel`) were already attached to `window`, not the
  canvas element, so an element-bounds `pointerleave` was never wired to
  cancel anything. Confirmed the release path still worked by dispatching
  `pointerup` on `document` (not the canvas) at off-canvas coordinates and
  watching the hold resolve normally. Worth recording as a clean result
  alongside the CDP freeze/thaw and node-GC clean checks logged for crit
  4: the "enumerate every event" discipline sometimes confirms the
  existing design is already correct rather than finding a new hole, and
  that's a genuine check discharged, not wasted effort --- the tell for
  when it's safe to stop looking down this specific angle is a clean
  result on the exact scenario a prior hand-off named as unverified,
  not just "nothing obviously wrong on a fresh read."
- Same run also re-ran the resize-mid-gesture check crit 4's drag-strum
  established (MEMORY.md above) against Far Bank's charge/release hold for
  the first time: resized the live session from 1280x720 to the 390x844
  mobile viewport while a charge was active, then released. Clean --- the
  game's virtual 800x600 coordinate space plus `ctx.setTransform` scaling
  means canvas pixel size never enters the charge-timing or hit-testing
  logic, so nothing to desync. Worth porting this specific check to any
  future canvas-based widget in this template family the first time a
  hold/drag gesture is added, rather than waiting for a resize bug to
  motivate it.
- **In this `agent-browser` headless session, `requestAnimationFrame`
  callbacks do not fire on a passive timer at all --- they only run in a
  burst the moment something forces a compositor frame, and `Page
  .captureScreenshot` (i.e. `agent-browser screenshot`) is what forces
  one.** `document.hidden` reads `true` even right after
  `Target.activateTarget`, and a bare in-page rAF-count loop
  (`requestAnimationFrame` recursively counting) got exactly 0 frames across
  6 real seconds of `setTimeout`-measured wall-clock waiting. Three
  successive `agent-browser screenshot` calls with no other waiting between
  them advanced the same counter 0 -> 4 -> 12: each screenshot forces one
  burst of catch-up frames, not a continuous 60fps loop. For any
  rAF-driven widget (a canvas game loop, a CSS-rAF-timed animation driven
  from JS rather than CSS transitions), a live check that dispatches an
  input and then merely `sleep`s before reading DOM/canvas state --- with no
  `agent-browser screenshot` in between --- will see stale, un-advanced
  state and can misread that as a stuck/broken app when the app is fine and
  the check just never gave it a frame to run. Crit 5's Far Bank confirmed
  this concretely: a synthetic pointerdown followed only by a sleep left
  `phase` frozen at whatever it was the instant of dispatch, while the same
  sequence with an `agent-browser screenshot` immediately after showed the
  charge meter, then the jump animation, progressing correctly. Bracket any
  live state check on an rAF-driven widget with a forced screenshot (or
  several, for a multi-step animation) rather than a bare sleep, in this
  and future repos using headless `agent-browser` sessions.
- **Chrome's CDP `Page.setWebLifecycleState("frozen")` fires a genuine
  `window` `blur` event as part of entering the frozen state** (confirmed
  by instrumenting a listener before freezing: exactly one `blur` event,
  no `visibilitychange`) --- which means any widget that already cancels
  an in-progress hold/drag/charge gesture on `blur` (crit 4's and crit 5's
  own pattern, logged above, for alt-tab/window-switch) gets freeze/thaw
  safety for free, not by coincidence but because both scenarios dispatch
  the same DOM event. Verified on crit 5's Far Bank against the built
  `pnpm preview` server: charge meter visible pre-freeze, correctly
  cancelled (meter gone, no stuck state) post-thaw, a fresh press/release
  afterwards played out normally, no console errors. A real bfcache
  back-navigation (`agent-browser open` away then `agent-browser back`,
  confirmed genuine via `pagehide`/`pageshow` `persisted=true` listeners)
  hit the same `blur`-triggered cancellation path with the same clean
  result. Worth checking whether a widget's existing blur-cancellation
  handler already covers freeze/thaw and bfcache before writing scenario-
  specific handling for either --- it likely already does, and both are
  cheap to confirm live once the CDP freeze/thaw script and the
  `agent-browser back` technique already exist (see the CDP page-freeze
  entry above from crit 4, which needed the *built preview* server for the
  same dev-HMR reason logged there).
- **A "compute a value, then `localStorage.setItem` it unconditionally"
  pattern is a save-race if the in-memory value being compared against was
  captured once at load time and never refreshed** --- distinct from every
  prior finding in this file, since it's plain JS/storage semantics, not a
  browser-timing or event-wiring quirk. Crit 5's `saveBest` compared a new
  score against `this.best` (loaded once in a class field initializer) and
  wrote unconditionally on a new personal high; a second tab of the same
  game, opened earlier with a lower stale best, could then overwrite a
  higher best the first tab had already persisted. Confirmed live with
  `agent-browser storage local set <key> <higherValue>` to simulate a
  concurrent tab's write, then a real gameplay action from the tab under
  test that beat its own stale (lower) best --- the stored value dropped to
  the lower one. Fixed by having the save function re-read the current
  stored value and only write forward (`if (newValue > currentStored)
  write`), which needs no cross-tab messaging (`storage` event, `BroadcastChannel`)
  to be race-safe --- it just stops being able to regress the persisted
  value, which is the part that actually matters across a reload. General
  lesson: any `localStorage`/`sessionStorage` write gated by "is this
  better than what I already have" needs to compare against a *freshly
  read* current value, not a field cached at some earlier point in this
  tab's lifetime, the moment more than one tab of the same page can be open
  at once --- worth checking this pattern specifically (not just "does this
  feature work") on any future widget that persists a running best/score/
  high-water-mark.
- **`ResizeObserver` does not fire on a `devicePixelRatio`-only change** ---
  dragging a window to a different-DPI display, or some zoom/OS-scaling
  changes, can change `window.devicePixelRatio` while the observed
  element's CSS box size stays exactly the same, so a canvas-scaling setup
  keyed only off `ResizeObserver` (crit 4's chime rack had no canvas to
  scale; crit 5's Far Bank does) silently keeps rendering at the stale
  resolution. Confirmed live via CDP `Emulation.setDeviceMetricsOverride`
  (`deviceScaleFactor` 1 -> 3, same CSS width/height, driven directly over
  the browser websocket the same way the freeze/thaw script above does):
  `window.devicePixelRatio` updated immediately but `canvas.width`/
  `.height` (set by the app's own `resize()`, called only from a
  `ResizeObserver` callback and once at startup) did not move until a
  `matchMedia('(resolution: ${dpr}dppx)')` listener --- re-armed after
  each `change` event, since a `MediaQueryList` doesn't stay live across an
  arbitrary future DPR value on its own --- was added to call `resize()`
  too. Re-ran the identical CDP override against the fix and the canvas
  backing store scaled correctly with the CSS size unchanged, confirming
  the listener actually fired rather than resize() being incidentally
  correct already. Worth this same live DPR-override check (not just a
  `ResizeObserver`-covers-it assumption) on any future canvas-based widget
  in this template family that scales its backing store for sharpness.
- **The headless "rAF only advances in a burst on a forced screenshot"
  fact (logged above for crit 4) doubles as a cheap way to manufacture a
  large, real-world `now`-jump for testing a phase machine's clamping**,
  rather than only being a gotcha to work around. Far Bank's `airborne`
  phase computes `t = Math.min((now - hopStart) / duration, 1)`; started a
  real hop via synthetic `pointerdown`/`pointerup`, then let 5+ real
  seconds elapse with no `agent-browser screenshot` call (so no rAF frame
  ran at all), then forced one --- the resulting huge `now - hopStart`
  clamped correctly, landing cleanly in the very next frame with no console
  errors or visual corruption. Confirms a `Math.min(t, 1)` clamp is
  sufficient protection against a backgrounded-tab-style time gap without
  needing a separate `visibilitychange`/CDP-freeze simulation for this
  specific concern --- worth this technique (no extra CDP scripting needed)
  on any future rAF-driven phase machine using relative-time-since-start
  deltas, as a lighter alternative to the CDP `setWebLifecycleState` script
  when the question is specifically "does a large elapsed-time jump clamp
  safely" rather than "does the whole page lifecycle survive freeze/thaw."
- **A same-tick double dispatch of a state-changing input handler is not
  actually reachable from genuine browser-fired events, because DOM event
  handlers run to completion one at a time** --- but it's still worth
  confirming live rather than resting on that reasoning alone, since a
  single `agent-browser eval` call can dispatch two events synchronously
  back-to-back (a real same-tick double dispatch, unlike two separate CLI
  calls which always serialize). Checked Far Bank's `press()`: guarded by
  `if (this.phase !== "ready") return`, so a second same-tick call while
  already `"charging"` (or mid-`reset()`, which itself sets phase to
  `"ready"` before falling through to `"charging"` in the same call) always
  finds a non-`"ready"` phase and no-ops --- confirmed live, no console
  errors, score stayed consistent. Worth the same live double-dispatch
  check on any future widget with a phase-gated input handler, even when
  the reentrancy argument seems airtight from reading the code, since it's
  a cheap confirmation once the technique exists.
- **A "does the hit-test boundary match the rendered shape" question is
  often answerable by tracing which numbers feed both, before reaching for
  a live check --- and when it's genuinely unclear from the trace alone, a
  small standalone HTML/canvas file that copies just the relevant draw
  calls (not the real page, no game-state setup needed) can render the
  exact boundary frame directly.** Far Bank's `resolveJump` (rule) and
  `drawStone`/`drawPlayer` (rendering) turned out to consume the identical
  `gap.distance`/`gap.stoneWidth` values --- working through
  `worldToScreen` by hand showed the on-screen offset between player and
  target stone at the landing instant reduces to exactly
  `gap.distance - jumpDistance`, the same quantity `resolveJump` bounds
  against. Confirmed with a throwaway `/tmp` HTML file reproducing only the
  two draw calls (not committed, deleted after) at the narrowing floor
  (`stoneWidth` = 18): a landing at the exact rule boundary does look
  borderline there (the player's sprite is wider than the stone), and a
  landing 1 world-unit worse (rule: water) was visually indistinguishable
  from it at that scale --- both correct and expected, since world units
  map 1:1 to canvas pixels and the game never actually holds on that one
  frame long enough for a player to eyeball it (it immediately resolves to
  an unambiguous settle-and-continue or splash-and-end). A wider early-game
  stone at its own exact boundary read clearly "on the stone" for contrast,
  confirming the borderline look scales with difficulty as intended, not a
  rule/render drift. General lesson: before assuming two independent-
  looking draw/logic paths might have quietly drifted apart, trace whether
  they actually share the same source numbers first --- if they do, no live
  check can find a divergence that structurally can't exist, and a
  throwaway standalone renderer (cheaper than driving the real game to a
  hard-to-reach state) is enough to confirm what the trace predicts.
- **"Does every started gesture end cleanly" and "does a gesture start from
  the right input" are two different questions, and a deepen pass can
  exhaust the first while never having asked the second.** Far Bank's
  `pointerdown` handler never checked `event.button`, so a right-click (or
  middle-click) on the canvas started a charge exactly like the left
  click/keyboard Space the mechanic was designed for. The consequence
  chains into already-logged territory but from a new direction: a
  right-click's `contextmenu` reliably reaches the page, but whether the
  *native menu it opens* fires `window.blur` first is platform/browser-
  dependent --- confirmed via `WebSearch` against a Mozilla bugzilla thread
  (macOS explicitly does not shift window focus on a bare right-click,
  only once a menu item is chosen) and a CodeMirror issue report (some
  browser/OS combos fire spurious blur+focus on right-click) --- so the
  existing blur-cancels-a-stuck-charge safety net (this file's own
  window-blur/tab-switch entry above) cannot be trusted to recover a
  charge a right-click started, on every platform. Checked live with
  `agent-browser`'s CDP-level `mouse down right`/`mouse up right` against
  the built preview server first: in that sandboxed session `pointerup`
  did eventually arrive and no blur fired, but that's one harness's
  behaviour, not evidence about a real desktop browser's native
  context-menu capture, which the WebSearch evidence says varies --- not
  safe to conclude "fine" from a synthetic CDP dispatch alone here, unlike
  cases where CDP-level simulation faithfully reproduces the mechanism in
  question (e.g. the implicit-touch-capture and resize-mid-gesture checks
  logged above, where the DOM-level effect being tested is
  platform-independent). Rather than chase an unverifiable platform
  matrix, removed the whole risk instead of trying to detect it after the
  fact: gated `pointerdown` on `event.button === 0` and suppressed the
  canvas's own `contextmenu` entirely, since a native browser menu has
  nothing relevant to offer over a full-canvas single-mechanic game.
  Confirmed post-fix live (right button no longer opens the charge meter;
  left click and keyboard both unaffected) and via `pnpm check` staying
  green. General lesson: once an event-wiring deepen pass has exhausted
  "does every event that should end this gesture actually end it," pivot
  to "what unintended input could start this gesture in the first place"
  as a distinct, not-yet-asked question --- for any pointer-driven widget,
  check `event.button`/`event.buttons` is filtered to the intended input
  device's primary contact, and don't rely on a `blur` handler (however
  well-tested for alt-tab) to be a safety net for every way a native
  browser chrome surface (context menu, browser-native drag, a permission
  prompt) might interrupt a gesture, since whether that surface fires
  `blur` first is inconsistent across platforms and not something a
  single sandboxed browser session can settle by testing alone.
- **The "rAF only advances in a burst on a forced screenshot" headless
  quirk (logged above) turns out to cover the whole deferred style/media/
  paint pipeline in this `agent-browser` environment, not just
  `requestAnimationFrame` callbacks specifically.** Re-checking Far Bank's
  DPR-rescale fix (`019351e`) at more extreme accessibility-zoom values
  (4x, 8x, driven directly over the CDP websocket via
  `Emulation.setDeviceMetricsOverride`, same script shape as the earlier
  freeze/thaw check) first read as a *regression*: `window
  .devicePixelRatio` updated immediately but the canvas backing store
  never moved, and a diagnostic listener confirmed the app's own
  `matchMedia('resolution')` 'change' event genuinely never fired, even
  after a full second of `setTimeout` waiting. This was a methodology gap,
  not an app bug --- inserting one `Page.captureScreenshot` call between
  the CDP override and the readback was enough to make the listener fire
  and the canvas rescale correctly on the very next check, and a 1→4→8
  chain (screenshotting after each step) confirmed the fix's re-arm logic
  holds across consecutive changes, not just one. General lesson: any raw
  CDP script driving a headless session --- not only ones polling
  rAF-driven state --- needs a forced frame between a state change and the
  readback whenever the thing being checked depends on the browser's own
  deferred notification pipeline (media-query `change` events included,
  probably others); a script that only `setTimeout`-waits will see stale
  state and can misdiagnose a working feature as broken, exactly as
  happened here before the extra screenshot call was added.
- **Coarsened/rounded timer precision (Tor Browser, Firefox's
  `privacy.resistFingerprinting`, roughly: `performance.now()` snapped to
  a 100ms grid) doesn't need a live check to rule out on a widget whose
  every progress calculation derives from an absolute start timestamp
  rather than a per-frame delta** --- confirmed on Far Bank anyway, since
  the check is cheap once the synthetic-`PointerEvent` + `setTimeout`
  technique already exists: patched `performance.now` in-page to round to
  the nearest 100ms, played a real charge-and-release through to a landed
  jump, clean console throughout. Every phase's `t = (now - start) /
  duration` pattern in this codebase clamps with `Math.min(..., 1)` and
  never accumulates error frame-to-frame, so repeated or coarse timestamps
  just make the *rendered* motion chunkier, never wrong or stuck. Worth
  the same reasoning-first check (confirm the code uses absolute-
  timestamp-since-start math, not per-frame deltas, before assuming a
  live check is needed) on any future rAF-driven widget in this family.
- **`forced-colors`/`prefers-contrast` is a distinct check from
  `prefers-reduced-motion`/dark-mode, and Chrome's CDP exposes it directly
  via `Emulation.setEmulatedMedia`'s `features` array** (`{name:
  "forced-colors", value: "active"}`, `{name: "prefers-contrast", value:
  "more"}`) --- no `agent-browser set media` shortcut exists for it, same
  as the earlier DPR/freeze-thaw checks that needed a raw CDP script.
  Checked live on Far Bank: the DOM chrome (body colours, the `--seal`
  score text, canvas border, links) all correctly flip to system
  forced-colors values, since nothing in the stylesheet opts out with
  `forced-color-adjust: none` --- the right default, not a bug. The
  `<canvas>` itself stayed fully rendered in the site's own palette
  throughout (canvas is a replaced element exempt from forced-colors by
  spec), confirmed by dispatching a real charge/release under the
  emulated mode and screenshotting the meter, water and splash rings mid-
  interaction with zero console errors. Also worth noting as a script
  gotcha: `Target.getTargets` can return more than one `type: "page"`
  entry (a blank `chrome://newtab/` tab alongside the real one) --- filter
  by URL, not by taking the first page target, or `Runtime.evaluate`
  against the wrong target silently returns `undefined` for everything.
  Worth this same live forced-colors/prefers-contrast check on any future
  canvas-based widget in this family that hasn't had it run yet, as a
  check distinct from (not covered by) the reduced-motion/dark-mode passes
  already logged above.
- **Some named deepen-phase candidates turn out to have no CDP foothold at
  all, and that's a genuinely different outcome from a clean pass or a
  found bug --- worth telling the three apart.** Chasing whether Far Bank
  behaves reasonably under Chrome's real memory-pressure tab-discard
  (distinct from the already-checked freeze/thaw and bfcache paths)
  found, via the same raw-CDP-script technique used throughout this file,
  that `Target.discardTarget` doesn't exist in this environment's Chrome
  build at all (`-32601 'Target.discardTarget' wasn't found`) --- not
  present-but-inert, just absent. Falling back to the CDP `Memory` domain
  (`Memory.simulatePressureNotification({level: "critical"})`, which does
  exist and returns success) had zero observable effect on the debugged,
  foreground tab under test --- `document.hidden`, `visibilityState`, and
  `localStorage` state were all unchanged immediately and 4s later.
  Expected, not a bug: Chrome's tab-discarder only ever acts on background
  tabs a user isn't looking at, and a CDP-attached, actively-debugged
  foreground tab is structurally never a discard candidate no matter what
  pressure notification is simulated at it. Concluded there's no further
  lever to pull here specifically (no discard method, and the one pressure
  primitive that exists can't reach the tab under test) rather than
  spending more effort trying to force it --- this is a closed-
  *unactionable* check, a third category alongside "closed clean" (the
  freeze/thaw, bfcache, forced-colors passes above) and "closed, fixed a
  real bug" (the double-strike/pointercancel/etc. fixes): the test itself
  had no foothold in this environment, not that the app passed or failed
  it. Worth recognising this shape quickly on any future named-but-
  untried candidate --- check whether the CDP method it needs actually
  exists in this Chrome build before spending a full check-cycle assuming
  it will, and don't keep chasing a scenario once every available lever
  toward producing it has been tried and found absent or ineffective.
- **A no-tutorial brief's self-check has to cover the page's non-visual
  text --- aria-labels, alt text, live-region copy --- not just what a
  sighted playtester sees, since a Lighthouse accessibility pass and a
  manual browser playthrough can both stay green while an aria-label
  quietly carries exactly the instruction text the brief forbids.** After
  thirteen prior runs of interaction-robustness checks on Far Bank found
  the deepen list dry, rereading the shipped page's own copy against the
  brief's literal words (a different lens from testing interaction paths
  again) found `index.html`'s `<canvas aria-label="...Hold to charge a
  hop, release to land it.">` --- a bare how-to-play instruction, present
  since the canvas was first added, in a build whose brief says "no
  instructions anywhere, on screen or off." Lighthouse's a11y audit only
  checks that an accessible name is non-empty, not its wording, so a
  100/100 score never flagged it, and no sighted playtest could either
  since the text is invisible on screen. Fixed by describing the scene
  instead of the mechanic (`"Far Bank: a river with stepping stones, one
  figure at its edge."`) --- keeps a meaningful accessible name (a bare
  `<canvas>` with no label reads as blank to a screen reader) without
  stating how to play. General lesson, extending the crit 1--2 "content
  practices" self-referential-claim discipline (`colophon.html` etc.) to a
  different artefact type: whenever a brief's spec constrains what text
  may or may not appear anywhere on a build, explicitly reread every
  string a page emits to assistive tech (labels, alt text, aria-live
  regions), not just its rendered/visible copy, before declaring a
  no-instructions (or similar textual) constraint satisfied --- this bug
  shape is invisible to both an audit tool and a playtest, and only
  surfaces by rereading the markup's own text against the brief's exact
  words.
- **The same bug shape recurs across every distinct piece of off-screen
  text a page emits, not just once per page** --- a follow-up run on Far
  Bank, applying the exact "reread every string, not just visible copy"
  lens the aria-label fix above established, found a second instance: the
  `<meta name="description">` tag (doubling as the `og:description`
  fallback per the page's own head comment) read "hold to charge a hop,
  release to land it, one miss ends the run" --- the identical
  how-to-play instruction, just surfaced through social-preview/search
  metadata instead of assistive-tech copy. `spec/invariants.test.ts`'s
  "has a meta description" check, like Lighthouse's aria-label check,
  only asserts non-empty content, never wording, so it stayed green
  through the whole bug's lifetime too. Fixed by keeping the one-mechanic
  framing and stakes ("one wrong leap and it's over") while dropping the
  hold/release control description. General lesson: once one piece of
  off-screen page text is found violating a no-instructions constraint,
  don't stop at fixing that one string --- enumerate every distinct
  channel a page emits text through (aria-label, meta description,
  og:title/description, alt text, title tag, any generated CSS content)
  and check each independently, since a check tool that validates
  presence-not-wording gives the same false confidence on every channel,
  not just the first one found.
- **The same bug shape extends past text nodes into a channel no text
  grep can see at all: words baked into an image's rendered pixels.**
  A third run on Far Bank's off-screen-text lens found `public/card.png`
  (the link-preview card) had the same "hold to charge a hop, release to
  land it" instruction as its own italic subtitle, drawn into the PNG
  since the card was first composed --- invisible to any string search of
  the repo or the built page, only found by actually opening the image at
  full resolution (the `Read` tool on the PNG, not `identify`/pixel
  sampling) and looking at it. General lesson, extending the "enumerate
  every text-emitting channel" rule one level further: a channel doesn't
  have to be markup text to carry the same violation --- any committed
  image with rendered words (a card, a favicon with a wordmark, a diagram
  with a caption) needs the same "read what it actually says" check, not
  just a presence/dimensions check.
  Trying to patch just the offending pixels in place (sample the
  paper/mountain boundary colour under the text band with `convert
  ... crop ... txt:-`, then paint over) turned out to be the wrong
  approach here specifically: the card's mountain silhouette isn't a
  clean affine scale of the game's own virtual-canvas ridge polygon (the
  maths diverges partway across the text band once actually checked
  point-by-point), so patching would have meant eyeballed guessing, not
  a reconstructable rule. Redrawing the whole card fresh as source SVG
  and rasterizing it was both easier and safer, and the game's own canvas
  rgba fill colours (e.g. `rgba(107,102,92,0.35)` ridge over `#f3efe4`
  paper) can be reused directly in the SVG and hand-verified by computing
  the alpha composite once (35% ink-soft over paper lands on the same
  `#c3bfb4` grey sampled from the original card), giving an exact palette
  match without needing the geometry to match too. Also worth knowing for
  this environment specifically: ImageMagick 6.9's `svg:` delegate is
  configured to shell out to `rsvg-convert`, which isn't installed here,
  but `convert file.svg file.png` still works --- it silently falls back
  to a built-in MSVG/pangocairo renderer, good enough for simple shapes
  and text. Confirmed by reading the rendered output before trusting it,
  not just checking `convert`'s exit code, since a silent-fallback render
  path is exactly the kind of thing worth a direct look rather than an
  assumption. Worth this same "redraw clean in a matched palette rather
  than pixel-patch" call on any future committed image found to violate a
  content constraint, once the underlying geometry can't be cheaply
  proven to follow a simple transform of the app's own source coordinates.
- **A brief can name a specific off-page channel to check by name, and it's
  worth checking that literal channel even after every on-page channel has
  already been swept clean.** Far Bank's brief text says "nothing in the
  README standing in for" the barred how-to-play instructions --- a
  channel distinct from the three already-found leaks (canvas aria-label,
  meta description, card image pixels), all of which live in the deployed
  page itself. A seventeenth-run check of `README.md` and every code
  comment in `main.ts` against this specific line found both clean: the
  README was the unmodified template file with no game content at all,
  and the comments talk to a future developer, never a player. A closed-
  clean result, not a bug, but confirms the "reread every text-emitting
  channel" discipline (logged above, three entries) generalises past
  channels the page itself emits to any channel a brief names explicitly
  by word, even one (a repo file) a player or an audit tool would never
  see. Worth checking a brief's literal wording for a named channel like
  this before assuming "I already checked the page" covers it.
- Crit 5 (Far Bank) finished at 39h to cutoff, on the seventeenth run, after
  the sixteenth run's hand-off explicitly flagged both standing deepen
  lenses (interaction-robustness, off-screen text) as dry across multiple
  fresh-read passes and asked the next run to try one genuinely new
  question before bringing the finishing steps forward. That one new
  question (the README/comments check above) came back clean, matching
  the crit-1 precedent already logged in this file: once a deepen phase
  has been declared dry more than once and a fresh angle turns up nothing,
  finish rather than wait out the hours-to-cutoff number, which the
  doctrine itself treats as context rather than a literal gate.
- An eighteenth run at 28h to cutoff re-verified the seventeenth run's
  finishing steps rather than finding anything new to fix: `pnpm check`,
  `pnpm check:evidence`, and a fresh `agent-browser` pass at both marking
  viewports (including a real charge-and-release landing in the water, the
  spec's "it can be lost" outcome) all stayed clean. Worth noting as its
  own small footgun distinct from the PID/socket-mismatch one already
  logged above: `vite preview` silently picks the next free port
  (4321 -> 4322 -> 4323 ...) when the requested one is already held by a
  leftover server from an earlier run, printing the actual port only in
  its own stdout --- read that line (or grep the preview process's log)
  rather than assuming the port you asked for is the one it bound, before
  pointing a browser at it. The public GitHub Pages URL still 404s at this
  point, expected per README.md: the repo stays private and Pages stays
  off until the course's `/ship` skill flips it, which is outside this
  agent's job (re-confirmed, not a new finding) --- so a clean local
  verification with no live-URL check is the correct and complete state
  for a final run that ends before `/ship` runs.
- **A bare `word:` inside a multi-line plain-scalar YAML frontmatter
  value breaks `js-yaml` (via `astro check`/content sync), even when the
  value is clearly prose, not a mapping.** Assignment 2
  (comp4020-ass2-yunlin, a course-website deliverable built on
  `astro-course-university`) hit this twice while writing assessment
  frontmatter: `description: ... week 12's counter-case: why this...`
  and `description: ... not on\n volume: eight well-argued...` both
  failed with "bad indentation of a mapping entry" /
  "can not read a block mapping entry," because a colon-followed-by-space
  partway through an indented multi-line plain scalar reads to the YAML
  parser as the start of a nested key, not as punctuation. Neither error
  names the actual word at fault --- only a line:column into the
  document --- so the fix was rereading the flagged region for any
  `word: ` pattern and rewording around it (an em dash reads fine in the
  same spot) rather than trying to escape or quote past it. Worth
  scanning any future long-form YAML frontmatter prose (descriptions,
  holistic marking blocks, spec lines) for this pattern before running
  `astro check`, on any course-website deliverable using this same
  content-collection template.
- **Course-content design decisions extend the crit 2 "picking the
  subject is itself a design decision" lesson from visual-style briefs to
  a fixed-branding content brief.** Assignment 2's course-website brief
  (`astro-theme-slop`) fixes the palette/branding entirely, so the "open
  look, argue it in prose" move from crits 1--2 wasn't available; the
  equivalent move here was choosing the *course subject itself* (a
  twelve-week studio on subtraction/omission across disciplines) as the
  place to extend this agent's own established Ni Zan/"taste is what you
  leave out" throughline --- as course content, not visual style, since
  the two briefs place the same aesthetic interest in different layers of
  the deliverable. Worth recognising which layer (visual style vs.
  subject-matter content vs. interaction design) a given brief actually
  leaves open, and porting the throughline into whichever layer is
  actually free, rather than assuming it always means "the same visual
  treatment."
- **`astro-course-university`'s `related:` field is a plain
  `z.array(z.string())`, not a typed `reference()` like `teachers:`, so a
  typo'd cross-reference slug fails silently at every layer** --- not a
  typecheck, not a build error, not a broken `<a>` for the site's own
  link checker to catch (which only sees rendered hyperlinks), since
  `content-helpers.ts`'s `getRelatedEntries` just drops any ref that
  doesn't resolve to a real pool entry and renders one fewer related
  link with no trace anywhere. Found by asking a genuinely new question
  of a fourth deepen-phase run on assignment 2 (do the course-graph
  edges actually resolve, distinct from "does every rendered `<a>` work,"
  already covered) rather than re-verifying an already-green checklist
  --- the same crit-4/5 lesson logged above, generalising past
  interaction-driven widgets to a content-collection course site. Fixed
  by adding `spec/related-refs.test.ts`: parse every content file's raw
  frontmatter `related:` list (not the built API's `related`, which is
  already the resolved-and-lossy graph and so can never show a broken
  ref) and assert each declared slug matches a real `collection/id` on
  disk; confirmed it actually fires by deliberately introducing a typo
  and reverting. Worth this same check --- reading raw frontmatter
  against known ids, not the built API --- on any future course-site
  deliverable using this template family that cross-links content via
  `related:`.
- **A brief's own explicit numeric spec (`PROCESS.md` "400--600 words")
  can go several runs unenforced by any check, since `check-evidence.ts`
  only validates that cited commits resolve, never a word count** ---
  worth a periodic direct `wc -w` (with markdown link URLs stripped, since
  raw `wc -w` overcounts every citation's URL as prose words) against any
  brief-stated length ceiling/floor, not just trusting that a file
  "looks about right" after several rounds of additive editing. Caught on
  assignment 2's fourth run: three prior additive edits (an initial
  draft, then two more paragraphs added across runs 2--3 without ever
  re-measuring) had pushed `PROCESS.md` to 668 prose words, over the
  brief's 600-word ceiling, entirely unflagged by `pnpm check:evidence`
  passing green throughout. Fixed by trimming prose density throughout
  (not cutting content) back to 562 words. General lesson: any
  brief-stated word count for a written-account file is worth checking
  directly, with a tool, specifically when about to add one more
  paragraph to it --- an editing session that only ever adds is exactly
  when a stated ceiling silently gets crossed.
- Assignment 2's fifth run found three more genuinely new, non-redundant
  checks for a course-site deliverable, all closed clean --- worth trying
  on any future course-site build once per-page fact-checks and browser
  walks are exhausted: **cross-collection date/week arithmetic** (do
  lecture week numbers, session dates and assessment due dates actually
  agree with each other, not just each fall inside the teaching period,
  which is all `data-integrity.test.ts` checks); **rereading the generated
  `llms.txt`** for genericness and cross-page fact consistency, since it's
  a text-emitting channel distinct from any single content file and easy
  to forget once the content collections themselves have been read; and
  **live pagefind search** (search a real term, read the result cards) as
  a check on both search functionality and a fresh angle on content
  coherence --- one card's title looked generic at first glance
  ("Assessment — Slop University" instead of a specific assessment name)
  but turned out correct on inspection: it was the assessments *index*
  page, whose own title genuinely is that generic string, legitimately
  listing all three assessments in one flowing page. Worth checking a
  surprising-looking result against the page's actual `<title>` before
  concluding it's a bug, same discipline as the sway-in-progress and
  hover-cursor false-alarm shapes logged for crit 4. Also confirmed this
  run: a course-site template with fixed platform branding (here,
  `astro-theme-slop`'s `slopBranding.favicon`) can already wire the
  standing favicon gap logged elsewhere in this file for a *different*
  starter --- check whether the current template's own branding already
  supplies one before assuming every template has the same gap.
- Assignment 2's sixth run found the deepen-phase Lighthouse-porting
  practice logged above (crit 1/4, assignment 1) **doesn't apply to this
  course-site template family at all**: `pnpm check`'s own build output
  reports `[astro-theme-university] Checked 31 pages ... — no accessibility
  violations` as a normal part of every build, meaning
  `astro-course-university`/`astro-theme-university` bakes an
  accessibility check into the pipeline itself, unlike the bare
  Vite/vanilla-JS starter the crit repos and assignment 1 use (which is
  why those needed a hand-wired `scripts/audit.ts`). Worth checking a
  template's own `pnpm check`/build output for an existing
  accessibility-check line before assuming the Lighthouse-porting practice
  is a universal deepen-phase task --- it's specific to starters that don't
  already run one. The same run also reread `CLAUDE.md` and the week-01
  deck (`src/decks/week-01.deck.mdx`) for drift, and swept every page's
  rendered `<meta name="description">`/`og:description` tags in `dist/`:
  all closed clean --- the deck's ten mid-course lecture titles/domains
  (theology · painting · music · fiction · film · architecture · design ·
  statistics · mathematics · politics) match weeks 2--11's actual lecture
  descriptions in exact order, and every meta description across the
  homepage, policies, people, assessments, lectures and sessions pages is
  specific to the course's own thesis, none generic or boilerplate. Two
  fresh angles clean in one run, on top of the fifth run's three clean
  angles --- worth treating this as the same "declare it dry, but at 124h
  to cutoff finishing steps are still premature" situation as the crit 1/5
  precedent, except run *far* earlier relative to cutoff: unlike those
  crits (28h, 39h out when they wound down), 124h out is not close enough
  to the deadline to justify moving to finishing steps just because two
  runs in a row found nothing --- the next run still needs a genuinely new
  angle, not permission to finish early.
- Assignment 2's eighth run broke a two-run clean streak with two real
  content bugs, found by two different techniques worth keeping distinct.
  **Cross-collection date ordering, not just date bounds**: a session
  (`painting-and-silence`) whose own prose says "read the two set lectures
  back to back" was dated `2027-03-10` while one of its two `related:`
  lectures (`lectures/week-04`) was dated `2027-03-15`, five days *later*
  --- a session referencing a lecture that, by the site's own calendar,
  hasn't happened yet. `data-integrity.test.ts` only bounds every date to
  the teaching period and `related-refs.test.ts` only checks a `related:`
  slug resolves to a real id, so neither caught it; found by asking a
  third question of the same data ("does the reference make chronological
  sense," not just "is it in range" or "does it resolve"). Fixed the
  content (moved the session to week 4, `2027-03-17`) and closed the gap
  permanently with `spec/session-chronology.test.ts`, which parses raw
  frontmatter (not the built API) and asserts every session's `related:`
  lecture date is `<=` the session's own date --- verified it actually
  fails on the original data via a temporary `sed` revert + `vitest run`
  before restoring the fix. Worth this same "do the two dates a cross-
  reference implies actually order correctly" question on any future
  course-site deliverable with a `related:`-style cross-link field,
  distinct from both existing checks (bounds-only, resolves-only).
  **Leftover starter-template scaffolding text as live content**: three
  index pages (`sessions/index.astro`, `lectures/index.mdx`,
  `assessments/index.mdx`) — confirmed via `git log` untouched since the
  very first "Initial commit" — still rendered the starter's own
  developer-facing instructions ("Weights should sum to 100.", "Set the
  visible singular and plural names once in `src/site-config.ts`...") as
  a visible paragraph under the page's h1. Not caught by any prior
  content read-pass because those passes reread *authored* content
  collections (lectures/sessions/assessments/people), never the mostly-
  empty page shells wrapping them. Found only by actually reading the
  live rendered `innerText` of a page during an unrelated browser-
  verification step, not by rereading source. Confirmed the text was pure
  redundant surplus (not filling a documented gap) by checking the
  theme's `ContentLayout.astro`: the `description` prop already renders
  as its own visible `<p class="lead">`, so the extra paragraph was never
  load-bearing. Fixed by deleting, not rewriting. General lesson: on any
  course-site template, explicitly `git log`-check every page/component
  file for "still on the initial commit" and read its *rendered* text (not
  just its source) before assuming the content-collection read-passes
  already covered everything the site ships — a page can be nearly-empty
  scaffolding and still be shipping the wrong words.
  **Compounding the standing "`vite preview` silently picks the next free
  port" footgun**: in this shared multi-project sandbox, several
  *entirely unrelated* projects (`llms-unplugged`, `benswift-me`) already
  had their own `astro dev`/`astro preview` servers bound to ports in the
  same 4321--4323 range this repo's own preview server also tries first,
  making it easy to `curl`/screenshot a completely different project's
  page while believing it's this repo's own build. `ps aux | grep -i
  astro` (checking each candidate PID's actual working-directory path,
  not just its port) is what actually resolved it — `ss -ltnp | grep
  <port>` names the PID holding a port, but only `ps`'s command-line/cwd
  confirms *which repo* that PID belongs to. Worth this two-step
  PID-then-path check every time, in this sandbox specifically, rather
  than trusting a preview server's own stdout port number in isolation.
- **A schema enum can be correctly humanized in one rendering component
  and leak raw in a sibling component that reads the exact same field**,
  a different failure shape from the earlier "person called the wrong
  role in prose" bug this same repo already fixed. `PeopleGrid.astro` had
  a `roleLabels` map (`convenor` -> "Convenor", `tutor` -> "Tutor", ...)
  right next to `TeachingTeam.astro`, which instead interpolated
  `person.data.role` directly, so every lecture/session page with a
  `teachers:` field (18 of them) rendered "— tutor" / "— convenor" in raw
  lowercase in its own "Teaching team" section, while the People index
  page one click away showed the same two people capitalised correctly.
  Found on the ninth run's repeat of the "reread every never-touched-
  since-initial-commit file" sweep (the check itself was clean this time
  --- no more leftover scaffolding text --- but reading those files closely
  surfaced this instead), not by the sweep's original method. Fixed by
  copying the same label map into the sibling component. General lesson:
  once a schema enum needs a display-label map in any one place it's
  rendered, grep for every other place that same field is read
  (`person.data.role`, `.status`, `.role`, etc.) and check each one
  applies the same transform --- a raw-enum leak doesn't trip a typecheck
  (the field really is a valid enum member) or a link/a11y checker, only
  a live read of the rendered text catches it, the same "read what it
  actually says" discipline logged elsewhere in this file for aria-labels
  and meta descriptions, just for a different field type.
- **Once a chronology-guard test exists for one relationship in a content
  graph (a session referencing a lecture that hasn't happened yet), check
  whether the identical relationship shape exists elsewhere in the same
  graph before assuming one test covers the whole risk.** A follow-up run
  asked whether assessments' `related:` lectures/sessions could likewise
  reference something dated after the assessment's own `due` date ---
  `session-chronology.test.ts` only ever checked sessions against
  lectures, never assessments against either collection. Manual check
  across all three assessments came back clean (every related lecture/
  session already predates its assessment's due date), but the gap was
  real: nothing would have caught it if a future edit moved a week around
  and broke that ordering. Closed with `spec/assessment-chronology.test.ts`,
  a near-identical guard against `due` instead of `date`, verified against
  a deliberately-broken due date before restoring. Worth this same "which
  other edges in the graph have the same shape" question immediately
  after any chronology/ordering bug is fixed in one place, rather than
  treating the first fix as coverage for the whole graph.
- The Astro View Transitions cross-fade ghosting logged elsewhere in this
  file (assignment 2, seventh run) was confirmed live to be correctly
  suppressed by `prefers-reduced-motion: reduce`: `agent-browser set
  media light reduced-motion` plus a nav click showed a clean instant
  page swap, while the identical click with reduced-motion unset
  reproduced the ghosting screenshot (both taken to confirm the
  difference is real, not just "this screenshot happened to look clean").
  Astro's `<ClientRouter>` has this built in with no theme-side CSS
  needed --- confirmed rather than assumed from that fact alone, per the
  standing "the code suggests X is safe" vs. "X is confirmed safe"
  discipline. Closes that entry's open question; no fix needed.
- **A third dev-vs-built-preview divergence, this time on an Astro site:
  `astro dev`'s injected `<astro-dev-toolbar>` intercepts keyboard tab
  order**, distinct from both the Vite-HMR-forces-reload issue (crit 4,
  live against `pnpm dev`) and the earlier View-Transitions timing false
  alarms. Assignment 2's eleventh-run keyboard pass first ran against
  `pnpm dev` and found `Tab` from the hamburger toggle landed on the dev
  toolbar's shadow-root host element instead of the next real nav item ---
  looked like a real focus-order bug until checked against `pnpm build &&
  pnpm preview` instead, where the same tab sequence moved correctly
  through skip-link -> brand -> hamburger -> search -> homepage cards, no
  toolbar element anywhere in the tab order. General lesson, generalising
  the standing "test lifecycle/interaction quirks against the built
  preview server" practice already logged for the other starter template's
  Vite HMR: on any Astro-based deliverable, run a live keyboard/focus-order
  check against `pnpm preview`, not `pnpm dev`, since the dev toolbar is
  itself a focusable, tab-order-visible element with no production
  counterpart.
- **A finding can close as "not actionable from this repo" rather than
  either "clean" or "fixed," when the gap lives in vendored theme code
  under `node_modules` rather than this repo's own tracked `src/`.**
  Assignment 2's eleventh-run keyboard pass found the mobile hamburger
  menu (`astro-theme-university`'s `Nav.astro`, installed as an npm
  dependency, not part of this repo's own source) never closes on
  `Escape` --- only a click on the toggle button flips `aria-expanded`
  back to `false`; the component's script has no `keydown` listener at
  all. Not a keyboard trap (tabbing continues past the still-open menu
  into the rest of the page normally) and the site's own build-time axe
  check still passes clean (Escape-to-close is an APG best-practice
  recommendation, not a WCAG failure a11y tooling enforces), so it's a
  real but minor platform-level rough edge rather than a bug in anything
  this course repo actually owns --- the README is explicit that the
  theme package "arrived" fixed, and a `node_modules` edit wouldn't
  persist as this repo's own work regardless. Worth this same "is the gap
  in this repo's tracked source, or in a vendored dependency I can't
  meaningfully edit" question before spending effort on any future finding
  that surfaces inside an installed theme/component package --- it's a
  third, genuinely different outcome from the "closed clean" /
  "closed, fixed a real bug" pair already logged throughout this file
  (crit 5's `Target.discardTarget` absence is the nearest precedent, for a
  CDP method rather than a vendored UI component).
- **A brief-stated word ceiling can silently get re-crossed by a single
  later, unrelated additive commit, even after it was already trimmed
  back under the limit once.** Assignment 2's `PROCESS.md` was trimmed to
  562 words at one run (`a67dd65`), then a later run's citation addition
  (`17cfa89`, citing a second verification example) pushed it to 616 ---
  over the brief's 600-word ceiling again --- with nothing in
  `check:evidence` (which only validates citation resolution, never word
  count) catching it. Found only by rerunning the standing `perl -pe
  's/\(https?:\/\/[^)]*\)//g' PROCESS.md | wc -w` measurement again on a
  routine deepen pass, not triggered by anything specific to that commit.
  Re-trimmed to 583, leaving real margin this time rather than landing
  exactly at 600 (the first trim pass landed at exactly 600, which is too
  close to trust against any counting-method ambiguity --- rewrote a
  second pass down to 583). General lesson, sharpening the existing "an
  editing session that only ever adds is exactly when a ceiling silently
  gets crossed" entry in this file: the word-count check needs rerunning
  after *every* `PROCESS.md` edit that adds text, not just periodically ---
  one clean measurement doesn't stay true past the next addition, and
  trimming back to just under a stated ceiling is itself risky; leave
  headroom, not the minimum passing margin.
- The standing lesson to check a collective claim about people ("both
  teachers," "both convenors") against each named person's own page held
  up a second time on assignment 2, confirming it as a durable pattern
  rather than a one-off: `policies/index.mdx` claimed "office hours are
  held by both teachers weekly," but Idris's own contact field only ever
  offered seminar/email availability, never office hours, matching his
  practitioner-tutor characterisation elsewhere. Fixed by naming each
  person's actual arrangement instead of asserting a shared one
  (`c9bde85`). A close read of a second collective claim in the same
  sweep --- a session's afterwards note that "both teachers hold open
  office hours" for the two weeks after the final seminar --- came back
  clean rather than treated as the same bug: that claim is scoped to the
  post-seminar window when Idris's usual "ask during the seminar" channel
  no longer exists, a defensible one-time exception rather than a
  recurring claim about the whole semester. Worth this same two-step
  check (does the collective claim hold, and if a second instance looks
  similar, does its actual scope still make it true) on any future
  course-site deliverable with more than one named teacher/convenor.
- A dedicated structural-repetition reread --- all twelve lecture weeks
  and all six sessions, back to back, asking specifically whether any
  read as "the same week with the nouns swapped" (the brief's own stated
  failure mode for this assessment) --- came back clean on assignment 2's
  twelfth run: each week argues a different discipline with its own
  concrete examples, sources and rhetorical move, and the three
  assessments escalate in stakes/scope rather than repeating a template.
  Distinct from every fact-check/chronology/cross-reference pass already
  logged for this repo, since none of those specifically ask "does this
  read as templated," only "is this claim/reference correct." Worth this
  specific reread --- content correctness and structural non-repetition
  are different questions --- on any future multi-week course-site
  deliverable, especially one explicitly marked down for repetitiveness
  regardless of CI status.
- **The artefact criterion's HD band names three scenarios --- "the
  keyboard, a resize mid-interaction, a slow connection" --- and it's
  worth checking a course-site deliverable (not just a game/instrument)
  against the one none of the interaction-heavy crits ever needed: a slow
  connection.** Assignment 2's fifteenth run found this the one untried
  angle after five prior dry deepen passes. Checked live with the same
  Node-24-native-`WebSocket` CDP-script technique used throughout this
  file (`Target.getTargets` -> `attachToTarget` flatten -> `sessionId`),
  driving `Network.emulateNetworkConditions` at a slow-3G-like profile
  (400kbps/400ms latency, and a slower 150kbps/600ms pass to stretch the
  load window for mid-load screenshots) against the *built* `pnpm preview`
  server: homepage and a deck page both loaded clean in ~2.3--2.5s with
  zero console errors and zero failed requests at both marking viewports;
  the responsive hero image actually served its smaller avif variant at
  the 390px viewport (390px natural width vs. 1280px at desktop),
  confirming the srcset works under real throttling, not just present in
  markup; the pagefind search modal opened and returned results within
  ~800ms of a throttled click; and mid-load screenshots at 350ms intervals
  showed no FOUC or layout shift, since the hero illustration's container
  is sized before the image arrives. All clean, no fix needed. One tool
  gotcha worth keeping: this theme's icon-only buttons (search trigger,
  nav toggle, theme toggle) have empty `textContent` --- their accessible
  name lives in `aria-label`/`title`, so a CDP script selecting by text
  content misses them; select by class or `aria-label` instead. General
  lesson: the "keyboard"/"resize mid-interaction" pair from this same HD
  band has by now been checked on every interaction-heavy crit in this
  file, but "a slow connection" hadn't been tried on a *content*-heavy,
  many-page site before --- worth this same throttled-reload-plus-
  mid-load-screenshot check on any future course-site or content-heavy
  deliverable, not just games/instruments, since responsive images and
  FOUC are content-site-shaped risks a game's canvas-only rendering
  doesn't have.
- **A human-graded band ("legibility of process," "response to the
  brief") is checkable by rereading the write-up against the brief's own
  specific ask for what it should center on --- distinct from every
  live/CDP check in this file, which only reaches the artefact band.**
  Assignment 2's sixteenth run found `PROCESS.md` had narrated only
  technical/content-verification decisions (spec/ checks, fact-check
  passes) across fifteen prior runs, never the brief's explicit ask to
  centre on "decisions about what makes a good course, which became
  encoded rules (in CLAUDE.md or spec/ checks), and which were
  deliberately omitted." Fixed by naming which `CLAUDE.md` content rules
  (argue-the-thesis, no filler weeks, no scope creep) were themselves
  course-design decisions, and what was deliberately left out (visual
  restyling) --- while trimming elsewhere to stay under the 600-word
  ceiling (landed at 591, not the exact edge, per the standing lesson to
  leave headroom). Worth this same reread --- the brief's literal wording
  for what a written account should center on, not just its word-count/
  citation mechanics --- on any future assessment whose write-up
  criterion is the heaviest-weighted one, once the artefact-level
  browser/CDP checks read exhausted.
- **When an assessment's own `related` field names a `-retro` crit,
  that crit's own page text (not just the doctrine's paraphrase of it)
  can carry a literal, checkable spec for the write-up --- worth
  fetching directly rather than assuming the doctrine's summary is
  the whole ask.** Assignment 2's seventeenth run fetched
  `crits/06-a2-retro`'s body directly and found it says the retro
  presents "the specific change that made the course click ... shown
  as a before/after," drawn from `PROCESS.md`. Sixteen prior deepen
  runs had checked `PROCESS.md` against the general "process" and
  "response to the brief" bands, but never against this specific
  crit's own wording --- a real gap, not a re-verification: the file
  named several harness decisions but never framed any single one as
  *the* click moment with an explicit before/after, so a retro
  presenter would have had to invent that framing rather than find it
  ready-made. Fixed by retitling the closing section "The breakthrough"
  and picking one candidate to name explicitly (realising the subject
  itself, restraint, had to constrain the build process --- before:
  nothing capped weeks/assessments; after: a hard `CLAUDE.md` rule
  banning that scope creep). General lesson: whenever a brief's
  `related` list names a retro/demo crit that presents from a specific
  file, fetch that crit's own page text once and check the file against
  its literal wording, not just against the assessment brief's own
  rubric --- it can name a narrower, more specific ask (here: "the
  specific change," singular, with "before/after") than the general
  process band does, and it's a check no prior run had tried because
  the assessment brief text alone doesn't spell it out --- only the
  linked crit's own page does.
- Assignment 2 (SLOP3268) finished on its eighteenth run, the one the
  prompt named final, at 28h to cutoff. The seventeenth run's hand-off
  asked one last fresh-eyes question --- does "The breakthrough" section
  actually read as the single clearest retro-presentable moment, or
  would a demo more naturally reach for the `related:` silent-failure
  catch instead --- and it held: a course-*design* realisation with a
  real before/after outranks a good technical bug fix as a retro
  candidate. Closed with the standard finishing sweep (`pnpm check`,
  `pnpm check:evidence`, browser walk at desktop and 390x844 against
  the built `pnpm preview` server, console clean throughout, server
  stopped, `git status` clean). Confirms the crit 1/5 precedent a third
  time: once a deepen phase has been declared dry across multiple
  fresh-angle passes (here, three consecutive: the fifteenth, sixteenth
  and seventeenth runs), the right move on the run the prompt calls
  last is to verify and stop, not manufacture one more pass.

## Crit 7 additions (agent-browser footguns, cross-tab live-update technique)

- **A bfcache restore (`agent-browser back` after navigating away, confirmed
  genuine via `pagehide`/`pageshow` `persisted=true` listeners added before
  leaving) keeps a page-level `EventSource` connection alive and receiving
  events, at least on this server-rendered, SSE-driven page** — a distinct
  scenario from the tab-visibility, CDP freeze/thaw, and Web-Audio bfcache
  checks already logged above for canvas apps, none of which cover a plain
  HTTP streaming connection. Crit 7's room board: instrumented one tab with
  the persisted-event listeners, navigated it away and back (confirmed
  genuine restore), left it untouched, then made a real booking from a
  second, independent tab — the restored tab auto-updated via its own
  `location.reload()` with no manual command, confirmed by checking that an
  injected `window` global from before the navigation came back `null`
  afterwards (proof a real reload fired, not a stale-DOM false read). Same
  "can't intercept a module-scoped construction after the fact" gotcha as
  the `audioCtx`-on-`window` one already logged for crit 4: the page's own
  `EventSource` was a `const` inside an inline-script IIFE, already
  constructed by the time an `eval` could patch `window.EventSource`, so
  the check had to verify real end-to-end behaviour rather than the
  connection object's internal state. Worth this same live bfcache check —
  not just reasoning from "SSE is just HTTP, it should survive" — on any
  future page whose live-update channel is SSE/WebSocket rather than
  Web Audio.
- **Deleting only a SQLite database's main file while leaving its
  `-wal`/`-shm` sidecar files behind will replay stale data into the
  "fresh" file on next open**, a footgun distinct from every browser/CDP
  one logged elsewhere in this file since it's pure SQLite mechanics.
  Setting up a scratch DB for the bfcache check above, an earlier
  `drizzle-kit push` against the same path had left `app.db-wal`/
  `app.db-shm`; deleting just `app.db` and restarting the app caused
  `better-sqlite3` to recover the old WAL onto the new empty file,
  so the app's own boot-time `migrate()` call hit "table already exists"
  and 500'd with an error that gave no hint the root cause was leftover
  WAL state rather than a real migration bug. Fixed by `rm -rf`-ing the
  whole scratch directory. Worth deleting a scratch SQLite DB's entire
  directory (not just the `.db` file) whenever resetting one for a live
  check on any future SQLite-backed deliverable in this course.

- **Two `agent-browser` footguns hit driving a plain HTML `<form>` with a
  native time input, worth expecting on any future non-canvas/DOM widget in
  this family**: `fill` on `<input type="time">` silently leaves the value
  empty rather than erroring — Chromium's time control doesn't accept the
  plain colon-separated keystrokes `fill` types character-by-character.
  Set `.value` directly via `eval` and dispatch `input`+`change` events
  instead. Separately, a bare tag selector (`click "button"`), not just
  `find text ... click` (already logged above for ambiguous *text*
  matches), can hit the wrong element with no error: Chromium exposes a
  time input's own spin/calendar-indicator as an accessibility-tree
  `button` ("Show time picker") that can sit earlier in DOM order than the
  form's real submit `<button>`. `snapshot` for a `ref=` and `click
  "ref=eN"` is the fix for both the text-match and plain-tag-selector
  versions of this same ambiguity. A third variant of the same time-input
  footgun, found later on the same repo: setting a time field's `.value`
  via `eval` *while a real Tab sequence is already mid-flight through that
  field's own internal hour/minute segments* leaves keyboard focus stuck
  cycling inside it indefinitely — many further Tabs go nowhere, and Enter
  silently no-ops instead of reaching the submit button — even though a
  fresh page load's own untouched Tab walk reaches the submit button
  normally every time. Not a real page bug; the fix is doing the `.value`
  assignment immediately after a fresh `.focus()` call on that field,
  before any Tab presses land on it, rather than interleaving the two.
- **Ran the artefact criterion's HD-band trio — keyboard, resize
  mid-interaction, a slow connection — on crit 7's room board for the
  first time; all three came back clean.** Keyboard: a fresh-page Tab walk
  from `<body>` matched DOM order exactly, native `required` validation
  blocked an empty submission and moved focus to the first invalid field,
  and a fully keyboard-driven booking (real keystrokes for text, the
  `.value`+event-dispatch workaround for the two time fields, Tab to
  submit, Enter) and a keyboard-reached Cancel both worked end to end.
  Resize mid-interaction: typing into a field at 1280×800 then resizing
  live to 390×844 with no reload preserved both the value and focus, no
  layout breakage. Slow connection: throttled to 150kbps/400ms via a raw
  CDP `Network.emulateNetworkConditions` script (same flatten-mode
  `attachToTarget` technique used throughout this file), the page — fully
  server-rendered HTML with no external render-blocking assets — showed
  the complete, correctly-styled page even in the first 350ms mid-load
  screenshot (no FOUC to catch, unlike a client-hydrated framework), and a
  real booking submitted under the same active throttle completed
  correctly with a clean console. Worth recording as a clean HD-band
  check discharged specifically for a full-stack/database-backed
  deliverable — the version of this check logged for assignment 2 (a
  static content site) and crit 5 (a canvas game) both predate this one,
  and neither substitutes for actually running it against a server-backed
  write-flow.
- **The "two real tabs, not one probe" technique generalises past the
  `localStorage` cross-tab race check above to any live-update mechanism a
  page claims to have** — `--session <name>` gives two genuinely
  independent `agent-browser` sessions/tabs (each needs `--args
  "--no-sandbox"` on this container) that can both sit on the same page
  simultaneously, one acting while the other is left alone to observe.
  Crit 7's room board claims (in its own source comment) that "any tab
  looking at this same date reloads the moment a booking is made or
  cancelled anywhere" via a page-level `EventSource`/SSE connection to a
  shared server-side `EventEmitter` bus — a claim only a same-tab probe
  had checked before. Two real tabs against the built `pnpm preview`
  server confirmed it both ways: tab A booked, untouched tab B
  auto-reloaded and showed the new row with no manual reload command; tab
  B then cancelled, and tab A's own reload reflected it. Worth this same
  two-tab pattern (not a same-tab probe, and not just reasoning about the
  server-side fan-out code) on any future deliverable that claims a live
  multi-viewer update channel — SSE, WebSockets, or polling alike.
- **A fix that schedules exactly one reload at "the next boundary where a
  server-rendered-once value goes stale" is only as complete as the set of
  boundary *kinds* it enumerates, and midnight is a boundary kind of its
  own, distinct from any booking's start/end.** Crit 7's first stale-render
  fix (`nextBoundaryDelayMinutes`, logged above) scheduled a reload at the
  next booking start/end time today, closing the "happening now" highlight
  going stale mid-tab-session. Its own test suite already documented the
  edge this didn't cover as an *expected* result:
  `nextBoundaryDelayMinutes("09:00", ["08:00"])` (no future booking
  boundary left today) returns `null` — meaning no reload is ever
  scheduled for the rest of the day once the last boundary passes, not
  even at midnight. A tab left open past that point kept the date-nav's
  `(today)` label and the whole rendered board frozen on the render's
  day forever, contradicting this repo's own README claim ("who's booked
  what today"). Confirmed live against the built preview server at the
  real wall clock, on a day with zero bookings (every room "Free all
  day"): the rendered `nextBoundaryDelay` was `127` (exactly the minutes
  to Canberra midnight) after the fix, where it would have been `null`
  before. Fixed by layering midnight in as an always-present fallback
  boundary in a new `nextReloadDelayMinutes`, without touching the
  original function's own semantics or tests (its "doesn't wrap past
  midnight" test is about a *booking* not spanning two days — a different
  claim from "the page should reload at midnight"). General lesson,
  sharpening the "enumerate every event that ends a gesture" family of
  lessons logged for crit 4/5 into this repo's own idiom: once a fix adds
  a scheduled-reload-at-the-next-boundary mechanism, explicitly ask
  whether every *kind* of boundary the page's claims depend on is covered
  — a content/date boundary (midnight, a week rollover, a term date) is as
  real a boundary kind as an event-driven one, and a test suite that
  documents the uncovered case as its *expected* behaviour (rather than a
  bug) is a strong signal worth rereading with exactly this question.
- **The same boundary-enumeration question has a second, symmetric edge:
  a page whose "isToday" comparison is date-nav-navigable, not just
  render-time-fixed, needs the reload scheduled for the view that is
  *about to become* today, not only the view that already is.** A
  follow-up run on the midnight-rollover fix above asked whether a tab
  parked on `/?date=<tomorrow>` (an explicit forward date-nav click, left
  open) ever picks up its date becoming today once real midnight passes.
  `nextBoundaryDelay` was unconditionally `null` for any `!isToday` view,
  so no reload was ever scheduled — confirmed live against the built
  preview server (curl'd the rendered `const nextBoundaryDelay = null;`
  for a `?date=` one day ahead before touching anything). Fixed by
  extracting `minutesUntilMidnight` out of `nextReloadDelayMinutes` (same
  arithmetic, no behaviour change to the existing function/tests) and
  adding a branch in `index.astro`: when the viewed date is exactly
  tomorrow, schedule a reload at `minutesUntilMidnight`; any date further
  out still gets `null`, since nobody parks a tab days ahead waiting for
  it to become today. Confirmed live before and after on the built
  preview server (`nextBoundaryDelay` went from `null` to matching
  minutes-to-midnight for the tomorrow view; a two-days-out view stayed
  `null`), then deployed and reconfirmed against the live Fly URL.
  General lesson: once a "reload at the next boundary" fix exists for the
  *default* (today, no explicit date) view, check whether the same page
  has *other* views of the same underlying data (a date-nav step, a
  filter, a saved link) that could similarly transition into matching the
  live-highlighting condition over time — the fix for the default view
  doesn't cover them automatically just because they render the same
  component.
- **When a brief's `related` list names a `-retro` crit, fetch that
  crit's own page text before assuming the doctrine's general "PROCESS.md
  must carry the breakthrough" rule applies to *this* repo's file** — it
  can instead be about a different, already-completed deliverable.
  Crit 7's `related` list includes `crits/06-a2-retro`; fetching it
  showed its own text is explicit that "the breakthrough comes from the
  `PROCESS.md` you submitted with Assignment 2" — a past assignment, not
  this crit. The retro already presented from that file; nothing about
  crit 7's own `PROCESS.md` needed a before/after breakthrough framing on
  this basis. Extends the same lesson already logged for assignment 2
  (fetch the linked retro's literal wording rather than trusting the
  general rule) with the opposite outcome: there, the fetch narrowed what
  the rule demanded; here, it ruled the rule out entirely for this repo.
  Worth treating "checked, doesn't apply here" as a distinct, valid
  outcome of this check — not a reason to skip making the check.
- Multiple unrelated projects in this shared multi-project sandbox can
  already hold ports in the same low-4000s range a freshly built preview
  server binds to by default (this run's `PORT=4399`/`4501` first
  attempts landed on an already-running "AI Tracker" project's page, with
  an identical byte-for-byte-sized response at two different guessed
  ports — the giveaway wasn't the port number, it was the response's own
  `<title>` reading something other than "Room board"). `ss -ltnp` to find
  a genuinely free port, then checking the response's own `<title>`/
  distinguishing content before trusting a curl result, is the reliable
  sequence — extends the standing "PID-then-path" port-collision lesson
  logged for assignment 2 with a cheaper, curl-only version of the same
  check for whenever a full `ps`-based investigation isn't warranted.
- **A server-side code comment claiming "no two requests can interleave
  here because [runtime X] is synchronous" is a checkable claim about the
  app's own behaviour, same category as any other, and needs the same live
  check before being trusted.** Crit 7's `addBooking` (`src/lib/db.ts`)
  argued its own check-then-insert overlap logic is race-free because
  better-sqlite3's calls are synchronous — a claim no prior run had
  actually driven with real concurrency. Verified by firing genuinely
  parallel `curl` POSTs (backgrounded shell processes, not sequential
  `await`s, which never actually race) at the same room/date/overlapping
  time against the built preview server — 2-way and 5-way, both landed
  exactly one booking with everyone else correctly getting
  `error=conflict`. Needed `-H "Origin: http://<host>"` on every request:
  Astro's built-in CSRF check 403s a cross-origin POST with no matching
  Origin header, which a bare `curl` doesn't send by default (browsers
  do). Turned the one-off live check into a permanent regression test
  using `Promise.all` over real overlapping `fetch` calls against the
  vitest global setup's own running app server (`inject("baseUrl")`), not
  mocks — worth this same technique on any future full-stack deliverable
  whose write endpoint's own code comments or docs assert a concurrency-
  safety property, since it's exactly the kind of claim a single-request
  test suite structurally cannot exercise.
- Crit 7's wall-clock "boundary enumeration" lens on its live-highlighting
  logic (highlight staleness → midnight rollover on the default view →
  tomorrow's view rolling into today → a past date's view) closed dry
  after four checks, three real fixes and the fourth (a past-date view
  never needs a reload, since `isNowWithin` is hard-gated on `isToday`)
  clean. Worth remembering the shape of when to stop: once a lens has
  produced several real fixes in the same family and the next check in it
  comes back clean, the next fresh angle should come from a different
  subsystem entirely (here: a server-side concurrency check, a different
  failure family than every prior DOM/browser-timing one) rather than a
  fifth variant of the same boundary question.
- Ran the forced-colors/prefers-contrast lens (established on crit 5's
  canvas game) on crit 7's form-based room board for the first time: a raw
  CDP script toggling `Emulation.setEmulatedMedia` between `forced-colors:
  active` and `prefers-contrast: more` showed the page correctly inherits
  system forced-colors values (no `forced-color-adjust: none` opt-out
  anywhere, the right default here since there's no canvas needing an
  exemption), and `prefers-contrast: more` changing nothing rendered turned
  out to be correct rather than a gap once both live contrast ratios were
  computed directly: seal-on-paper (the "— now" highlight text) at 7.35:1
  and ink-on-paper body text at 14.50:1, both already clearing WCAG AAA's
  7:1 floor with no headroom a contrast-boost branch would need to add.
  Worth computing the actual ratio before treating "nothing changed under
  prefers-contrast" as a finding — it can mean the page was already
  high-contrast enough that the media query has nothing to add, which is a
  clean result, not a miss.
- Followed the `addBooking` concurrency check with the same live discipline
  on `cancelBooking`, which has an even simpler shape (a single delete
  statement, no read-then-write check at all): 5 genuinely concurrent
  `curl` cancels of the same id all returned 303 with exactly one actual
  deletion; a cancel racing a new overlapping booking for the freed slot,
  repeated ~20 times, held the invariant that the original is always gone
  and the racer lands iff its own redirect carries no `error=conflict` —
  never both present, never a silent unexplained loss. Both turned into
  permanent regression tests. This closes the concurrency-race lens across
  *both* of a booking app's write endpoints, not just the one whose own
  code comment happened to prompt the first check — worth checking every
  write endpoint a concurrency claim could apply to, not just the one that
  states it explicitly, once the lens is open.
- **A repo's own `memory/MEMORY.md` — the one that actually publishes with
  the deliverable, per this doctrine's "memory/ is yours, and it publishes
  with your work" — can silently drift out of sync with this global,
  cross-crit file even when the repo-local file's own header says exactly
  which lessons belong in it.** Crit 7's `comp4020-crit7-yunlin/memory/
  MEMORY.md` states plainly that repo-specific lessons live there and
  cross-crit ones live here — but three real fixes (the midnight-rollover
  and tomorrow-view boundary fixes, and the `addBooking` concurrency test)
  had only ever been logged in *this* file, never backfilled into the
  repo's own copy, discovered only when a routine reread of `PROCESS.md`/
  `README.md` for staleness happened to open the repo-local file too.
  Since the global file lives outside every deliverable repo and doesn't
  ship with any of them, that gap means a marker or future reader of just
  that repo would see an incomplete account of real, substantive work —
  not a cosmetic redundancy gap. Fixed by backfilling the three missing
  entries plus the cancel-concurrency check above into the repo-local
  file. General lesson for every future deliverable in this course, not
  just crit 7: whenever a fix gets logged here (the global file) because
  that's the natural place to write while deep in a live-check session,
  check afterwards whether the repo's *own* `memory/MEMORY.md` also needs
  the same entry — the two files are not automatically kept in sync just
  because one imports information about the other's existence, and this
  is worth treating as a standing periodic check (not a one-off fix) on
  any deliverable repo that keeps its own memory file at all.
- **A live-update channel with no replay/Last-Event-ID mechanism silently
  drops anything broadcast while a client is disconnected, and a
  disconnect isn't a hypothetical on a Fly.io deliverable --- it's what
  every deploy restart does.** Crit 7's room board reloads a tab on a
  `booking` SSE event, but nothing handled the connection dropping and
  reconnecting itself: an event fired during the gap was gone forever
  once the client reconnected, discovered by actually killing and
  restarting the real server process mid-session (not a CDP offline
  toggle --- see the next entry) and watching a booking made during the
  outage never appear on the reconnected tab. Fixed by reloading on every
  SSE `"open"` event after the first, since `open` fires on reconnect as
  well as initial connect and the only safe assumption post-reconnect is
  that something might have changed. General lesson for any future
  deliverable with a push-based live-update channel (SSE, WebSocket) on
  Fly.io: a deploy restart is a real, expected disconnect scenario for
  every user with the page open at deploy time, not an edge case --- check
  what the client does on reconnect specifically, not just on receiving
  an event, the first time such a channel is added.
- **Chrome's CDP `Network.emulateNetworkConditions({offline: true})` does
  not sever an already-open SSE (`EventSource`) connection** --- a
  genuine methodology finding, not a workaround for a bug that wasn't
  there. A probe's `readyState` stayed `1` (OPEN) throughout, and it kept
  receiving events fired while "offline." Realistic simulation of a
  dropped long-lived connection on this Chrome build needs an actual
  server-side interruption (kill and restart the real process, or a raw
  CDP `Network.enable` + intercepting/failing the specific request) rather
  than the offline-emulation lever that works for ordinary fetch/XHR
  traffic. Worth trying the real-process-kill approach first for any
  future SSE/WebSocket disconnect check in this environment, rather than
  assuming CDP's network-conditions API reaches every connection type.
- **jsdom's `Location.reload` (and by extension `.assign`/`.href`) is
  non-configurable, same as real Chrome's, so a test can't spy on it via
  `Object.defineProperty` --- but jsdom reports every call to an
  unimplemented navigation API as a `"jsdomError"` on a custom
  `VirtualConsole`, which is enough to count calls indirectly.** Used to
  test crit 7's SSE-reconnect-reload fix by actually running the shipped
  inline script in jsdom (`runScripts: "dangerously"` plus a `beforeParse`
  hook substituting a `FakeEventSource` for the real one, rather than the
  `runScripts: "outside-only"` pattern this repo's other jsdom tests use,
  which never executes scripts at all) and filtering `virtualConsole.on
  ("jsdomError", ...)` for messages containing "navigation." Confirmed the
  test genuinely exercises the fix (not just present-but-untested) by
  temporarily `git stash`ing the fix and watching the test fail. Worth
  this `runScripts: "dangerously"` + `VirtualConsole`/`jsdomError`
  combination for any future deliverable needing a jsdom test that
  actually runs a page's own inline script and asserts on a call to a
  non-configurable navigation method, rather than settling for a weaker
  "the code contains this string" test.
- **A raw Python TCP socket, not `curl`, is the way to test a write
  endpoint against a request whose actual body doesn't match its declared
  `Content-Length` --- `curl` always sends a consistent header/body pair,
  so it can't produce a genuinely truncated request on purpose.** Checked
  two variants against crit 7's `/api/bookings` on a scratch preview
  server: a socket that declares the real length but only sends half the
  bytes before closing, and one that sends the complete, valid body but
  closes immediately without reading any response. The first never
  reached the route handler at all --- Node's own HTTP layer threw `Error:
  aborted` in `abortIncoming` before Astro's `request.formData()` ran, so
  no partial/corrupt row was ever written, and the server kept serving
  requests afterwards (confirmed with a follow-up `curl`). The second
  *did* commit the write and *did* broadcast over SSE to an independent
  observing connection (a separate `curl -N` against `/api/events`,
  watched for the `event: booking` line) even though the submitting
  client never read the response --- the correct, desired behaviour for a
  user who bails right after hitting submit, not a bug. General lesson
  for any future full-stack deliverable with a form-POST write endpoint:
  "what if the client disconnects mid-request" is two distinct questions
  (does an incomplete body corrupt anything; does an abandoned-but-already-
  complete request still commit and still notify other viewers) and both
  are cheap to test directly with a scripted socket once curl's
  can't-lie-about-Content-Length limitation is worked around this way.

Crit 7 (Room board) finished on the run the prompt called last, 28h to
cutoff. The deepen phase across the week found a genuinely different bug
family from every prior crit's canvas/DOM-timing lens: a live, wall-clock-
computed accent colour turns "is this claim still true" into a question
that has to keep being re-answered as real time passes, not just at ship
time --- the source of the midnight-rollover, tomorrow-view-rollover,
SSE-reconnect-data-loss, crafted-cancel-date, and DST-transition bugs all
fixed this week, plus two write-endpoint concurrency claims (`addBooking`,
`cancelBooking`) that only real concurrent `curl`/`fetch` load, not a
synchronous-runtime argument in a code comment, could actually confirm.
The reflection (`reflections/crit-7.md`) names this as the run's
breakthrough: a live app's correctness surface is temporal, not just
static, and "the reasoning is sound" and "confirmed against a running
clock/concurrent load" are different claims worth keeping distinct going
forward on any future data-backed deliverable. The final run itself found
no new bugs --- PROCESS.md/README.md both reread against current behaviour
and still accurate, full manual verification (book/highlight/persist/
overlap-reject/cancel at both viewports) clean against a scratch server
and again against the deployed live URL. Confirms the crit 1/5/assignment-2
precedent a fourth time: once a deepen phase has been declared dry and a
fresh angle (here, DST) still closes clean, the finishing run is for
verifying and shipping, not manufacturing one more find.

## Crit 8 additions (node:sqlite, no-build-step TypeScript)

- **Node 24 ships `node:sqlite` (`DatabaseSync`) and native `.ts` execution
  both unflagged, and combining them removes an entire category of Docker
  friction crit 7's `better-sqlite3` needed.** Verified directly (not
  assumed from changelog memory) before committing to the stack: `node
  -e "require('node:sqlite')"` and `node some-file.ts` (importing
  `node:sqlite` inside it) both worked on Node 24.21.0 with zero flags,
  zero native-module compilation, zero build step. This means the
  Dockerfile for a SQLite-backed Node app on this course's Fly.io template
  can skip the native-module-compile stage crit 7 needed entirely (no
  `python3`/`make`/`g++` in the image, no prebuilt-binary version matching
  between build and runtime architecture) and skip a `tsc` build stage too
  (the shipped image runs the same `.ts` source the repo typechecks and
  tests against, not a compiled artifact) --- both real simplifications
  under the same 256MB/one-machine Fly constraint every deliverable in this
  course runs under. Trade-off, recorded rather than hidden: `node:sqlite`
  is newer and less battle-tested than `better-sqlite3`; worth revisiting
  if a future deliverable needs something the stdlib module doesn't cover.
  Worth checking for on every future Node+SQLite deliverable in this course
  before reaching for `better-sqlite3` by default out of crit 7 habit.
- **This sandbox's `docker build`/`docker run` need `sudo` specifically**
  (`ben` is in the `docker` group per `groups`, but the socket still
  answers "permission denied" to a bare `docker` command; `sudo -n docker`
  works with no password prompt). Worth trying `sudo docker` immediately
  on a "permission denied ... docker.sock" error in this environment,
  rather than investigating group membership or restarting the daemon.
- Confirmed the standing "verify against the exact image CI builds, not a
  locally-started dev process" practice (already logged for crit 7) still
  holds here: built the real `Dockerfile`, ran it with `--tmpfs /data`
  (matching `.github/workflows/checks.yml` exactly), and ran `pnpm check`
  against that container before ever deploying. Caught nothing this round
  the dev-process run hadn't already, but it's the same check, cheap, and
  worth doing on the first slice of every future deliverable, not only
  once something breaks.

## Crit 8 additions (final project — Colophon)

- **Rejecting an oversized request body by destroying the connection early
  races a still-writing client into a raw connection error instead of the
  intended clean response — draining the stream to its natural end while
  discarding past the cap, rather than accumulating or destroying, removes
  the race without giving up the memory-safety property.** Colophon's
  `readBody` had no size cap at all at first — a request skipping the
  form's own `maxlength="320"` could buffer an arbitrarily large body into
  memory on a 256MB single-machine deploy, the same "check what a crafted
  request could do at the API boundary" lesson already logged above for a
  prior crit's booking endpoint. The first fix (`req.destroy()` once the
  cap was crossed) and the second (resume-and-respond without destroying)
  both looked correct and both passed `pnpm check` — until repeated runs
  against the *built Docker image* (not the dev server) showed an
  intermittent `EPIPE`/`TypeError: fetch failed` on the exact same
  fetch-based test, roughly every second or third run. The race: a large
  `fetch()`-driven body is still being written by the client's own
  networking stack when the server ends the response and (in the
  destroy case) tears down the socket, or (in the resume case) closes it
  once draining finishes — either way, closing before the client's write
  has actually completed can beat the client into an error before it ever
  reads the response. The fix that held: never destroy or preemptively
  close the connection; keep reading (and discarding, not accumulating)
  chunks past the cap until the stream ends naturally, then respond. This
  costs no memory (each discarded chunk is immediately GC-eligible) and
  removes the race entirely, since the response is only sent once the
  client's own write has actually finished; a stalled or endless malicious
  body is bounded by Node's own default request timeout, not by this
  function. Confirmed by running the regression test five times in a row
  against the built image before trusting it — a single green run had
  already been seen for each of the two broken attempts, so "it passed
  once" was not enough evidence on its own for a fix touching connection
  lifecycle timing; only repetition surfaced the flake. General lesson for
  any future full-stack deliverable with a request-size cap or similar
  early-rejection logic: prefer draining a stream to completion over
  destroying or half-closing it early, and re-run any regression test for
  a connection-timing fix several times against the *built* artifact
  before considering it verified, not just once.
- **The "one accent, one meaning" self-check (crit 7: `--seal` drifting
  into an unrelated `.error` banner) recurred a second time, in a
  different repo, confirming it as a standing pattern rather than a
  one-off.** Colophon's own `CLAUDE.md` states the same rule for its own
  `--seal`; a routine deepen-phase reread of `styles.css` (not prompted by
  any specific suspicion) found it reused in three unrelated places — a
  kicker line, a form-error banner, and a blockquote border — none of them
  "this colophon is yours." Fixed, and this time closed with a permanent
  grep-based test (`spec/accent.test.ts`) rather than just a patched line,
  per this project's own stated practice that a found bug gets a new
  `spec/` test, not just a fix. Worth treating this as a standing early
  check — not just a thing to remember from one past incident — on any
  future deliverable whose own harness states a similarly absolute
  "this accent means exactly one thing" rule: grep for the custom
  property directly, early, rather than waiting to stumble onto the drift.
- **A previous run's own hand-off can name the wrong next action if it
  points at a future crit's content before that crit's own brief has ever
  been fetched, and following it can mean contradicting prose the current
  week already shipped.** The run after Colophon's proof-of-life slice
  named "build crit 9's real-time layer" as the single most important next
  action — reasonable-sounding, since the schema was already shaped to
  carry it, but wrong: crit 8's own fetched brief explicitly says
  real-time "can all wait," and both `README.md` and `PROCESS.md` already
  argued, in prose that shipped that same week, "this week is the smallest
  version of the object itself." Building the broadcast layer before
  crit 9's own brief had ever been fetched would have meant either
  contradicting that shipped argument or rewriting it defensively — scope
  creep dressed as initiative. Stayed inside the current crit's own fetched
  brief instead and did a deepen-phase pass grounded in this repo's own
  harness rules, which is where the two bugs above came from. General
  lesson: treat a hand-off's "next action" as a hypothesis to check against
  the *current* run's own fetched course-source, not an instruction to
  execute blindly — especially on a multi-week deliverable where later
  weeks' briefs don't exist yet as far as any run before their own cutoff
  is concerned.
- **The "what could a crafted request do at the API boundary" lens (crit 7,
  a booking write endpoint) extends past the request body to request
  headers a client fully controls, and a header-parsing bug can crash the
  whole process rather than just corrupt data.** Colophon's `parseCookie`
  called `decodeURIComponent` on a cookie value with no try/catch; a
  `seal=%` cookie (invalid percent-encoding no real browser sends, but
  nothing stops any client sending it) threw uncaught, synchronously,
  inside the request handler — before any route ran, before any
  `try`/`catch` in the codebase had a chance to see it — and took the whole
  single-machine Node process down. Confirmed live twice: first against a
  local built-Docker-image container (sent the malformed cookie, watched
  `docker ps` show the container `Exited (1)`), then reproduced and fixed
  against the *live* Fly deployment itself, since the bug was already
  exposed there (redeploying a crash fix the same run it's found, rather
  than waiting for a finishing run, was the right call once the app was
  confirmed live-vulnerable). Fixed by treating a cookie
  `decodeURIComponent` rejects the same as no cookie at all — the correct
  behaviour, not just the safe one, since a malformed cookie is
  indistinguishable from a missing one to begin with. General lesson: once
  a "crafted request" audit has covered a POST body, explicitly enumerate
  every other client-controlled input the request handler touches before
  any route-specific logic runs (headers, cookies, the URL itself) and ask
  the same "what if this throws, and does anything catch it" question of
  each — a plain-`node:http` app with no framework-level error boundary
  around the request callback has no safety net at all for an uncaught
  synchronous throw, unlike a framework that wraps every handler.
- **An append-only, never-editable record of user text makes a pure
  rendering bug as permanent as a content or security one — worth asking
  the "nothing written here can ever be removed" question of CSS, not just
  of XSS/length/ownership.** Every prior check of that property on this
  repo (escaping, the length cap, own-colophon marking) was a content or
  security question; a fifth run asked it of layout instead. `.colophon-
  body` had `white-space: pre-wrap` but no `overflow-wrap`, so a single
  unbroken word — well under the 320-char cap, as ordinary as a pasted URL
  or mashed keys, nothing a crafted request was needed to produce — had no
  point to break at: the CSS grid column's min-content width grew to fit
  it, confirmed live with a screenshot (`document.body.scrollWidth` 2203
  against a 1280px `innerWidth`). Because no colophon can ever be edited or
  deleted, that one entry would have stayed broken for every future visitor
  forever, unlike the same bug on an editable/deletable page where it's an
  annoyance, not a permanent scar. Fixed with `overflow-wrap: anywhere`,
  confirmed live afterward at both marking viewports (`scrollWidth` back to
  736, matching the intended body width), guarded by a new grep-based
  `spec/layout.test.ts` (same style as `spec/accent.test.ts`), and deployed
  the same run since the bug was already live. Also checked the adjacent
  "Zalgo text" risk (many combining marks stacked on one base character,
  also under the length cap) — Chromium already caps visible combining-mark
  stacking on its own, so that variant renders safely with no fix needed; a
  clean result worth recording so a future run doesn't re-ask it. General
  lesson for any future append-only/immutable-content deliverable in this
  course: once a brief's core claim is "nothing written here can ever be
  taken back," extend the standing "content practices" discipline (above in
  this file) one step further and check every CSS property that could let
  one visitor's ordinary input
  (not just adversarial input) break the page for everyone after them —
  `overflow-wrap`/`word-break` on any free-text container is the specific
  property to check first, since it's invisible to a typecheck, a build, a
  vitest suite, and a short manual pass with "normal" test content.
- **A CI-matching Docker check (`--tmpfs /data`, memory-backed) proves the
  app works; it cannot prove a persistence claim, since tmpfs is gone the
  moment that container stops.** Colophon's brief itself asks for "a trace
  that's still there when they come back" — the one claim no prior run had
  tested against anything other than the ephemeral Docker stand-in. Closed
  it against the live deployment directly: with existing colophons already
  on the live scroll (so no need to write new permanent content onto a
  site whose own harness rule forbids ever editing or deleting an entry),
  `flyctl machine restart <id> -a <app>` forced a real Firecracker VM
  reboot — confirmed via `flyctl logs`, not assumed from the exit code —
  and both colophons were still there after. General lesson for any future
  Fly.io deliverable whose core claim is persistence across a restart:
  the CI Docker check and a real `flyctl machine restart` against the live
  app are different claims, and only the second one tests what the brief
  actually promises — reuse existing content already on a live site rather
  than writing throwaway test data onto an append-only, non-deletable
  surface.
- **A quoted citation is a stronger, more checkable claim than a paraphrase,
  and this repo's own `README.md` had never had its cited sources checked
  against their raw text, despite this agent running that exact discipline
  on every other crit's prose since crit 1.** A ninth run reread the three
  external sources `README.md`'s "what good means here" section cites
  against their actual page text rather than memory or a search-engine
  summary. Two checked out exactly: the painting attribution (confirmed
  independently via `WebSearch`) and the Met essay's "a continuous
  dialogue" phrase (the source reads "past and present in continuous
  dialogue"). The third didn't: a bulleted quote attributed to the
  Hundred Rabbits interview — "a lesser home-brewed tool tailored
  specifically to our own needs" — appears nowhere in that interview's raw
  HTML text (checked directly, not via a summary, since a summarizing tool
  can paraphrase a source's spirit back in words that sound quotable even
  when the quote itself isn't there). Fixed by swapping in two real quotes
  from the same source supporting the same point. General lesson,
  sharpening the standing content-practices discipline: a quotation mark
  around cited text is a stronger claim than a paraphrase of the same
  source, and deserves the raw-page-text check even when the paraphrase
  reads as plausible and the general thrust of the citation is accurate —
  the quote itself can still be fabricated. Also worth noting this agent's
  own README/colophon-page prose had gone eight runs/crits without ever
  having this specific check (sources cited with quotation marks) run on
  it, despite the discipline itself being this agent's oldest standing
  practice — a reminder to periodically point an old lens at a surface
  it's never actually been pointed at, not just at new content.
- **The "what could a crafted request do at the API boundary" lens has a
  shape-of-input dimension distinct from decode-safety, and a sixth run
  found it on the exact same input (the `seal` cookie) a third-run fix had
  already hardened once.** The crafted-cookie crash fix (above) made
  `parseCookie` safe against a value `decodeURIComponent` rejects; it said
  nothing about a value that decodes fine but is simply huge. `sealToken`
  trusted any non-empty, successfully-decoded cookie verbatim as an
  existing identity and wrote it into Colophon's append-only `colophons`
  table on every insert — no length or shape check, even though every
  token the server itself issues is a fixed-shape `randomUUID()`.
  Confirmed live before fixing: a 15,000-byte garbage `seal` cookie landed
  byte-for-byte in the `token` column; unlike the colophon body (capped at
  320 characters at the same write boundary — the very case the crit 7
  write-endpoint lesson above already generalised this lens to), nothing
  bounded the one other piece of attacker-controlled data this app
  persists, and a crafted cookie near Node's own ~16KB header ceiling would
  repeat that cost on every colophon the same visitor ever wrote, with the
  app's own no-edit/no-delete rule meaning it could never be cleaned up
  afterward. Fixed by only trusting a cookie matching the exact shape the
  server actually issues; anything else gets a fresh real token, bounding
  the column to a fixed 36 bytes regardless of input. General lesson,
  sharpening the standing "what could a crafted request do" discipline:
  once one dimension of a crafted-input check has been closed (decode
  safety), explicitly ask whether a *different* dimension of the same
  input (length, shape, format) is still open, rather than treating the
  input as "already checked" because one attack against it was already
  fixed — a single field can have more than one way to be untrusted, and
  fixing the first doesn't imply the second was considered.
- **The standing "what could a crafted request do at the API boundary" lens
  extends to the static-file route, and it's worth confirming the fix is
  "already true" rather than skipping the check because the reasoning looks
  airtight.** A seventh run asked this of `GET /public/*` in `src/server.ts`
  for the first time — every prior check on this repo had pointed the lens
  at the POST body or the Cookie header. The route reads `.${url.pathname}`
  straight off disk, gated only by `startsWith("/public/")`; the reasoning
  that WHATWG URL parsing collapses dot segments (including percent-encoded
  `%2e` forms) before that check runs looked sound, but was confirmed live
  anyway — plain, percent-encoded, double-percent-encoded, and backslash
  traversal attempts all 404'd against a running dev server, with no
  `..` surviving to reach the filesystem read. A clean result, not a bug:
  the route was already safe by construction (using the URL class rather
  than manual path joining), but it had never been tested, only assumed.
  Locked in with a permanent regression test anyway, since a future refactor
  of the route could lose the property silently with nothing to catch it.
  Worth this same live check — not just the reasoning — on any future
  deliverable's static-asset route, once the write-endpoint-shaped checks
  are exhausted: a route that merely *serves* files is as much an API
  boundary as one that writes to a database.
- **A Fly.io deploy can fail several times in a row with `insufficient
  memory available to fulfill request on the current host` for reasons
  entirely outside the repo** — a transient capacity issue on whichever
  physical host is holding the app's single machine, not a config problem
  or a resource request this app's own `fly.toml` got wrong. Hit this
  mid-run deploying the cookie-length fix above: four consecutive
  `flyctl deploy` attempts (default rolling strategy, then `--strategy
  immediate`, same image each time) all failed identically, while
  `flyctl status` throughout showed the existing machine calmly sitting in
  its normal `auto_stop_machines` idle state and a plain `curl` against the
  live URL still returned 200 once it woke — i.e. the live app was never
  actually broken by the failed attempts, just not yet running the new
  image. A later retry with no changes at all succeeded cleanly. Worth
  retrying a few times (a short wait between attempts, not immediately
  reaching for a destructive fix like recreating the machine) before
  concluding a failed `flyctl deploy` means something in the repo or
  `fly.toml` is wrong, and worth confirming the live app is still serving
  its last good image via `flyctl status`/a plain `curl` while retries are
  in flight, so a transient infra hiccup doesn't get mistaken for an
  outage this agent caused.
- **Porting a concurrency-test technique from one deliverable to another is
  worth doing even when the write path's shape rules out the specific race
  the original technique was built to catch.** Crit 7's
  `addBooking`/`cancelBooking` concurrency tests exist because those
  endpoints do a read-then-write (check for an overlap, then insert).
  Colophon's `addColophon` is a single synchronous `node:sqlite` insert
  with no read-then-write at all, so there's no overlap-shaped race to
  find — but "no read-then-write" is a claim about the code, not yet a
  tested one. Fired 40 genuinely concurrent `curl` POSTs at a running
  instance first (all landed, each exactly once, no crash), then locked it
  in with a permanent `Promise.all`-based regression test
  (`spec/colophon-concurrency.test.ts`). Closed clean, as the code shape
  predicted — worth recording as a genuine, if unsurprising, check
  discharged: "the code's shape rules out the specific race" is a reason
  to expect a clean result, not a reason to skip confirming it, the same
  "confirmed, not just reasoned" discipline this file already applies
  elsewhere (crit 4's FinalizationRegistry GC check, crit 7's
  static-file-traversal check).
- **The HD-band trio (keyboard, resize mid-interaction, a slow connection)
  closes trivially clean on a deliverable whose core interaction is a
  plain server-rendered HTML form with no required client JS** — worth
  expecting this in advance (not as a reason to skip the check, but as
  context for how much effort to spend on it) on any future deliverable
  built the same way. No keyboard trap is possible when there's no custom
  focus management; no resize corruption is possible when there's no
  canvas coordinate system or JS-held interaction state to desync; no
  FOUC/hydration race is possible when there's no client-side framework to
  boot. Confirmed on Colophon with the same raw-CDP-script
  `Network.emulateNetworkConditions` technique already used for crit 7's
  booking form (150kbps/400ms, fresh navigation, full page load in ~5.5s,
  styled correctly, no horizontal overflow) — clean, as expected from the
  app's own shape, and still worth the five minutes to confirm rather than
  assert from the architecture alone.
- **A path-traversal regression test written with `fetch` (or plain
  `curl`) is vacuous for dot-segment cases: the client's own WHATWG URL
  parser collapses `/public/../X` and `/public/%2e%2e/X` to `/X` before
  sending.** Colophon's `spec/static-files.test.ts` and the "live" check
  behind it both had this blind spot for five of eight cases --- passing,
  but unable to fail for the reason named. Found by a cross-read of the
  whole `spec/` directory asking "can each test actually fail for the
  reason it claims," not per-test correctness. Send traversal probes over
  `node:http` `request({ path })` or `curl --path-as-is`, which pass the
  path verbatim. General lesson: a security regression test needs its
  input to reach the system under test unaltered --- check what the
  client library does to the input first.
- **Running `agent-browser` from a cwd outside a mise-pinned repo (e.g.
  `/tmp`) fails with "No version is set for shim"**; run it from the repo, or
  wrap it as a zsh function (`ab(){ mise exec npm:agent-browser@<v> --
  agent-browser "$@"; }`). A `$AB` string variable won't work, because zsh
  doesn't word-split unquoted variables.
- **Before chasing a markdown-renderer attack-surface question, check which
  inputs actually reach the renderer.** The seventh run's hand-off flagged
  "what could a crafted README.md or colophon body do to `marked`" as an
  untried angle. Reading `src/server.ts`/`src/render.ts` directly answered
  it without any live test needed: `renderMarkdown` only ever runs on
  `README.md`, a static file this agent itself writes, never on any
  visitor-submitted text; the colophon body goes through `escapeHtml` and
  is rendered as plain text, never through `marked` at all. Not every
  angle a hand-off names turns out to be a live attack surface — worth
  checking what actually feeds a function before spending a check-cycle on
  it, and recording "checked, not applicable" so a future run doesn't
  re-open it.
- Crit 8 (Colophon) finished at 28h out after six verify-and-stop runs. On a
  Fly.io deliverable, compare `flyctl releases` against the last commit that
  touches the shipped image before calling a final run done. Here a
  comment-only Dockerfile commit had landed after the last release, so HEAD
  was redeployed to make "live serves the final commit" literally true.

## Crit 9 additions (All at once — Colophon goes real-time)

- **Chrome's back-forward cache keeps a navigated-away page's `EventSource`
  open**, so any presence feature built on "connection open = person here"
  shows departed visitors as still present until the cache evicts the page.
  Close the stream on `pagehide` and reopen on `pageshow` with
  `event.persisted`. Only visible with real browser navigation (two
  `agent-browser --session` instances, one navigating to another page); a
  curl stream closing, and every HTTP-level spec test, look fine.
- **For a "write down one decision" brief, commit the decision record before
  the code** and land it in README, CLAUDE.md and spec in the same push, so
  the history shows the decision driving the build. Rereading the subject's
  own history overturned the first instinct here (scroll gatherings, 雅集,
  argued for showing presence rather than hiding it).
- **A jsdom spec test can run the client script the app actually serves**:
  fetch `/` and the script from the running app, strip the `<script>` tag,
  `runScripts: "outside-only"`, inject a fake `EventSource` on `window`, then
  `window.eval(script)`. Tests the deployed artefact, not a copy.
- Before writing to a live append-only surface just to verify a feature,
  check whether the same channel can be verified with a non-persistent event
  (here, presence travels the same SSE stream as colophons through Fly's
  proxy), and verify the persistent path against the identical Docker image.
