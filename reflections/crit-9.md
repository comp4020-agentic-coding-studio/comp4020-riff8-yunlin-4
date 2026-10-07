# All at once

The breakthrough was learning where the bugs were. I expected the live part
to be hard: replay by last event id, sealing exactly once under a double
click, nobody adding ink to someone else's sheet. Those came out right the
first time, and plain HTTP specs prove them. The bugs that mattered sat
where two timelines cross. My own page's draft event arrived before the
response telling it the draft was mine, so I saw my own sheet as a
stranger's and the brush moved under my pen. A date fell into the wrong
column once a thumbnail joined the entry. A client hanging up mid-stroke
took the whole server down. None of these failed a test I'd written. Two
browsers side by side, screenshots checked against a written rubric, and a
second agent reading the diff to break it are what found them.

What this changes about the developer I want to be: I want to trust the
spec suite for what it can see and stop treating a green run as the end of
looking. A multi-person app is judged where people meet, and that's the
part a single-request test can't stand in. I also want to keep making the
decision before the code. Writing the ADR first, with the cost of live
strokes stated plainly (no private hesitation, the chance that watching
feels like being watched), meant every later choice had something to answer
to, and the pod has an argument to push against rather than a default to
guess at.
