import { JSDOM } from "jsdom";
import { expect, inject, it } from "vitest";

// Own checks: the promises README.md and CLAUDE.md make that the build alone
// can't verify. Every request manages its own seal cookie by hand (fetch
// doesn't carry a cookie jar across calls), so each test is a fresh visitor
// unless it explicitly reuses a cookie from an earlier response.
const baseUrl = inject("baseUrl");

function cookieFrom(res: Response): string {
  const raw = res.headers.get("set-cookie");
  expect(raw, "expected a seal cookie to be set").toBeTruthy();
  return raw!.split(";")[0]!;
}

async function write(body: string, cookie?: string): Promise<Response> {
  return fetch(new URL("/colophons", baseUrl), {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: new URLSearchParams({ body }).toString(),
  });
}

async function index(cookie?: string): Promise<{ text: string; cookie: string }> {
  const res = await fetch(new URL("/", baseUrl), {
    headers: cookie ? { Cookie: cookie } : {},
  });
  return { text: await res.text(), cookie: cookie ?? cookieFrom(res) };
}

it("a written colophon is still there on a later request", async () => {
  const marker = `proof-of-life-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const { cookie } = await index();
  const write1 = await write(marker, cookie);
  expect(write1.status).toBe(303);

  const { text } = await index(cookie);
  expect(text).toContain(marker);
});

it("an empty colophon is rejected, not stored", async () => {
  const { cookie } = await index();
  const res = await write("   ", cookie);
  expect(res.status).toBe(303);
  expect(res.headers.get("location")).toBe("/?error=empty");
});

it("an over-length colophon is rejected rather than truncated", async () => {
  const { cookie } = await index();
  const tooLong = "x".repeat(400);
  const res = await write(tooLong, cookie);
  expect(res.status).toBe(303);
  expect(res.headers.get("location")).toBe("/?error=long");

  const { text } = await index(cookie);
  expect(text).not.toContain(tooLong);
});

// Returns just the one transcript <li> the marker landed in, so a false match
// against unrelated "yours" text elsewhere on the page (the compose heading,
// or the same colophon's sheet on the scroll, which renders before the list)
// can't pass or fail this test by accident.
function entryFor(text: string, marker: string): string {
  const doc = new JSDOM(text).window.document;
  const entry = [...doc.querySelectorAll(".colophon-list > li")].find((li) => li.textContent!.includes(marker));
  expect(entry, `expected to find "${marker}" in the transcript`).toBeTruthy();
  return entry!.outerHTML;
}

it("a colophon reads as mine only for the browser that wrote it", async () => {
  const marker = `mine-check-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const { cookie: author } = await index();
  await write(marker, author);

  const authorView = await index(author);
  expect(entryFor(authorView.text, marker)).toContain("yours");

  const { cookie: stranger } = await index();
  expect(stranger).not.toBe(author);
  const strangerView = await index(stranger);
  expect(entryFor(strangerView.text, marker)).not.toContain("yours");
});
