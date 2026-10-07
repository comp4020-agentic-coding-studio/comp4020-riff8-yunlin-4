import { expect, inject, it } from "vitest";
import { data, draft, page, post, stroke, Stream, visitor } from "./helpers.ts";

// The crit's pass condition, without a browser: a change one person makes
// reaches every other open page within about a second, no reload. ADR 0001
// makes every stroke live, so a stroke is what's tested.
const baseUrl = inject("baseUrl");

it("a stroke one visitor brushes reaches another visitor's open stream within a second", async () => {
  const writer = await visitor(baseUrl);
  const reader = await visitor(baseUrl);
  const stream = new Stream(baseUrl, { Cookie: reader.cookie });
  await stream.opened();

  const id = await draft(baseUrl, writer);
  const sent = Date.now();
  const res = await stroke(baseUrl, writer, id, [20, 30, 60, 90, 120, 150]);
  expect(res.status).toBe(201);

  const arrived = await stream.waitFor((e) => e.type === "stroke" && data(e).strokeId === res.data.strokeId, 1500);
  expect(arrived.at - sent).toBeLessThan(1000);
  expect(data(arrived)).toMatchObject({ colophonId: id, points: [20, 30, 60, 90, 120, 150] });
  await stream.close();
  await post(baseUrl, `/api/colophons/${id}/abandon`, {}, writer);
});

it("a sealed colophon, typed or brushed, is announced live to other pages", async () => {
  const writer = await visitor(baseUrl);
  const stream = new Stream(baseUrl);
  await stream.opened();

  const id = await draft(baseUrl, writer);
  await stroke(baseUrl, writer, id, [1, 1]);
  expect((await post(baseUrl, `/api/colophons/${id}/seal`, {}, writer)).status).toBe(200);
  await stream.waitFor((e) => e.type === "sealed" && data(e).id === id, 1500);

  const typed = await fetch(new URL("/colophons", baseUrl), {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: writer.cookie },
    body: new URLSearchParams({ body: `typed-live-${Date.now()}` }).toString(),
  });
  expect(typed.status).toBe(303);
  await stream.waitFor((e) => e.type === "sealed" && data(e).id !== id, 1500);
  await stream.close();
});

it("a reconnect with Last-Event-ID replays exactly the missed events, none twice", async () => {
  const writer = await visitor(baseUrl);
  const id = await draft(baseUrl, writer);

  const first = new Stream(baseUrl);
  await first.opened();
  const before = await stroke(baseUrl, writer, id, [5, 5, 6, 6]);
  const seen = await first.waitFor((e) => e.type === "stroke" && data(e).strokeId === before.data.strokeId);
  await first.close();

  const missed: number[] = [];
  for (let i = 0; i < 3; i++) missed.push((await stroke(baseUrl, writer, id, [i, i])).data.strokeId as number);

  const again = new Stream(baseUrl, { "Last-Event-ID": seen.id });
  await again.opened();
  for (const strokeId of missed) await again.waitFor((e) => e.type === "stroke" && data(e).strokeId === strokeId);
  const mine = again.events.filter((e) => e.type === "stroke" && data(e).colophonId === id);
  expect(mine.map((e) => data(e).strokeId)).toEqual(missed);
  await post(baseUrl, `/api/colophons/${id}/abandon`, {}, writer);
  const seq = (eid: string) => Number(eid.split(".")[1]);
  for (const e of again.events) expect(seq(e.id)).toBeGreaterThan(seq(seen.id));
  await again.close();
});

it("a page rendered just before an event still gets it, via the id the page carries", async () => {
  const writer = await visitor(baseUrl);
  const html = await page(baseUrl);
  const since = /data-event-id="([^"]+)"/.exec(html)![1]!;
  const id = await draft(baseUrl, writer);
  const res = await stroke(baseUrl, writer, id, [7, 7]);

  const late = new Stream(baseUrl, {}, `?since=${encodeURIComponent(since)}`);
  await late.waitFor((e) => e.type === "stroke" && data(e).strokeId === res.data.strokeId);
  await late.close();
  await post(baseUrl, `/api/colophons/${id}/abandon`, {}, writer);
});

it("an id the server can't replay exactly gets a reset, not a silent gap", async () => {
  const stream = new Stream(baseUrl, { "Last-Event-ID": "notthisboot.5" });
  await stream.waitFor((e) => e.type === "reset");
  await stream.close();
});

it("no seal token ever travels on the live channel", async () => {
  const writer = await visitor(baseUrl);
  const stream = new Stream(baseUrl);
  await stream.opened();
  const id = await draft(baseUrl, writer);
  await stroke(baseUrl, writer, id, [9, 9]);
  await post(baseUrl, `/api/colophons/${id}/seal`, { body: "token check" }, writer);
  await stream.waitFor((e) => e.type === "sealed" && data(e).id === id);
  expect(stream.raw).not.toContain(writer.token);
  expect(stream.raw).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  await stream.close();
});

it("the stream is uncached server-sent events that tell the browser how soon to reconnect", async () => {
  const controller = new AbortController();
  const res = await fetch(new URL("/events", baseUrl), { signal: controller.signal });
  expect(res.status).toBe(200);
  expect(res.headers.get("content-type")).toMatch(/^text\/event-stream/);
  expect(res.headers.get("cache-control")).toBe("no-store");
  const reader = res.body!.getReader();
  const first = new TextDecoder().decode((await reader.read()).value);
  expect(first).toMatch(/^retry: \d+\n\n/);
  controller.abort();
});

it("an id from this server's future is a reset too, not an empty replay", async () => {
  const html = await page(baseUrl);
  const boot = /data-event-id="([0-9a-z]+)\./.exec(html)![1]!;
  const stream = new Stream(baseUrl, { "Last-Event-ID": `${boot}.999999999` });
  await stream.waitFor((e) => e.type === "reset");
  await stream.close();
});
