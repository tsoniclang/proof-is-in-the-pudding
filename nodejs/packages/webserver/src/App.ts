// HTTP server using Node.js http module
import * as http from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { env } from "node:process";
import { InvalidOperationException } from "@tsonic/dotnet/System.js";

function readPort(defaultPort: number): number {
  const configured = env["PROOF_PORT"];
  if (configured === undefined) return defaultPort;
  const port = Number(configured);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new InvalidOperationException("PROOF_PORT must be an integer from 1 through 65535.");
  }
  return port;
}

export function main(): void {
  const port = readPort(8765);

  const server = http.createServer((req: IncomingMessage, res: ServerResponse) => {
    console.log(`${req.method} ${req.url}`);

    // setHeader must be called before writeHead (Node.js requirement)
    res.setHeader("Content-Type", "text/plain");
    res.writeHead(200, "OK");
    res.end("Hello from Tsonic!");
  });

  server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
  });
}

main();
