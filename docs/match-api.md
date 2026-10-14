# The match API

The contract between the match server (`src/match.ts`, routes in
`src/server.ts`) and its two clients, the page (`public/match.js`) and the
text client (`scripts/play.ts`). Who may call what is ADR 0002's table; this is
the shape. Every response is JSON with `Cache-Control: no-store`. Every POST
takes `Content-Type: application/json` (anything else is `400 malformed`) and
needs the `seal` cookie; a request without one gets `409 no-seal` and a fresh
cookie. Refusals are `{ "error": <code>, "message": <plain words> }`.

## Status

`GET /api/match` →

```json
{
  "status": "none" | "waiting" | "playing" | "ended",
  "matchId": 12,
  "mapId": "scroll-1",
  "seatsOpen": [1],
  "you": 0 | 1 | null,
  "manualTicks": false,
  "view": SeatView | null,
  "result": { "winner": 0 | 1 | null, "reason": "hall" | "forfeit" | "abandoned" | "restart" | "time", "ticks": 2400,
              "youWon": true, "chronicle": "…", "chronicleSealed": false } | null
}
```

`view` (see `src/sim/types.ts` `SeatView`) is present only for a seated
visitor while `status` is `playing` or `ended`. `result` is present for the
most recent finished match only to the two players who sat in it (others see
`status: "ended"` and nothing else, until a new match is created).

## Actions

- `POST /api/match` `{}` → create the match and take seat 0. `201` + status.
  `409 match-busy` if a match is waiting or playing.
- `POST /api/match/join` `{}` → take seat 1. `200` + status. `409 match-full`,
  `409 no-match`, `409 already-seated`.
- `POST /api/match/bot` `{}` → seat 0 fills seat 1 with the bot; the match
  starts. `200` + status.
- `POST /api/match/command` `Command` (see `src/sim/types.ts`) → `202
  { "tick": <tick it applies at> }`. Refusals per ADR 0002 (`422 not-yours`
  is byte-identical for enemy, creature, dead and nonexistent ids).
- `POST /api/match/forfeit` `{}` → `200` + status.
- `POST /api/match/chronicle` `{ "matchId": 12 }` → seal the chronicle of a
  match you sat in as your own typed colophon, once per player. `201 { "id":
  <colophon id> }`. `409 sealed` on a second try, `409 not-ended`,
  `403 not-yours`, `404 missing`.
- `POST /api/match/step` `{ "ticks": 20 }` → only when the server runs with
  `MATCH_MANUAL_TICKS=1` (404 otherwise): advance up to 400 ticks; seated
  players only. `200` + status.

## Stream

`GET /match/events` is server-sent events, per viewer.

- `event: status` `data: <the status object without view>`, on connect and
  whenever status changes.
- `event: view` `data: SeatView`, for a seated viewer, once per tick
  (in manual-tick mode, after each step).
- `event: events` `data: SimEvent[]` filtered to what this seat may know: its
  own pieces' events, and others' only where the tile was in its view at the
  time. Sent with the tick's view.
- Heartbeat comment every 20 s. No seal token, mark or player text is ever
  in a frame.

## Log lines the match writes

Every line also has `ts`, `event`, `who` (`src/log.ts`). `who` is the acting
person's mark; for sim events it is the mark of the seat the event concerns,
or `"bot"` for the bot's seat, or `"-"` for a creature's own act. `seat` is
0 (east) or 1 (west). Marks of both seats are carried where a reader needs to
know whose piece it was.

- `match.create` `{ match, seat: 0 }`
- `match.join` `{ match, seat: 1 }` · `match.bot` `{ match }` (who = seat 0, who asked for the bot)
- `match.start` `{ match, map, seed, east, west }` (east/west are marks, or `"bot"`)
- `command` `{ match, tick, seat, type, units }` (units = count, never the ids).
  Aggregated: at most one line per seat per command type per 2 s, with
  `n` = how many commands of that type were folded in and `units` their total.
- `build.start` `{ match, tick, seat, kind, building }` · `build.done` same
- `unit.trained` `{ match, tick, seat, kind, unit }`
- `creature.aggro` `{ match, tick, creature: "nian"|..., target: <unit id>, targetSeat, owner: <mark of targetSeat> }` (who `"-"`)
- `unit.died` `{ match, tick, seat | "wild", kind, unit, cause: "soldier"|"creature", by: <kind>, bySeat, owner: <mark of the dead piece's seat> }`
  Aggregated per tick and cause: `count` when several die together.
- `relic.claimed` `{ match, tick, seat, grain }`
- `match.forfeit` `{ match, tick, seat, why: "idle"|"chose" }`
- `match.end` `{ match, ticks, winner: <mark>|"bot"|null, winnerSeat, reason, east, west }`
- `chronicle.seal` `{ match, colophon }`
- `denied` `{ reason, route, owner?, match?, type? }` — `owner` is the mark of whose
  unit/seat it was, when the refusal is about ownership (`not-yours` names the
  true owner in the log only, never in the response).
