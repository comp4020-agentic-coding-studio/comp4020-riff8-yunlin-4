import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

// A colophon can never be edited or deleted, so a layout bug one body
// triggers is permanent for every future visitor. A single long word with no
// spaces (well within the 320-character limit — a pasted URL, a mashed key,
// anything) has no natural break point: without overflow-wrap, a CSS grid
// column won't shrink below that word's min-content width, so it blew the
// whole page out sideways. Confirmed live before this fix (scrollWidth 2203
// vs an innerWidth of 1280) and after (736, matching the intended 46rem body
// max-width). This greps the actual rule rather than re-deriving a browser
// layout check, the same style as accent.test.ts for a CSS property no
// request-level test can see.
const css = readFileSync("public/styles.css", "utf8");

it(".colophon-body can't be blown out sideways by an unbroken run of text", () => {
  const match = css.match(/\.colophon-body\s*\{([^}]*)\}/);
  expect(match, "expected a .colophon-body rule in styles.css").toBeTruthy();
  expect(match![1]).toMatch(/overflow-wrap\s*:\s*anywhere/);
});

// Crit 9 put a thumbnail of the ink in a brushed colophon's transcript entry,
// a third item beside the seal; the date then auto-placed into the seal's
// narrow column, one word per line. Text stays in the second column.
it("a transcript entry's text stays in its own column, whatever else is in the entry", () => {
  for (const selector of ["colophon-body", "colophon-date"]) {
    const match = css.match(new RegExp(`\\.${selector}\\s*\\{([^}]*)\\}`));
    expect(match, `expected a .${selector} rule in styles.css`).toBeTruthy();
    expect(match![1]).toMatch(/grid-column\s*:\s*2/);
  }
});
