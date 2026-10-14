import { escapeHtml } from "./html.ts";

// The page for GET /match: a shell the script fills. The game needs
// JavaScript (README.md, "山海, the second scroll"); the scroll itself never
// does, so the page says so and points back to it. The head matches
// render.ts's layout, which isn't exported.

export interface MatchPageOptions {
  rulesText: string;
  ownMark: string;
  ownGlyph: string;
}

export function renderMatchPage({ rulesText, ownMark, ownGlyph }: MatchPageOptions): string {
  return `<!doctype html>
<html lang="en-AU">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>山海 Mountains and Seas — Colophon</title>
    <meta
      name="description"
      content="山海 Mountains and Seas: a two-player contest on a second handscroll, unrolled from the end of Colophon's painting."
    />
    <link rel="icon" href="/public/favicon.svg" type="image/svg+xml" />
    <link rel="stylesheet" href="/public/styles.css" />
  </head>
  <body class="match-body">
    <header class="site-header">
      <h1><span lang="zh-Hant">山海</span> Mountains and Seas</h1>
      <p class="kicker">a second scroll, unrolled from both ends</p>
      <p><a href="/">Back to the scroll</a></p>
    </header>
    <main class="match">
      <noscript>
        <p class="match-noscript">The game needs JavaScript. The scroll itself works without it.
          <a href="/">Back to the scroll</a></p>
      </noscript>

      <section class="match-status" aria-labelledby="match-status-heading" data-match-status-section>
        <h2 id="match-status-heading" class="visually-hidden">The match</h2>
        <div data-match-status></div>
        <p class="match-note" role="status" aria-live="polite" data-match-message></p>
      </section>

      <section class="match-board" data-match-board hidden aria-label="The board">
        <div class="match-hud" data-match-hud></div>
        <div class="match-controls" data-match-controls></div>
        <div class="match-scroller" data-match-scroller tabindex="0" role="region"
             aria-label="The map, a long strip of land read right to left">
          <canvas class="match-canvas" data-match-canvas role="img"
                  aria-label="An ink map of the land between the two halls: river, groves, hills and the pieces in view.">
          </canvas>
        </div>
        <ol class="match-log" aria-live="polite" aria-label="What just happened" data-match-log></ol>
      </section>

      <details class="match-rules">
        <summary>How the contest goes</summary>
        <div class="match-rules-text">${escapeHtml(rulesText)}</div>
      </details>
    </main>
    <footer>
      <p>Your seal here is <strong>${escapeHtml(ownGlyph)}</strong>, the same as on the scroll.</p>
      <p class="own-mark">In the server's log you are <code>${escapeHtml(ownMark)}</code>.</p>
    </footer>
    <script src="/public/match.js" type="module"></script>
  </body>
</html>
`;
}
