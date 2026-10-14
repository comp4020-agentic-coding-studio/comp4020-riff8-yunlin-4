import { describe, expect, it } from "vitest";
import { createMatch, viewFor } from "../src/sim/index.ts";
import { renderView } from "../scripts/lib/render-view.ts";

describe("text renderer", () => {
  const lines = renderView(viewFor(createMatch("scroll-1", 1), 0));
  it("has a header, one row per map line, and stays compact", () => {
    expect(lines[0]).toMatch(/^tick 0 \(0:00\) · grain 200 · pop 4\/40 · you: east \(seat 0\)$/);
    expect(lines.length).toBeLessThan(80);
  });
  it("draws own hall and labourers", () => {
    const body = lines.join("\n");
    expect(body).toContain("HHH");
    expect(body).toContain("L");
    expect(body).toMatch(/labourers: 4 idle/);
  });
});
