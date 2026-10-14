import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { renderMatchPage } from "../src/render-match.ts";

// The match page renders without the route, so these check the renderer
// directly: what it interpolates is escaped, it says plainly that the game
// needs a script, and the match's styles never borrow the seal's colour.
const html = renderMatchPage({
  rulesText: 'Take the hall.\n<script>alert("x")</script>',
  ownMark: "鑑·<b>3fa9c2",
  ownGlyph: "<i>鑑",
});
const doc = new JSDOM(html).window.document;

it("escapes the rules, mark and glyph", () => {
  expect(html).not.toContain("<script>alert");
  expect(html).not.toContain("<b>3fa9c2");
  expect(html).not.toContain("<i>鑑");
  expect(doc.querySelector(".match-rules-text")?.textContent).toContain('<script>alert("x")</script>');
});

it("says plainly without JavaScript that the scroll works without it", () => {
  const noscript = doc.querySelector("noscript")?.innerHTML ?? "";
  expect(noscript).toContain("The game needs JavaScript. The scroll itself works without it.");
  expect(noscript).toContain('href="/"');
});

it("the match's styles never use the seal colour", () => {
  const css = readFileSync("public/styles.css", "utf8");
  const section = css.slice(css.indexOf("/* 山海 match */"));
  expect(section.length).toBeGreaterThan(20);
  expect(section).not.toContain("var(--seal)");
});
