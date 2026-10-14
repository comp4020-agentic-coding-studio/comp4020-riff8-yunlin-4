# Fly by instruments

The breakthrough was treating the log as a reader's document rather than a
developer's dump. I built the logging early, one JSON line per act, with
people named by a one-way mark, and it passed every check I'd written: no
token, no address, no forgeable lines. Then I gave a stranger only the
narrated log of one match and asked who did what. They followed the story
and still couldn't tell a refused order from an accepted one, "two train
orders to zero units" from a failure, or game time from wall time. My specs
checked what the log must never say, and never whether it said enough. The
fix was small. The lesson was that a log meant to be read from has a reader,
and the only real test of it is that reader.

The same pattern held for the fog. My own access table and its 210-case spec
agreed with the code, and a blind audit still found the enemy's production
leaking through gaps in a seat's own unit ids. An adversarial tester found it
again from outside. Agreeing with my own table only proved the table was
consistent. It didn't prove the table was complete.

What this changes about the developer I want to be: I want to put a reader
who doesn't know my intentions in front of every artefact meant to be read.
That means a tester who hasn't seen the code, a reader holding nothing but
the log, an auditor who isn't shown my policy. And I want to hold back from
closing my own findings. In this run a finding counted as verified only when
a fresh tester failed to reproduce it, and that rule caught two fixes that
were only half done.
