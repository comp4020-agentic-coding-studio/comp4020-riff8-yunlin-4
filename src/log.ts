import { existsSync, statSync } from "node:fs";
import { appendFile, mkdir, rename, rm } from "node:fs/promises";
import { join } from "node:path";

// The server's record of who did what: one JSON object per line, to stdout and
// to a rotating file. {"ts","event","who",...fields}; `who` is a mark (see
// mark.ts) or "-".
//
// Never logged, by rule: seal tokens, Cookie headers, request bodies, typed
// text, stroke points, query strings, raw paths (only the matched route
// pattern), IP addresses, User-Agent. Actions are logged, views are not: the
// log is not a record of who was merely here.
//
// Every user-influenced string is truncated before JSON.stringify, which also
// escapes newlines, so no input can forge a second line.
//
// Flood policy: a client that never keeps cookies mints a new visitor per
// request. All lines pass a token bucket (50 lines/s, burst 200); the excess is
// dropped and counted, and the count is emitted as one `log.dropped` line.
// Startup, error and log.* lines bypass the bucket. The file queue is capped
// (2000 lines / 1 MiB) and flushed asynchronously, one append at a time;
// overflow is dropped and counted the same way. Rotation bounds the disk at
// LOG_MAX_BYTES x LOG_FILES. A file failure never reaches a request: file
// logging pauses for 60s and one `log.file-error` goes to stdout only.

const FIELD_CAP = 200;
const STACK_CAP = 2000;
const QUEUE_LINES = 2000;
const QUEUE_BYTES = 1024 * 1024;
const BUCKET_RATE = 50;
const BUCKET_BURST = 200;
const BACKOFF_MS = 60_000;

export interface LoggerOptions {
  dir: string;
  maxBytes: number;
  files: number;
  out?: (line: string) => void;
  backoffMs?: number;
}

export type Fields = Record<string, unknown> & { who?: string };

function clip(value: string, cap: number): string {
  return value.length > cap ? `${value.slice(0, cap)}…` : value;
}

function clean(value: unknown, cap: number): unknown {
  if (typeof value === "string") return clip(value, cap);
  if (value === null || typeof value === "number" || typeof value === "boolean") return value;
  if (value === undefined) return undefined;
  try {
    return clip(JSON.stringify(value) ?? "", cap);
  } catch {
    return "[unserialisable]";
  }
}

// base, base.1, base.2 ... base.(files-1); the oldest is dropped.
export async function rotate(dir: string, base: string, files: number): Promise<void> {
  const keep = Math.max(1, files);
  if (keep === 1) {
    await rm(join(dir, base), { force: true });
    return;
  }
  await rm(join(dir, `${base}.${keep - 1}`), { force: true });
  for (let i = keep - 2; i >= 1; i--) {
    await rename(join(dir, `${base}.${i}`), join(dir, `${base}.${i + 1}`)).catch(() => {});
  }
  await rename(join(dir, base), join(dir, `${base}.1`)).catch(() => {});
}

export function createLogger(opts: LoggerOptions) {
  const base = "colophon.log";
  const out = opts.out ?? ((line: string) => void process.stdout.write(line));
  const backoff = opts.backoffMs ?? BACKOFF_MS;
  let queue: string[] = [];
  let queueBytes = 0;
  let flushing = false;
  let scheduled = false;
  let disabledUntil = 0;
  let size: number | undefined;
  let dropped = 0;
  let tokens = BUCKET_BURST;
  let lastRefill = Date.now();

  function stdoutLine(event: string, fields: Record<string, unknown>): void {
    try {
      out(`${JSON.stringify({ ts: new Date().toISOString(), event, who: "-", ...fields })}\n`);
    } catch {
      // logging never throws
    }
  }

  function allow(): boolean {
    const now = Date.now();
    tokens = Math.min(BUCKET_BURST, tokens + ((now - lastRefill) / 1000) * BUCKET_RATE);
    lastRefill = now;
    if (tokens < 1) return false;
    tokens -= 1;
    return true;
  }

  function schedule(): void {
    if (scheduled) return;
    scheduled = true;
    setImmediate(() => {
      scheduled = false;
      void flush();
    });
  }

  async function flush(): Promise<void> {
    if (flushing) return;
    flushing = true;
    try {
      while (queue.length > 0) {
        const batch = queue;
        queue = [];
        queueBytes = 0;
        if (Date.now() < disabledUntil) continue;
        const text = batch.join("");
        const bytes = Buffer.byteLength(text);
        try {
          await mkdir(opts.dir, { recursive: true });
          if (size === undefined) {
            try {
              size = statSync(join(opts.dir, base)).size;
            } catch {
              size = 0;
            }
          }
          if (size > 0 && size + bytes > opts.maxBytes) {
            await rotate(opts.dir, base, opts.files);
            size = 0;
          }
          await appendFile(join(opts.dir, base), text);
          size += bytes;
        } catch (err) {
          disabledUntil = Date.now() + backoff;
          size = undefined;
          const code = (err as NodeJS.ErrnoException | undefined)?.code;
          stdoutLine("log.file-error", { code: typeof code === "string" ? code : "unknown" });
        }
      }
    } finally {
      flushing = false;
    }
  }

  function emit(line: string, bypass: boolean): void {
    if (!bypass && !allow()) {
      dropped++;
      return;
    }
    try {
      out(line);
    } catch {
      // ignore
    }
    if (Date.now() < disabledUntil) return;
    const bytes = Buffer.byteLength(line);
    if (queue.length >= QUEUE_LINES || queueBytes + bytes > QUEUE_BYTES) {
      dropped++;
      return;
    }
    queue.push(line);
    queueBytes += bytes;
    schedule();
  }

  function build(event: string, fields: Fields, stackCap = STACK_CAP): string {
    const { who, ...rest } = fields;
    const entry: Record<string, unknown> = {
      ts: new Date().toISOString(),
      event: clip(String(event), FIELD_CAP),
      who: typeof who === "string" && who ? clip(who, FIELD_CAP) : "-",
    };
    for (const [k, v] of Object.entries(rest)) {
      if (k === "ts" || k === "event") continue;
      const cleaned = clean(v, k === "stack" ? stackCap : FIELD_CAP);
      if (cleaned !== undefined) entry[k] = cleaned;
    }
    return `${JSON.stringify(entry)}\n`;
  }

  function summarise(): void {
    if (dropped === 0) return;
    const count = dropped;
    dropped = 0;
    emit(build("log.dropped", { count }), true);
  }
  const timer = setInterval(summarise, 1000);
  timer.unref();

  return {
    log(event: string, fields: Fields = {}): void {
      try {
        const bypass = event === "server.start" || event === "error" || event.startsWith("log.");
        emit(build(event, fields), bypass);
      } catch {
        // logging never throws into a request
      }
    },
    logError(err: unknown, fields: Fields = {}): void {
      try {
        const e = err instanceof Error ? err : new Error(String(err));
        emit(build("error", { ...fields, message: e.message, stack: e.stack ?? "" }), true);
      } catch {
        // ignore
      }
    },
    // Resolves once everything queued has been written (or failed); for tests.
    async drain(): Promise<void> {
      summarise();
      await new Promise((r) => setImmediate(r));
      while (flushing || queue.length > 0) {
        if (!flushing) await flush();
        else await new Promise((r) => setTimeout(r, 5));
      }
    },
  };
}

function defaultDir(): string {
  return process.env.LOG_DIR ?? (existsSync("/data") ? "/data/logs" : "./data/logs");
}

const logger = createLogger({
  dir: defaultDir(),
  maxBytes: Number(process.env.LOG_MAX_BYTES ?? 4 * 1024 * 1024),
  files: Number(process.env.LOG_FILES ?? 4),
});

export const log = logger.log;
export const logError = logger.logError;
export const drainLog = logger.drain;
