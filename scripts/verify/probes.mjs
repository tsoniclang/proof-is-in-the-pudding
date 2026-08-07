import assert from "node:assert/strict";
import { appendFile } from "node:fs/promises";
import { createServer } from "node:net";

export async function allocateServerPorts(projects) {
  const ports = new Map();
  for (const project of projects.filter(({ kind }) => kind === "server")) {
    ports.set(project.id, await allocatePort());
  }
  return ports;
}

export function serverEnvironment(project, port, runtimeDirectory) {
  if (project.id.startsWith("aspnet-")) {
    return {
      PROOF_URL: `http://127.0.0.1:${port}`,
      TS_PUDDING_DB: `${runtimeDirectory}/app.db`,
    };
  }
  return { PROOF_PORT: String(port) };
}

export async function probeServer(task, project, server, port) {
  const host = project.contract === "bcl-todo" ? "localhost" : "127.0.0.1";
  const base = `http://${host}:${port}`;
  const readyPath = {
    "aspnet-blog": "/api/posts",
    "aspnet-ef": "/api/health",
    "bcl-todo": "/todos",
    "js-notes": "/healthz",
    "js-todo": "/todos",
    "node-web": "/",
  }[project.contract];
  assert.notEqual(readyPath, undefined, `No server readiness contract exists for ${project.contract}.`);
  await waitForReady(server, `${base}${readyPath}`);
  const probes = {
    "aspnet-blog": probeAspNetBlog,
    "aspnet-ef": probeAspNetEf,
    "bcl-todo": probeTodoApi,
    "js-notes": probeNotesApi,
    "js-todo": probeTodoApi,
    "node-web": probeNodeWeb,
  };
  await probes[project.contract](task, base);
}

export function assertFiniteOutput(project, output, projectDirectory) {
  const normalized = normalizeOutput(output);
  const validators = {
    "bcl-typed-locations": assertBclTypedLocations,
    calculator: assertCalculator,
    fibonacci: assertFibonacci,
    hello: assertHello,
    "high-performance": assertHighPerformance,
    "bcl-parallel": assertBclParallel,
    "js-concurrency": assertJsConcurrency,
    "node-concurrency": assertNodeConcurrency,
    "env-info": (value) => assertEnvironmentInfo(value, projectDirectory),
    "file-reader": assertFileReader,
    "scoped-workspace": assertScopedWorkspace,
    "unscoped-workspace": assertUnscopedWorkspace,
  };
  const validator = validators[project.contract];
  assert.notEqual(validator, undefined, `No finite output contract exists for ${project.contract}.`);
  validator(normalized);
}

function assertHello(output) {
  assert.equal(output, "Hello from Tsonic!");
}

function assertBclTypedLocations(output) {
  assert.equal(output, [
    "Pointers: 2, 41, 10, 4",
    "Pointer identity: True, False, True, True, False",
    "Pointer value field: 3",
    "Hello from Tsonic!",
  ].join("\n"));
}

function assertCalculator(output) {
  assert.equal(output, [
    "=== Calculator Demo ===",
    "x = 10",
    "y = 3",
    "",
    "add(x, y) = 13",
    "subtract(x, y) = 7",
    "multiply(x, y) = 30",
    "divide(x, y) = 3.3333333333333335",
    "",
    "Testing division by zero:",
    "Error: Division by zero!",
  ].join("\n"));
}

function assertFibonacci(output) {
  const expected = ["=== Fibonacci Demo ===", "", "Recursive fibonacci:"];
  const values = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55];
  for (let index = 0; index < values.length; index += 1) {
    expected.push(`  fib(${index}) = ${values[index]}`);
  }
  expected.push("", "Iterative fibonacci (faster for large n):", "  fib(40) = 102334155");
  assert.equal(output, expected.join("\n"));
}

function assertHighPerformance(output) {
  assert.equal(output, [
    "=== High Performance Span Examples ===",
    "",
    "Created Span with 10 elements",
    "Span isEmpty: False",
    "Created slice from index 2, length 5: 5 elements",
    "Slice contains: 3, 4, 5, 6, 7",
    "",
    "Filling slice with value 99...",
    "Original array after fill:",
    "[1, 2, 99, 99, 99, 99, 99, 8, 9, 10]",
    "",
    "Processing array in chunks of 3:",
    "Processing chunk at offset 0, size 3",
    "Processing chunk at offset 3, size 3",
    "Processing chunk at offset 6, size 3",
    "Processing chunk at offset 9, size 1",
    "",
    "=== Memory<T> Example ===",
    "Memory length: 10",
    "Memory isEmpty: False",
    "",
    "=== Copy Example ===",
    "After copy: [100, 200, 300, 0, 0]",
    "",
    "Done!",
  ].join("\n"));
}

function assertBclParallel(output) {
  const lines = output.split("\n");
  assert.equal(lines[0], "=== Parallel Computation Test (BCL) ===");
  assert.equal(lines[1], "");
  assert.match(lines[2], /^Processors: [1-9][0-9]*$/u);
  assert.deepEqual(lines.slice(3, 6), ["", "Running 3 workers in PARALLEL with 100000 iterations each...", ""]);
  assert.deepEqual(
    lines.slice(6, 12).sort(),
    [
      "Worker 1 done. Sum: 4999950000",
      "Worker 1 starting on thread...",
      "Worker 2 done. Sum: 4999950000",
      "Worker 2 starting on thread...",
      "Worker 3 done. Sum: 4999950000",
      "Worker 3 starting on thread...",
    ].sort(),
  );
  assert.deepEqual(lines.slice(12), [
    "",
    "=== Results ===",
    "Worker 1: 4999950000",
    "Worker 2: 4999950000",
    "Worker 3: 4999950000",
    "Total: 14999850000",
  ]);
}

function assertJsConcurrency(output) {
  assertConcurrentOutput(output, {
    heading: "=== Concurrent Work Demo (JS surface) ===",
    prefix: ["", "Running 3 concurrent workers with 100000 iterations each...", ""],
  });
}

function assertNodeConcurrency(output) {
  const lines = output.split("\n");
  assert.equal(lines[0], "=== Concurrent Work Demo (Node.js surface) ===");
  assert.equal(lines[1], "");
  assert.match(lines[2], /^Detected CPUs: [1-9][0-9]*$/u);
  assertConcurrentOutput(lines.slice(3).join("\n"), {
    heading: "",
    prefix: ["Running 3 concurrent workers with 100000 iterations each...", ""],
  });
}

function assertConcurrentOutput(output, { heading, prefix }) {
  const lines = output.split("\n");
  assert.equal(lines[0], heading);
  assert.deepEqual(lines.slice(1, 1 + prefix.length), prefix);
  const eventStart = 1 + prefix.length;
  assert.deepEqual(
    lines.slice(eventStart, eventStart + 6).sort(),
    [
      "Worker 1 done. Sum: 4999950000",
      "Worker 1 starting...",
      "Worker 2 done. Sum: 4999950000",
      "Worker 2 starting...",
      "Worker 3 done. Sum: 4999950000",
      "Worker 3 starting...",
    ].sort(),
  );
  assert.deepEqual(lines.slice(eventStart + 6), [
    "",
    "=== Results ===",
    "Worker 1: 4999950000",
    "Worker 2: 4999950000",
    "Worker 3: 4999950000",
    "Total: 14999850000",
  ]);
}

function assertEnvironmentInfo(output, projectDirectory) {
  const lines = output.split("\n");
  assert.equal(lines.length, 15);
  assert.deepEqual(lines.slice(0, 2), ["=== Environment Info ===", ""]);
  assert.equal(lines[2], `Current directory: ${projectDirectory}`);
  assert.equal(lines[3], "Platform: linux");
  assert.equal(lines[4], "Architecture: x64");
  assert.equal(lines[5], "Node version: v24.0.0-tsonic");
  assert.match(lines[6], /^PID: [1-9][0-9]*$/u);
  assert.deepEqual(lines.slice(7), [
    "",
    "=== Path Operations ===",
    "",
    "Test path: /home/user/documents/file.txt",
    "Basename: file.txt",
    "Dirname: /home/user/documents",
    "Extension: .txt",
    "Joined path: home/user/docs",
  ]);
}

function assertFileReader(output) {
  assert.equal(output, "Fixture present: true\nFixture content: proof-file-reader-fixture");
}

function assertScopedWorkspace(output) {
  assert.equal(output, [
    "1: Make npm workspaces work in Tsonic (todo)",
    "1: Make npm workspaces work in Tsonic (done)",
  ].join("\n"));
}

function assertUnscopedWorkspace(output) {
  assert.equal(output, [
    "1: Make npm workspaces work in Tsonic (unscoped) (todo)",
    "1: Make npm workspaces work in Tsonic (unscoped) (done)",
  ].join("\n"));
}

async function probeTodoApi(task, base) {
  const collection = `${base}/todos`;
  assert.deepEqual(await requestJson(task, collection, undefined, 200), [
    { id: 1, title: "Learn TypeScript", completed: false },
    { id: 2, title: "Build a REST API", completed: false },
    { id: 3, title: "Test with curl", completed: false },
  ]);
  await request(task, `${base}/not-todos`, undefined, 404);
  await request(task, `${collection}/not-an-int`, undefined, 404);
  await request(task, `${collection}/1/extra`, undefined, 404);
  await request(task, collection, jsonRequest("POST", "{"), 400);
  await request(task, collection, jsonRequest("POST", JSON.stringify({ wrong: "shape" })), 400);
  const created = await requestJson(task, collection, jsonRequest("POST", JSON.stringify({ title: "Airplane grade" })), 201);
  assert.deepEqual(created, { id: 4, title: "Airplane grade", completed: false });
  const item = `${collection}/4`;
  assert.deepEqual(
    await requestJson(task, item, jsonRequest("PUT", JSON.stringify({ title: "Verified", completed: true })), 200),
    { id: 4, title: "Verified", completed: true },
  );
  await request(task, item, { method: "DELETE" }, 204);
  assert.deepEqual(await requestJson(task, item, undefined, 404), { error: "Todo not found" });
  assert.equal((await requestJson(task, collection, undefined, 200)).length, 3);
}

async function probeNotesApi(task, base) {
  assert.equal(await request(task, `${base}/healthz`, undefined, 200), "ok");
  assert.match(await request(task, `${base}/`, undefined, 200), /<h1>Tsonic Notes<\/h1>/u);
  const initial = await requestJson(task, `${base}/api/notes`, undefined, 200);
  assert.equal(initial.length, 2);
  for (const note of initial) assertNote(note);
  await request(task, `${base}/api/notes/not-an-int`, undefined, 400);
  await request(task, `${base}/api/notes/1/extra`, undefined, 400);
  await request(task, `${base}/api/notes`, jsonRequest("POST", "{"), 400);
  const created = await requestJson(
    task,
    `${base}/api/notes`,
    jsonRequest("POST", JSON.stringify({ title: "Architecture", content: "Verified" })),
    201,
  );
  assertNote(created);
  assert.equal(created.title, "Architecture");
  const item = `${base}/api/notes/${created.id}`;
  const updated = await requestJson(
    task,
    item,
    jsonRequest("PUT", JSON.stringify({ title: "Architecture", content: "Airplane grade" })),
    200,
  );
  assertNote(updated);
  assert.equal(updated.content, "Airplane grade");
  await request(task, item, { method: "DELETE" }, 204);
  assert.deepEqual(await requestJson(task, item, undefined, 404), { error: "Note not found" });
}

async function probeNodeWeb(task, base) {
  assert.equal(await request(task, `${base}/`, undefined, 200), "Hello from Tsonic!");
}

async function probeAspNetBlog(task, base) {
  assert.match(await request(task, `${base}/`, undefined, 200), /<h1>Tsonic Blog<\/h1>/u);
  assert.deepEqual(await requestJson(task, `${base}/api/posts`, undefined, 200), [
    { id: 1, title: "Hello, world", content: "Welcome to Tsonic + ASP.NET Core!" },
  ]);
  await request(task, `${base}/api/posts/1`, undefined, 404);
  await request(task, `${base}/api/posts`, jsonRequest("POST", "{"), 400);
  await request(task, `${base}/api/posts`, jsonRequest("POST", JSON.stringify({ wrong: "shape" })), 400);
  assert.deepEqual(
    await requestJson(
      task,
      `${base}/api/posts`,
      jsonRequest("POST", JSON.stringify({ title: "Architecture", content: "Airplane grade" })),
      201,
    ),
    { id: 2, title: "Architecture", content: "Airplane grade" },
  );
}

async function probeAspNetEf(task, base) {
  assert.deepEqual(await requestJson(task, `${base}/api/health`, undefined, 200), { ok: true });
  assert.match(await request(task, `${base}/`, undefined, 200), /<h1>Tsonic Blog<\/h1>/u);
  const initial = await requestJson(task, `${base}/api/posts`, undefined, 200);
  assert.equal(initial.length, 1);
  assertPost(initial[0]);
  await request(task, `${base}/api/posts/not-an-int`, undefined, 404);
  await request(task, `${base}/api/posts/1/extra`, undefined, 404);
  await request(task, `${base}/api/posts`, jsonRequest("POST", "{"), 400);
  const created = await requestJson(
    task,
    `${base}/api/posts`,
    jsonRequest("POST", JSON.stringify({ title: "Architecture", content: "Verified" })),
    201,
  );
  assertPost(created);
  const postUrl = `${base}/api/posts/${created.id}`;
  const detail = await requestJson(task, postUrl, undefined, 200);
  assertPost(detail, true);
  const updated = await requestJson(
    task,
    postUrl,
    jsonRequest("PUT", JSON.stringify({ title: "Architecture", content: "Airplane grade" })),
    200,
  );
  assertPost(updated);
  assert.equal(updated.content, "Airplane grade");
  const comment = await requestJson(
    task,
    `${postUrl}/comments`,
    jsonRequest("POST", JSON.stringify({ author: "Reviewer", body: "Verified" })),
    201,
  );
  assertComment(comment);
  const comments = await requestJson(task, `${postUrl}/comments`, undefined, 200);
  assert.equal(comments.length, 1);
  assertComment(comments[0]);
  await request(task, postUrl, { method: "DELETE" }, 204);
  assert.deepEqual(await requestJson(task, postUrl, undefined, 404), { error: "Post not found" });
}

async function waitForReady(server, url) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    assert.equal(server.child.exitCode, null, `Server exited before readiness:\n${server.output()}`);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1_000) });
      await response.arrayBuffer();
      return;
    } catch {
      await new Promise((resolveSleep) => setTimeout(resolveSleep, 100));
    }
  }
  assert.fail(`Server did not become ready at ${url}:\n${server.output()}`);
}

async function request(task, url, options, expectedStatus) {
  const method = options?.method ?? "GET";
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(10_000) });
  const text = await response.text();
  await appendFile(
    task.logPath,
    `REQUEST ${method} ${url}\nSTATUS ${response.status}\nBODY ${text.slice(0, 8_192)}\n`,
    "utf8",
  );
  assert.equal(response.status, expectedStatus, `${method} ${url}: ${text}`);
  return text;
}

async function requestJson(task, url, options, expectedStatus) {
  return JSON.parse(await request(task, url, options, expectedStatus));
}

function jsonRequest(method, body) {
  return { method, headers: { "content-type": "application/json" }, body };
}

function assertNote(note) {
  assert.deepEqual(Object.keys(note).sort(), ["content", "createdAt", "id", "title", "updatedAt"]);
  assert.equal(Number.isInteger(note.id), true);
  assert.equal(typeof note.title, "string");
  assert.equal(typeof note.content, "string");
  assertIsoDate(note.createdAt);
  assertIsoDate(note.updatedAt);
}

function assertPost(post, detail = false) {
  const keys = ["content", "createdAt", "id", "title", "updatedAt", ...(detail ? ["comments"] : [])].sort();
  assert.deepEqual(Object.keys(post).sort(), keys);
  assert.equal(Number.isInteger(post.id), true);
  assert.equal(typeof post.title, "string");
  assert.equal(typeof post.content, "string");
  assertIsoDate(post.createdAt);
  assertIsoDate(post.updatedAt);
  if (detail) assert.deepEqual(post.comments, []);
}

function assertComment(comment) {
  assert.deepEqual(Object.keys(comment).sort(), ["author", "body", "createdAt", "id", "postId"]);
  assert.equal(Number.isInteger(comment.id), true);
  assert.equal(Number.isInteger(comment.postId), true);
  assert.equal(comment.author, "Reviewer");
  assert.equal(comment.body, "Verified");
  assertIsoDate(comment.createdAt);
}

function assertIsoDate(value) {
  assert.equal(typeof value, "string");
  assert.equal(Number.isNaN(Date.parse(value)), false, `'${value}' is not an ISO date.`);
}

function normalizeOutput(output) {
  const normalized = output.replaceAll("\r\n", "\n");
  assert.equal(normalized.endsWith("\n"), true, "Program output must end with one newline.");
  assert.equal(normalized.endsWith("\n\n"), false, "Program output has an extra trailing blank line.");
  return normalized.slice(0, -1);
}

function allocatePort() {
  return new Promise((resolvePort, rejectPort) => {
    const server = createServer();
    server.unref();
    server.once("error", rejectPort);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      assert.notEqual(typeof address, "string");
      const port = address.port;
      server.close((error) => error === undefined ? resolvePort(port) : rejectPort(error));
    });
  });
}
