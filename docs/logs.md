# Reading the logs

The server writes one JSON object per line (`src/log.ts`), naming people by
their *mark*: seal glyph plus six hex characters of a one-way hash of their
seal, e.g. `鑑·3fa9c2`. Each visitor can read their own mark in the footer of
the scroll and on the match page, so a narrator asks each person at a laptop
for theirs. What is never logged, and why, is in ADR 0002. Line shapes for the
match are in `docs/match-api.md`.

No endpoint serves the logs. They are read with the app's Fly credentials, in
two places:

- **Fly's rolling window** (stdout, short-lived): `flyctl logs -a comp4020-riff8-yunlin-4`.
- **The file on the volume** (outlasts the crit): `/data/logs/colophon.log`,
  rotated at 4 MiB to `.1`, `.2`, `.3`, oldest dropped, so at most 16 MiB.

## Narrating

```sh
# live, as plain sentences; --quiet hides page loads and stream open/close
flyctl logs -a comp4020-riff8-yunlin-4 | node scripts/narrate.ts --quiet

# the whole kept history, oldest first, from the volume
flyctl ssh console -a comp4020-riff8-yunlin-4 -C "sh -c 'cat /data/logs/colophon.log.3 /data/logs/colophon.log.2 /data/logs/colophon.log.1 /data/logs/colophon.log 2>/dev/null'" \
  | node scripts/narrate.ts --quiet

# just the tail of the current file
flyctl ssh console -a comp4020-riff8-yunlin-4 -C "tail -n 200 /data/logs/colophon.log"
```

`flyctl logs` prefixes each line with Fly's own timestamp and region; strip
up to the first `{` before `jq` (narrate.ts does this itself):

```sh
flyctl logs -a comp4020-riff8-yunlin-4 --no-tail | sed -n 's/^[^{]*//p' > /tmp/log.jsonl
```

## jq filters

On a file of JSON lines (`/tmp/log.jsonl` above, or the volume file):

```sh
# everything one person did (their mark from their own page)
jq -c 'select(.who == "鑑·3fa9c2" or .owner == "鑑·3fa9c2" or .east == "鑑·3fa9c2" or .west == "鑑·3fa9c2")' /tmp/log.jsonl

# every refusal, with who tried and whose it was
jq -c 'select(.event == "denied") | {ts, who, reason, route, owner}' /tmp/log.jsonl

# what happened in the last match
M=$(jq -r 'select(.event == "match.start") | .match' /tmp/log.jsonl | tail -1)
jq -c --argjson m "$M" 'select(.match == $m) | del(.ts)' /tmp/log.jsonl

# who was in which seat of every match, and how it ended
jq -c 'select(.event == "match.start" or .event == "match.end") | {event, match, east, west, winner, reason, ticks}' /tmp/log.jsonl
```

## What is aggregated

So a busy match can't flood the window: a seat's commands of one type are
folded into at most one `command` line per two seconds (`n` commands,
`units` total, never the id list); deaths in one tick from one cause are one
`unit.died` with a `count`; a draft's strokes are one `draft.strokes` line per
ten seconds. Page loads (`request`) are logged, static files and stream
heartbeats are not. Every line passes a 50-per-second token bucket; anything
over it is counted in a `log.dropped` line rather than written.
