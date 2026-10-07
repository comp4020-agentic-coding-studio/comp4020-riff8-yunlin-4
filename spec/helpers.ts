import { expect } from "vitest";

// Shared by the crit 9 specs. Every visitor is a cookie managed by hand, since
// fetch carries no cookie jar between calls.

export interface Visitor {
  cookie: string;
  token: string;
}

export async function visitor(baseUrl: string): Promise<Visitor> {
  const res = await fetch(new URL("/", baseUrl));
  await res.text();
  const cookie = res.headers.get("set-cookie")!.split(";")[0]!;
  return { cookie, token: cookie.split("=")[1]! };
}

export async function post(
  baseUrl: string,
  path: string,
  body: unknown,
  who?: Visitor,
): Promise<{ status: number; data: Record<string, unknown> }> {
  const res = await fetch(new URL(path, baseUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(who ? { Cookie: who.cookie } : {}) },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  return { status: res.status, data: (await res.json().catch(() => ({}))) as Record<string, unknown> };
}

export async function draft(baseUrl: string, who: Visitor): Promise<number> {
  const { status, data } = await post(baseUrl, "/api/drafts", {}, who);
  expect([200, 201]).toContain(status);
  return data.id as number;
}

export async function stroke(baseUrl: string, who: Visitor, id: number, points: number[]) {
  return post(baseUrl, `/api/colophons/${id}/strokes`, { v: 1, points }, who);
}

export async function page(baseUrl: string, who?: Visitor): Promise<string> {
  const res = await fetch(new URL("/", baseUrl), { headers: who ? { Cookie: who.cookie } : {} });
  return res.text();
}

export interface SseEvent {
  id: string;
  type: string;
  data: string;
  at: number;
}

// Reads an SSE stream with fetch's streamed body: CI has no browser, and no
// EventSource in Node to lean on.
export class Stream {
  events: SseEvent[] = [];
  raw = "";
  private controller = new AbortController();
  private done: Promise<void>;
  status = 0;

  constructor(baseUrl: string, headers: Record<string, string> = {}, query = "") {
    this.done = this.read(new URL(`/events${query}`, baseUrl), headers);
  }

  private async read(url: URL, headers: Record<string, string>): Promise<void> {
    try {
      const res = await fetch(url, { headers, signal: this.controller.signal });
      this.status = res.status;
      if (!res.body) return;
      const decoder = new TextDecoder();
      let pending = "";
      for await (const chunk of res.body) {
        const text = decoder.decode(chunk as Uint8Array, { stream: true });
        this.raw += text;
        pending += text;
        let split: number;
        while ((split = pending.indexOf("\n\n")) !== -1) {
          const frame = pending.slice(0, split);
          pending = pending.slice(split + 2);
          const event: SseEvent = { id: "", type: "message", data: "", at: Date.now() };
          for (const line of frame.split("\n")) {
            if (line.startsWith("id: ")) event.id = line.slice(4);
            else if (line.startsWith("event: ")) event.type = line.slice(7);
            else if (line.startsWith("data: ")) event.data = line.slice(6);
          }
          if (event.data) this.events.push(event);
        }
      }
    } catch {
      // aborted
    }
  }

  async opened(): Promise<void> {
    await until(() => this.raw.includes("retry:") || this.status >= 400, 5000);
  }

  async waitFor(match: (e: SseEvent) => boolean, timeout = 3000): Promise<SseEvent> {
    await until(() => this.events.some(match), timeout);
    return this.events.find(match)!;
  }

  close(): Promise<void> {
    this.controller.abort();
    return this.done;
  }
}

export async function until(check: () => boolean, timeout: number): Promise<void> {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeout) throw new Error(`timed out after ${timeout}ms`);
    await new Promise((r) => setTimeout(r, 10));
  }
}

export const data = (e: SseEvent): Record<string, unknown> => JSON.parse(e.data) as Record<string, unknown>;
