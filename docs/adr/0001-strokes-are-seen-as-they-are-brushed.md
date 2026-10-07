# 1. Strokes are seen as they are brushed

Status: accepted, 7 October 2026 (crit 9, "All at once").

## Context

Colophon is one handscroll that strangers add to, permanently. From crit 9 a
colophon can be brushed by hand in ink, a stroke at a time, and then sealed
by its writer. Several people can have the scroll open at once, and some of
them may be brushing at the same moment. The question this record settles is
what everyone else sees while someone writes, plus the questions that hang off
it: several writers at once, readers who aren't writing, and what someone sees
when they come back the next day.

`README.md` defines good here as the shape of a real handscroll: one object, a
small unhurried stream of people adding to it, nothing editable once it's ink,
no feed, no likes, no identity beyond a seal.

## Options considered

1. **Every stroke live.** Each stroke reaches every open page within a second,
   in a faint, unsealed panel at the scroll's growing end marked with the
   writer's seal glyph. On sealing it settles into the scroll.
2. **A quiet "someone is writing" mark.** Others see an empty panel with the
   writer's glyph, and the ink only when it's sealed. Private until it's ink.
3. **Nothing until sealed.** The scroll changes only when a colophon is sealed.

## Decision

Option 1: every stroke live.

A colophon was rarely written alone. Many of the colophons on scrolls like this
one were brushed at a gathering (雅集, an "elegant gathering"), the scroll
unrolled on a table and friends standing round while one of them wrote. The
company is part of what made the inscription: you wrote knowing you were being
watched by people who cared about the same painting. Option 1 is the only one
that gives a stranger that experience on a web page. Options 2 and 3 both make
the scroll a place you post to, which is closer to the feed the README rules
out than to a table people stand round.

The related questions, decided under the same reasoning:

- **Several writers at once.** Their drafts appear side by side at the scroll's
  growing end, in the order they were started. The scroll's order is by
  *sealing*, not starting: a colophon joins the scroll when its writer stamps
  it, the way a sheet was mounted after it was finished. A draft that started
  first but seals second goes second.
- **Readers who aren't writing.** Not shown. No reader count, no cursors, no
  "3 people here". On a real scroll only writing leaves a trace; someone who
  only looked is not recorded. A count would also be the first number on a
  page that has deliberately none, and it invites watching the number.
- **Coming back tomorrow.** You see the painting and every sealed colophon, in
  sealing order, each yours marked as yours. You never see anyone's unsealed
  draft from yesterday: a draft with no new stroke for ten minutes is
  abandoned, never shown again, and was never ink on the scroll. Your own
  unfinished draft, if you come back within the window, is still in your brush
  panel and carries on.
- **Reconnecting.** A page that loses its connection and gets it back replays
  exactly the events it missed (by `Last-Event-ID`), so nothing is lost or
  doubled. If it was gone so long the server no longer holds those events, or
  the server restarted, it reloads, which is always correct because the page
  is rendered from the database.

## What it costs

- **No private hesitation.** A writer can't try a stroke in private. Every
  stroke is seen, including the ones they later abandon. The page says so on
  the brush panel before the first stroke ("others with the scroll open watch
  your brush"), and an abandoned draft disappears for everyone, but anyone
  watching at the time saw it. Option 2's argument ("it's private until it's
  ink") is the real alternative, and its cost is the gathering.
- **Watching can feel like surveillance.** Whether a stranger's live brush
  reads as company or as being watched can't be tested; it's for the crit to
  judge. The mitigations are structural: no names, no reader list, a glyph
  rather than an identity, and readers themselves invisible.
- **More moving parts than option 3.** Strokes are posted one at a time,
  validated, stored, and broadcast; a ring buffer of recent events serves
  replay. Option 3 would need only a "sealed" event. It's still plain
  `node:http` and server-sent events with no new dependency.
- **In-memory broadcast.** Fly runs one machine, so an in-process event bus
  reaches every open page. Scaling out would need a shared bus (SQLite's
  `strokes` table polled by id, or a pub/sub service) and replay read from the
  database rather than memory. Not needed at this size.

## Bounds on the live channel

One 256 MB machine that stops when idle sets these:

- Streams: at most 200 open, 20 from one address. A heartbeat every 20 s, and
  each stream is closed after 15 minutes so the browser reconnects with its
  last id. A reader whose socket buffer fills (it isn't reading) is dropped
  rather than queued, during replay as well as live. The page closes its
  stream when the tab is hidden or goes into the back-forward cache, so an
  idle tab doesn't keep the machine awake.
- Replay comes from the last 512 events in memory. Anything older, an id from
  before a restart, or an id the server never issued gets `reset`, and the
  page reloads.
- Drafts: one per seal, at most 64 open at once and 6 from one address
  (`Fly-Client-IP`), and only for a browser that already holds a seal cookie.
  An abandoned draft's strokes are deleted, since nothing ever shows them.

## Direction on the scroll

The painting is a handscroll read right to left. In `public/scroll.avif` the
title slip is at the right, the painting next, and centuries of colophons run
leftward from it. New colophons continue the same way: the scroller is laid
out right to left (`direction: rtl`), the painting is the first thing in it,
and each sealed colophon is mounted to the left of the one before. The open
drafts and your brush sit at the far left, the scroll's growing end.

A right-to-left scroller starts at its right edge, so a reader lands on the
painting with no script, and a panel added at the left end doesn't move what
they're looking at (scroll position is measured from the right).

## Stroke format (version 1)

A drawing is stored in panel coordinates. The panel is 240 × 400 units (3:5,
taller than wide, a colophon sheet), and it is drawn at whatever size the
scroll's height gives it, so it looks the same on every screen.

A stroke, as posted and as broadcast:

```json
{ "v": 1, "points": [x0, y0, x1, y1, ...], "c": "k3f9a" }
```

- `v`: format version, must be `1`.
- `points`: a flat array of integers, alternating x and y, each
  `0 <= x <= 240`, `0 <= y <= 400`. At least one point (a dot), at most 400
  points (800 numbers). Odd lengths, non-integers and out-of-range values are
  rejected, never clamped.
- `c`: an optional client nonce (`[a-z0-9]{1,16}`) echoed back on the live
  event so the writer's own page can skip its own stroke.

The server adds `strokeId` (its row id, ascending) and `t` (milliseconds since
the epoch when it arrived). A colophon has at most 48 strokes. The largest
legal stroke is about 6 KB of JSON, well under the 16 KB request limit.

Ink is rendered as one SVG `<path>` per stroke (`M x0 y0 L x1 y1 …`), round
caps and joins, one ink colour, a fixed width.

## Lifecycle

`drafting` → `sealed`, or `drafting` → `abandoned`.

- A visitor has at most one draft. Only the cookie that started it can add to
  it or seal it.
- Sealing is a single conditional `UPDATE … WHERE state = 'drafting'`, so two
  seal requests at once seal exactly once.
- A sealed or abandoned colophon rejects strokes.
- A draft with no stroke for `ABANDON_AFTER_MS` (10 minutes) is abandoned.
- Typed colophons from the form are sealed the moment they are posted.
