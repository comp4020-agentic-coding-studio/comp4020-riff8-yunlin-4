import { createHash } from "node:crypto";
import { sealGlyph } from "./seal.ts";

// What a visitor is called in the server's log: their seal glyph plus the first
// six hex characters of the SHA-256 of their token, e.g. "鑑·3fa9c2". One-way
// (the token can't be recovered from it), stable per token, and the only name
// the log or a visitor's own page ever uses for them.
export function markOf(token: string): string {
  return `${sealGlyph(token)}·${createHash("sha256").update(token).digest("hex").slice(0, 6)}`;
}
