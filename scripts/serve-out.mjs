// Serves the static export (out/) under /vdc-academy/ exactly like GitHub Pages. Usage: node scripts/serve-out.mjs [port]
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const port = Number(process.argv[2] ?? 4173);
const root = path.resolve("out");
const base = "/vdc-academy";
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".woff2": "font/woff2", ".txt": "text/plain", ".webp": "image/webp" };

http
  .createServer((req, res) => {
    let url = decodeURIComponent((req.url ?? "/").split("?")[0]);
    if (!url.startsWith(base)) {
      res.writeHead(404);
      return res.end("not found");
    }
    let file = path.join(root, url.slice(base.length) || "/");
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    if (!fs.existsSync(file)) {
      res.writeHead(404, { "Content-Type": "text/html" });
      return res.end(fs.readFileSync(path.join(root, "404.html")));
    }
    const type = types[path.extname(file)] ?? "application/octet-stream";
    const gz = /html|javascript|css|json|svg|text/.test(type) && /gzip/.test(String(req.headers["accept-encoding"]));
    res.writeHead(200, { "Content-Type": type, ...(gz ? { "Content-Encoding": "gzip" } : {}) });
    const stream = fs.createReadStream(file);
    (gz ? stream.pipe(zlib.createGzip()) : stream).pipe(res);
  })
  .listen(port, () => console.log(`serving out/ at http://localhost:${port}${base}/`));
