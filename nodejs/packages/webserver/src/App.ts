// HTTP server using Node.js http module
import { console } from "@tsonic/nodejs/index.js";
import { http, IncomingMessage, ServerResponse } from "@tsonic/nodejs/nodejs.Http.js";
import { Thread, Timeout } from "@tsonic/dotnet/System.Threading.js";

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

  // Keep the process running forever (Ctrl+C to stop)
  Thread.Sleep(Timeout.Infinite);
}
