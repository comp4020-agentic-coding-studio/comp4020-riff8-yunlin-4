import type { IncomingMessage, ServerResponse } from "node:http";

// The live channel: server-sent events from one in-memory bus. Fly runs one
// machine, so every open page is connected to this process (see the ADR for
// what scaling out would change). Payloads carry colophon ids and seal glyphs,
// never a seal token: whether something is "yours" is decided per viewer, by
// the server rendering that viewer's own HTML.

export type LiveEvent =
  | { type: "draft"; data: { id: number; glyph: string } }
  | { type: "stroke"; data: { colophonId: number; strokeId: number; t: number; points: number[]; c?: string } }
  | { type: "sealed"; data: { id: number } }
  | { type: "abandoned"; data: { id: number } };

// Ids are "<boot>.<seq>". A page reconnecting with an id from an earlier
// process, or older than the buffer holds, can't be replayed exactly, so it's
// told to reload, which is always correct: the page is rendered from SQLite.
const BOOT = Date.now().toString(36);
const BUFFER_SIZE = 512;
export const MAX_CLIENTS = 200;
// Open tabs from one address; stops one address holding every stream.
const MAX_CLIENTS_PER_IP = 20;
const HEARTBEAT_MS = 20_000;
// A stream is closed after this long and the browser reconnects with its
// Last-Event-ID. Bounds any one connection's life without losing an event.
const MAX_STREAM_MS = 15 * 60_000;

interface Buffered {
  seq: number;
  frame: string;
}

let seq = 0;
const buffer: Buffered[] = [];
const clients = new Set<ServerResponse>();
const perIp = new Map<string, number>();

export function currentEventId(): string {
  return `${BOOT}.${seq}`;
}

export function clientCount(): number {
  return clients.size;
}

// write() returning false means the socket's buffer is filling: this reader
// isn't keeping up. Drop it rather than let its queue grow; it reconnects and
// replays from its last id.
function send(res: ServerResponse, frame: string): boolean {
  if (res.write(frame)) return true;
  clients.delete(res);
  res.destroy();
  return false;
}

export function publish(event: LiveEvent): void {
  seq += 1;
  const frame = `id: ${BOOT}.${seq}\nevent: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
  buffer.push({ seq, frame });
  if (buffer.length > BUFFER_SIZE) buffer.shift();
  for (const res of clients) send(res, frame);
}

// What a reconnecting page missed, or "reset" if that can't be known exactly.
export function replayFrom(lastId: string | undefined): string[] | "reset" {
  if (!lastId) return [];
  const match = /^([0-9a-z]+)\.(\d+)$/.exec(lastId);
  if (!match || match[1] !== BOOT) return "reset";
  const since = Number(match[2]);
  if (since > seq) return "reset";
  if (since === seq) return [];
  const oldest = buffer[0]?.seq ?? seq + 1;
  if (since < oldest - 1) return "reset";
  return buffer.filter((b) => b.seq > since).map((b) => b.frame);
}

export function openStream(req: IncomingMessage, res: ServerResponse, since: string | undefined, ip: string): void {
  if (clients.size >= MAX_CLIENTS || (perIp.get(ip) ?? 0) >= MAX_CLIENTS_PER_IP) {
    res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8", "Retry-After": "10" });
    res.end("too many open pages");
    return;
  }
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-store",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.write("retry: 2000\n\n");

  const missed = replayFrom(since);
  if (missed === "reset") {
    res.write(`id: ${currentEventId()}\nevent: reset\ndata: {}\n\n`);
  } else {
    // Through send(), so a reader not draining a long replay is dropped at
    // the socket's buffer rather than queued in memory.
    for (const frame of missed) if (!send(res, frame)) return;
  }
  clients.add(res);
  perIp.set(ip, (perIp.get(ip) ?? 0) + 1);

  const heartbeat = setInterval(() => send(res, ": hb\n\n"), HEARTBEAT_MS);
  const lifetime = setTimeout(() => res.end(), MAX_STREAM_MS);
  let closed = false;
  const close = (): void => {
    if (closed) return;
    closed = true;
    clearInterval(heartbeat);
    clearTimeout(lifetime);
    clients.delete(res);
    const left = (perIp.get(ip) ?? 1) - 1;
    if (left > 0) perIp.set(ip, left);
    else perIp.delete(ip);
  };
  req.on("close", close);
  res.on("close", close);
}
