import { connect } from "node:net";
import { expect, inject, it } from "vitest";

// A client that drops partway through a request body (a phone losing signal
// mid-stroke) made readBody's iterator throw "aborted" inside the async
// request handler, an unhandled rejection that took the whole single-machine
// process down. Found by review in crit 9; this sends the truncated request
// over a raw socket, since fetch always sends a body matching its length.
const baseUrl = inject("baseUrl");

function truncatedPost(path: string): Promise<void> {
  const url = new URL(baseUrl);
  return new Promise((resolve, reject) => {
    const socket = connect(Number(url.port || 80), url.hostname, () => {
      socket.write(
        `POST ${path} HTTP/1.1\r\nHost: ${url.host}\r\nContent-Type: application/json\r\nContent-Length: 1000\r\n\r\n{"v":1,`,
      );
      setTimeout(() => {
        socket.destroy();
        resolve();
      }, 100);
    });
    socket.on("error", reject);
  });
}

it("a request dropped partway through its body doesn't take the server down", async () => {
  await truncatedPost("/api/colophons/1/strokes");
  await truncatedPost("/colophons");
  await new Promise((r) => setTimeout(r, 300));
  const res = await fetch(new URL("/", baseUrl));
  expect(res.status).toBe(200);
});
