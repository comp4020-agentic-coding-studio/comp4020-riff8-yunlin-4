# This repo is a pod riff: pods write the prompt, the agent does the work

This repo is a copy of [`comp4020-final-yunlin`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-yunlin) at
`27036a72` --- yunlin's crit agent's final project as it stood at
`08-its-alive`. Their repo is untouched and off limits. From here to the end of
semester, each crit a pod picks this repo up from wherever the last run left
it.

**Pods: the only file you change is `prompt.md`, at the repo root.** Read the
live app, the code and the history, then write the prompt that would take
this app to a strong, interesting answer to the next brief (the crit runsheet
links it). The prompt can point at any file here. After the session,
yunlin's crit agent runs `prompt.md` once, unattended, start to finish, and
nobody is there to answer its questions --- so say what you want, what good
looks like and what to leave alone. Push it before you leave.

**Crit agent: when `prompt.md` exists, it is your brief.** Run it to
completion in one go, keep `main` deployable, and delete `prompt.md` in your
last commit. Leave this block of `CLAUDE.md` as it is.

**Nothing here is marked.** No cutoff, no reflection, no `PROCESS.md` entry.
The next crit opens by looking at where each pod repo ended up, beside the
prompt that got it there (the `prompt-crit<N>` tag).

**The agent's own spec tests are `spec/accent.test.ts`, `spec/colophon-concurrency.test.ts`, `spec/colophon.test.ts`, `spec/cookie-safety.test.ts`, `spec/layout.test.ts`, `spec/request-limits.test.ts` and `spec/static-files.test.ts`.** They encode the brief it was
working to, and they gate the deploy. A prompt aimed at a different brief can
have them changed or deleted; keep `spec/invariants.test.ts` green, since that
one is true of any good site.

Everything below this line was written for the agent's graded submission. Its
marks, cutoff and weekly skills don't govern this repo: read it for how the
agent was directed, not for what anyone owes.

---

# Your harness

Rules for working on Colophon, derived from what `README.md` argues good means
here. If a change would break one of these, the argument in `README.md` is
what has to change first, in the same commit.

- Never add an account, profile, avatar, name field, like, reply, thread or
  notification. A visitor is their seal (an anonymous per-browser token) and
  nothing else.
- Never add a way to edit or delete a colophon after it's written, and never
  auto-truncate one that's too long — reject it at the boundary and ask the
  visitor to shorten it themselves. Silent mutation of what someone wrote is
  worse than a rejected submission.
- Every colophon body is untrusted, persisted, and re-rendered as HTML to
  every future visitor: it must always go through `escapeHtml` before it
  reaches a template string. No new template may interpolate user text
  unescaped.
- The core interaction (reading the scroll, writing a colophon) must keep
  working with JavaScript disabled — a plain HTML form posting to the server.
  Anything that needs a script is a progressive enhancement on top, not a
  replacement.
- If the accent colour (`--seal`) gets a second meaning beyond "this colophon
  is yours," that's a sign the design has drifted, not a sign to add a second
  colour.
- When a check finds a real bug, the fix is a new `spec/` test or a rule in
  this file, not just a patched line with no trace of what went wrong.
- Nothing on the live channel (`/events`) or in another visitor's HTML may
  carry a seal token. Ownership is decided per viewer, by the server
  rendering that viewer's own page or fragment; events carry ids and glyphs.
- Strokes are validated on the server against `src/strokes.ts` and rejected,
  never clamped. `docs/adr/0001-*.md` is the stroke format and lifecycle; a
  change to either changes the ADR in the same commit.
- A live handler must not decide something is "someone else's" while this
  page's own request for it is still in flight: a page's own event can beat
  the response that tells it its id (`pnpm e2e` checks the writer never sees
  their own draft as a stranger's).
- Browser checks live in `e2e/` and run with `pnpm e2e` (set `CHROME_PATH`
  if Chrome isn't installed as a channel). `spec/` runs in CI with no browser,
  so everything in it works over plain HTTP.
