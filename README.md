# Colophon

A handscroll painting stays open on the page, and the scroll keeps going after
it. Strangers add colophons to its end, the way collectors have for six
centuries: an inscription brushed by hand in ink and closed with the writer's
seal, or a typed line for anyone without a brush. No account, no name, nothing
that can be edited or deleted once it's sealed. While someone is brushing,
everyone else with the page open watches the ink arrive stroke by stroke.

## What good means here

Chinese handscrolls were never finished when the painter set the brush down.
Later owners and admirers kept adding their own inscriptions and seals after
the image, sheet by sheet, so that a scroll only a foot square in its painted
part could grow twenty feet long from six centuries of appended commentary —
the [Met's history of the format](https://www.metmuseum.org/essays/chinese-handscrolls)
calls this "a continuous dialogue" between the work and everyone who has since
sat with it. That is the shape of multi-user, real-time and persistent I
wanted: not a feed, but one object that a small, unhurried stream of people
add to, permanently, leaving a trace the next visitor can actually find.

Those inscriptions were calligraphy, and many were written in company: the
scroll unrolled at a gathering (雅集), friends standing round while one of them
wrote, then the seal pressed at the end. So a colophon here is brushed, not
just typed, and the brushing is visible to whoever else has the scroll open
at that moment. The live part is the gathering, not a notification stream:
you see someone's ink only while they are actually writing, and nothing about
the people who are only looking. `docs/adr/0001-strokes-are-seen-as-they-are-brushed.md`
records that decision, the alternatives and what it costs.

Three other things I read while deciding what small and good looks like here:

- Robin Sloan's [_An app can be a home-cooked meal_](https://www.robinsloan.com/notes/home-cooked-app/)
  argues the best case for a tiny app is never that it will grow, but that it
  is finished, sovereign and answers only to the few people it was built for.
  This app answers to whoever writes in the margin, not to a growth number.
- [Hundred Rabbits](https://sourcehut.org/blog/2021-12-08-100-rabbits-interview/),
  who build their own software from a sailboat, say "if we can use less
  technology to solve any one task, we will" and prize software that "gets
  smaller over time, that sheds the superfluous" — the whole app is closer
  to a workshop tool built for one particular painting than a platform
  built to hold any painting at all.
- Bernie DeKoven's [_The Well-Played Game_](https://www.deepfun.com/fun-store/the-well-played-game/)
  says a shared act is worth more for the quality of playing it together than
  for any individual score — there is no score here, no likes, nothing to
  win, only the quality of what gets left behind.

## What I chose not to build

No accounts, avatars or profiles — a visitor is only the anonymous seal their
browser is given on first visit, the same way a real seal marks presence
without disclosing a name. No editing or deleting a colophon once it's sealed:
ink doesn't come back off the paper. A typed line is capped at 320 characters
and a brushed one at a small, fixed sheet and a limited number of strokes, so
a visitor considers an inscription rather than filling a canvas. One brush,
one ink, no colours, no tools: this is a margin, not a drawing app.

No likes, no replies, no threading, no reader count, no cursors, no
notifications. Nobody stamps anyone else's colophon. A draft nobody has added
a stroke to for ten minutes is abandoned and never shown again; that doesn't
break the permanence rule, because a draft was never ink on the scroll until
its writer sealed it. Only sealing is permanent.

The brush and the live drafts need JavaScript. Without it the page still has
the painting, every sealed colophon (drawn ones rendered on the server as
inline SVG) and the form for a typed line.

## What's enforced, what's judged

`spec/` checks that a colophon written now is still there on the next
request, that a visitor's own colophons are the ones marked as theirs (and
nobody else's are), and that an empty or over-length line is rejected rather
than silently corrupted. For brushed colophons it checks that a stroke one
visitor posts reaches another visitor's open stream within a second, that
malformed or over-cap strokes are rejected, that only the writer can add to
or seal their draft, that a colophon seals exactly once and then takes no more
ink, that a reconnecting page gets exactly what it missed, and that nobody's
seal token ever leaves the server. Whether the tone of what accumulates
actually reads like a colophon, and whether watching a stranger write feels
like company or like being watched, are not things a test can check; that's
for whoever reads the scroll to judge.
