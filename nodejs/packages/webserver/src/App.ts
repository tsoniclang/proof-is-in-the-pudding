// HTTP server using Node.js http module
import * as http from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { timers } from "node:timers";

export function main(): void {
  const PORT = 3000;

  const server = http.createServer((req: IncomingMessage, res: ServerResponse) => {
    console.log(`${req.method} ${req.url}`);

    // setHeader must be called before writeHead (Node.js requirement)
    res.setHeader("Content-Type", "text/plain");
    res.writeHead(200, "OK");
    res.end("Hello from Tsonic!");
  });

  server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
  });

  timers.setInterval(() => {}, 60000);
}
