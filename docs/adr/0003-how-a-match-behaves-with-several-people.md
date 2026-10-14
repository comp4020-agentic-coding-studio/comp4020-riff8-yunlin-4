# 3. How a match behaves with several people at once

Status: accepted, 14 October 2026 (crit 10, "Fly by instruments").

## Context

山海 is a real-time match between two seats on one shared server, read by a
narrator from logs. Several people can have `/match` open: the two players,
anyone watching that a match is under way, and a player's second tab. The
machine is one 256 MB shared-cpu Fly machine that auto-stops when idle.

## Decision

**One match at a time, global.** There is one match slot. A visitor creates
the match and holds seat 0 (the east, right-hand end: the scroll reads right
to left, so the first seat is read first); the next visitor to join takes
seat 1 (the west), or seat 0 presses "play the bot". A third visitor sees that
a match is under way and, if a seat is open, how to take it; nothing more.

**The server is authoritative and ticks at 4 Hz.** Clients send commands,
never state. The simulation (`src/sim/`) is a pure function of (map, seed,
commands by tick) with no randomness. A command received during tick *t* is
validated on arrival (and refused at once if invalid), queued, and applied at
the start of tick *t+1* in a fixed order: seat 0's commands in arrival order,
then seat 1's. The bot's commands are produced inside the tick loop from seat
1's fogged view and queued the same way.

**Seats are cookies.** A seat belongs to the token that took it. Reconnecting
from the same browser (a reload, a second tab) is the same seat; every tab of
that seat gets that seat's view. Another browser is another person.

**Dropping, forfeit, abandonment.** A seat that sends no command for five
minutes forfeits; a match with no command from anyone for ten minutes is
abandoned. Both are logged (`match.forfeit`, `match.end` with reason). A
player can forfeit on purpose. No timer runs while no match exists, so the
machine can still auto-stop. A finished match frees the slot.

**Persistence by record.** The match row stores map id, seed, seat marks (not
tokens, for the record), and every applied command with its tick; the result
is written when it ends. `scripts/replay.ts` rebuilds a match from its record
to any tick. An in-flight match is **abandoned on restart, and that is
logged** (`match.end` reason `restart`) rather than rebuilt: rebuilding needs
the seats' tokens kept in the database for the life of the match and a
replay on boot; the slot's ten-minute life makes the loss small, and a deploy
restarts the machine anyway. The record is enough to reproduce what happened.

**Manual ticks** (`MATCH_MANUAL_TICKS=1`) exist only for local playtest
servers: the match advances only on `POST /api/match/step`. The server
refuses to start with it when `FLY_APP_NAME` is set.

## What a slow or hostile client can cost

- Commands: at most 10 per second per seat (429 beyond), at most 40 unit ids
  each, a 16 KiB body cap. Validation is O(units named).
- Streams: each seat's frame is built once per tick and written to that
  seat's open streams; a reader that doesn't keep up is dropped (as on the
  scroll's stream) and reconnects to a fresh full view. Status frames for
  watchers are tiny and sent only when the status changes.
- The tick budget: at the population cap (40 a side) plus four creatures, a
  tick is checked to fit well inside its 250 ms (`spec/sim-perf`); pathing has
  a per-tick node budget, so a crowd of unreachable goals delays paths rather
  than the tick.
- Holding the slot: a visitor who creates a match and leaves holds it for at
  most ten minutes; one who plays the bot and stops commanding forfeits after
  five.
