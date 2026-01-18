export const INDEX_HTML = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Tsonic Blog (EF Core + SQLite)</title>
    <style>
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 2rem; line-height: 1.4; }
      header { display: flex; gap: 1rem; align-items: baseline; flex-wrap: wrap; }
      .muted { color: #666; }
      input, textarea, button { font: inherit; padding: 0.5rem 0.75rem; }
      textarea { width: 100%; height: 7rem; }
      button { cursor: pointer; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
      .card { border: 1px solid #ddd; border-radius: 10px; padding: 1rem; }
      .card h2 { margin: 0 0 0.75rem 0; }
      .posts { display: grid; gap: 0.75rem; }
      .post { border: 1px solid #eee; border-radius: 10px; padding: 0.75rem; cursor: pointer; }
      .post:hover { background: #fafafa; }
      .post h3 { margin: 0 0 0.35rem 0; }
      .meta { font-size: 0.9rem; color: #666; }
      .error { color: #b00020; }
      pre { white-space: pre-wrap; margin: 0; }
      @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
    </style>
  </head>
  <body>
    <header>
      <h1>Tsonic Blog</h1>
      <span class="muted">ASP.NET Core + EF Core (SQLite), compiled TS → C#</span>
      <span class="muted" id="status"></span>
    </header>

    <div class="grid">
      <section class="card">
        <h2>Create Post</h2>
        <div><input id="title" placeholder="Title" style="width: 100%" /></div>
        <div style="margin-top: 0.75rem"><textarea id="content" placeholder="Write something..."></textarea></div>
        <div style="margin-top: 0.75rem; display: flex; gap: 0.5rem; align-items: center">
          <button id="create">Create</button>
          <span class="error" id="error"></span>
        </div>
      </section>

      <section class="card">
        <h2>Selected Post</h2>
        <div id="selected" class="muted">Click a post to view details.</div>
      </section>
    </div>

    <section style="margin-top: 1rem">
      <h2>Posts</h2>
      <div class="posts" id="posts"></div>
    </section>

    <script>
      const el = (id) => document.getElementById(id);
      const esc = (s) =>
        String(s)
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll("\\"", "&quot;");

      async function api(path, options) {
        const res = await fetch(path, options);
        const text = await res.text();
        if (!res.ok) return { ok: false, error: text };
        return { ok: true, value: text ? JSON.parse(text) : null };
      }

      function formatDate(d) {
        try { return new Date(d).toLocaleString(); } catch { return String(d); }
      }

      function renderPostRow(p) {
        return (
          '<div class="post" data-id="' + p.id + '">' +
            "<h3>" + esc(p.title) + "</h3>" +
            '<div class="meta">#' + p.id + " • " + esc(formatDate(p.createdAt)) + "</div>" +
          "</div>"
        );
      }

      async function refreshList() {
        const res = await api("/api/posts");
        if (!res.ok) {
          el("error").textContent = res.error;
          return;
        }
        const posts = res.value ?? [];
        el("posts").innerHTML = posts.map(renderPostRow).join("");
        for (const node of el("posts").querySelectorAll(".post")) {
          node.addEventListener("click", async () => {
            const id = node.getAttribute("data-id");
            await loadPost(id);
          });
        }
      }

      async function loadPost(id) {
        const res = await api("/api/posts/" + id);
        if (!res.ok) {
          el("selected").innerHTML = '<div class="error">' + esc(res.error) + "</div>";
          return;
        }
        const p = res.value;
        const comments = p.comments ?? [];
        const commentHtml = comments
          .map((c) =>
            '<div class="card" style="padding: 0.75rem; margin-top: 0.5rem">' +
              '<div class="meta">' + esc(c.author) + " • " + esc(formatDate(c.createdAt)) + "</div>" +
              "<pre>" + esc(c.body) + "</pre>" +
            "</div>"
          )
          .join("");
        el("selected").innerHTML =
          "<h3>" + esc(p.title) + "</h3>" +
          '<div class="meta">#' + p.id + " • " + esc(formatDate(p.createdAt)) + "</div>" +
          "<pre style='margin-top: 0.75rem'>" + esc(p.content) + "</pre>" +
          "<h4 style='margin-top: 1rem'>Comments</h4>" +
          (commentHtml || '<div class="muted">No comments yet.</div>') +
          '<div style="margin-top: 1rem">' +
            '<input id="author" placeholder="Your name" style="width: 100%" />' +
            '<textarea id="comment" placeholder="Write a comment..." style="margin-top: 0.5rem"></textarea>' +
            '<button id="add-comment" style="margin-top: 0.5rem">Add Comment</button>' +
          "</div>";

        el("add-comment").addEventListener("click", async () => {
          const author = el("author").value || "Anonymous";
          const body = el("comment").value;
          el("status").textContent = "Saving comment...";
          const r = await api("/api/posts/" + id + "/comments", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ author, body }),
          });
          el("status").textContent = "";
          if (!r.ok) {
            el("selected").innerHTML = '<div class="error">' + esc(r.error) + "</div>";
            return;
          }
          await loadPost(id);
        });
      }

      el("create").addEventListener("click", async () => {
        el("error").textContent = "";
        el("status").textContent = "Creating...";
        const title = el("title").value;
        const content = el("content").value;
        const res = await api("/api/posts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title, content }),
        });
        el("status").textContent = "";
        if (!res.ok) {
          el("error").textContent = res.error;
          return;
        }
        el("title").value = "";
        el("content").value = "";
        await refreshList();
      });

      refreshList();
    </script>
  </body>
</html>
`;

