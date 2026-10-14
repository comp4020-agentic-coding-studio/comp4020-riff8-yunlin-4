# 2. Who may see and change what

Status: accepted, 14 October 2026 (crit 10, "Fly by instruments").

## Context

Colophon now has two kinds of shared state. The scroll: colophons, drafts and
strokes, which crit 9 already guarded (only a draft's writer adds to or seals
it). And from this crit a match of 山海, a two-seat strategy game played on a
second scroll, where hidden information is the whole game: each seat must see
only what its own people have walked past.

Crit 10 asks for two people the app tells apart, the rule for what each may
see and change enforced on the server, and logs that say who did what.
`README.md` says a visitor is their seal and nothing else: no account, no
name, no profile. Whatever this record decides has to hold up against that.

## Options considered

1. **The anonymous seal as it is.** A person is the random token in their
   HttpOnly `seal` cookie. The server decides every "is this yours" by
   comparing the requester's token with the stored owner's. Two Chrome
   profiles are two people; one person on two browsers is two people.
2. **The seal plus rate limits and caps.** Option 1, with per-seat command
   rates, per-command unit caps and per-address caps on drafts and streams, so
   one person can't crowd others out.
3. **More identity** (an account, an email link, a display name). Tells people
   apart across devices and lets a log name a human. It also makes the scroll
   a place where you are someone, which `README.md`'s first decision rejects,
   and it would put real names into a log that outlives the crit.

## Decision

Option 2. The seal is the person; ownership is token equality checked on the
server, never anything a client says about itself. A log may not hold the
token (it's a bearer credential), so logs and the visitor's own page use a
**mark**: the seal glyph plus six hex characters of the token's SHA-256
(`src/mark.ts`). The mark is shown to its owner alone, so a narrator can map
the person at a laptop to log lines, and appears in no other visitor's HTML
or any stream.

For the match, the same comparison decides seats: the match row stores the
seat holders' tokens; a request is the seat whose token it carries, or no
seat. The bot holds seat 1 by a server-side flag, not a token.

### Fog of war is access control

The server is authoritative and computes each seat's visibility from its own
units and buildings (`src/sim/fog.ts`). Each seat's stream and view carry only
the ground that seat has revealed and the entities currently in its view.
Nothing about a hidden enemy piece (not an id, a count or a position) is
sent, and the 蛟龍 *jiaolong* is withheld even inside vision while it lurks.
Frames carry ids, small integers, fixed kind keys and glyphs only: no token,
no mark, no player text.

### Enemy ids are indistinguishable from nonexistent ones

Unit ids are small sequential integers and not secret. A command naming any
id that is not one of the commander's own live pieces (an enemy's, a
creature's, a dead unit's or one never issued) gets the same status, body and
code path: `422 {"error":"not-yours","message":"no such unit of yours"}`. An
`attack` on a target not currently in the commander's view is answered exactly
as an attack on a target that doesn't exist. The ownership check runs before
anything that touches the named piece's state. So a fogged enemy's existence
can't be probed through status codes. Timing is not made constant; the check
is a map lookup either way.

## Costs

- A person who clears cookies, or switches browser, is a new person, and loses
  their seat in a running match (it forfeits after five idle minutes).
- Marks tell people apart in a log but can't say who they are; that's the
  point, and it means the crit narrator needs each player to read out their
  own mark from their own page.
- One match at a time (ADR 0003): a third visitor can watch that a match is
  under way and nothing more. Someone who creates a match and walks away holds
  the slot for up to ten minutes.
- Rate limits are per seat and per address, so a classroom behind one address
  shares the draft and stream allowance (crit 9's caps, unchanged).

## Who may see and change what

Roles: **stranger** = no cookie (a first request, given a fresh seal),
**visitor** = holds a seal, not seated, **player** = holds a seat in the
current match, **owner** = the writer of a colophon/draft, or the seat a unit
belongs to. A **forged** cookie (not a UUID the server could have issued) is
treated as a stranger. Everything is enforced in `src/server.ts` unless noted.

| Route / command / event | Stranger | Visitor | Player | Owner | Refusal |
|---|---|---|---|---|---|
| `GET /` scroll | read; gets a seal | read; own colophons marked, own mark shown | same | same | — |
| `POST /colophons` typed line | writes as new seal | write | write | — | 303 `?error=empty/long` |
| `POST /api/drafts` | refused | open own draft | same | — | 409 `no-seal`, 503 `busy` |
| `POST /api/colophons/:id/strokes, seal, abandon` | refused | refused | refused | add, seal, abandon own draft | 404 `missing`, 403 `not-yours`, 409 `sealed`, 410 `abandoned` |
| `GET /colophons/:id/fragment` | sealed only | sealed only | sealed only | sealed only | 404 `missing` |
| `GET /events` scroll stream | ids, glyphs, stroke points of drafts | same | same | same | 503 when full |
| `GET /match` page | read status | read status; join/create | own seat's board | — | — |
| `GET /api/match` status/view | status only (no seat holders, no units) | status only | own seat's fogged view | — | — |
| `GET /match/events` stream | status frames | status frames | own seat's fogged frames and own events | — | — |
| `POST /api/match` create | refused | take seat 0 | refused | — | 409 `no-seal`, 409 `match-busy`, 409 `already-seated` |
| `POST /api/match/join` | refused | take seat 1 if open | refused | — | 409 `no-seal`, 409 `match-full`, 409 `no-match`, 409 `already-seated` |
| `POST /api/match/bot` | refused | refused | seat 0 only, while seat 1 is open | — | 403 `not-yours`, 409 `match-full`, 409 `no-match` |
| `POST /api/match/command` move/gather/build/attack/train/stop | refused | refused | own units/buildings only | — | 403 `not-seated`, 422 `not-yours` (enemy, creature, dead or nonexistent, identical), 422 `invalid`/`grain`/`pop-cap`/`too-many`, 400 `malformed`, 429 `rate`, 409 `no-match` |
| `POST /api/match/forfeit` | refused | refused | forfeits own seat | — | 403 `not-seated` |
| `POST /api/match/step` | absent | absent | absent | — | 404 (exists only with `MATCH_MANUAL_TICKS=1`, which refuses to boot when `FLY_APP_NAME` is set) |
| `POST /api/match/chronicle` | refused | refused | seals the chronicle of a finished match they sat in, once, as their own typed colophon | — | 403 `not-yours`, 409 `not-ended`, 409 `sealed`, 404 `missing` |
| logs (`flyctl logs`, `/data/logs/`) | — | — | — | — | no endpoint serves them; readable only with the app's Fly credentials |

Every refusal is logged as a `denied` line naming the actor's mark and, where
the refusal is about ownership, the owner's mark (`docs/logs.md`).
`spec/access.test.ts` checks this table route by route against a running
server for owner, other seat, third visitor, no cookie and forged cookie.

## Logs: what is recorded about people

One JSON line per event on stdout (Fly's rolling window) and in a rotated file
on the volume (`/data/logs/colophon.log`, four files of 4 MiB, oldest dropped:
at most 16 MiB of the 1 GB volume). Lines name people by mark only. Never
logged: tokens, Cookie headers, request bodies, typed text, stroke points,
query strings, IP addresses, User-Agent. An address would tell people apart
too, but it would also make the log a tracker of where people are, which the
mark doesn't need to be. Command lines carry type and unit count, never the
id list.

A client that never keeps cookies mints a new visitor per request. Log lines
pass a global token bucket (`src/log.ts`), so such a flood costs at most the
bucket's rate in lines, the excess counted in a `log.dropped` line; the file
rotation caps disk regardless; and the database is untouched by a visitor who
writes nothing (a seal is a cookie, not a row).
