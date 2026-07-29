import { createServer } from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { join, normalize, extname } from "node:path";

const port = Number(process.env.WEB_PORT || 3001);
const root = join(process.cwd(), "dist");

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

createServer((req, res) => {
  const host = String(req.headers.host || "").split(":")[0];
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const safePath = normalize(url.pathname).replace(/^(\.\.[/\\])+/, "");

  const isPublicDomain =
    host === "imai.my" ||
    host === "www.imai.my";

  let filePath = join(root, safePath === "/" ? "index.html" : safePath);

  if (
    isPublicDomain &&
    (
      safePath === "/" ||
      safePath === "/index.html"
    )
  ) {
    filePath = join(root, "landing.html");
  }

  if (!existsSync(filePath)) {
    filePath = join(root, isPublicDomain ? "landing.html" : "index.html");
  }

  res.setHeader("Content-Type", types[extname(filePath)] || "application/octet-stream");
  createReadStream(filePath).pipe(res);
}).listen(port, "0.0.0.0", () => {
  console.log(`MyPocket web listening on ${port}`);
});
