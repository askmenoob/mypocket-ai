import { createServer } from "node:http";
import { createReadStream, existsSync, readFileSync } from "node:fs";
import { join, normalize, extname } from "node:path";
import { timingSafeEqual } from "node:crypto";

const port = Number(process.env.WEB_PORT || 3001);
const root = join(process.cwd(), "dist");

// CATALOG_PRIVATE_GATE_V1
function readCatalogAccessKey() {
  const envKey = String(
    process.env.CATALOG_ACCESS_KEY || ""
  ).trim();

  if (envKey) {
    return envKey;
  }

  const candidates = [
    process.env.CATALOG_ACCESS_KEY_FILE,
    "/opt/imai/.catalog-access-key",
    join(process.cwd(), ".catalog-access-key"),
    join(process.cwd(), "../../.catalog-access-key"),
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      if (existsSync(candidate)) {
        const key = String(
          readFileSync(candidate, "utf8")
        ).trim();

        if (key) {
          return key;
        }
      }
    } catch {
      // Continue to the next candidate.
    }
  }

  return "";
}

function catalogKeyMatches(expected, provided) {
  if (!expected || !provided) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(
    expectedBuffer,
    providedBuffer
  );
}


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


// CATALOG_ASSET_COOKIE_GATE_V2
function readRequestCookie(cookieHeader, name) {
  const parts = String(cookieHeader || "").split(";");

  for (const part of parts) {
    const trimmed = part.trim();

    if (!trimmed) {
      continue;
    }

    const separator = trimmed.indexOf("=");

    if (separator < 0) {
      continue;
    }

    const cookieName =
      trimmed.slice(0, separator);

    const cookieValue =
      trimmed.slice(separator + 1);

    if (cookieName === name) {
      return cookieValue;
    }
  }

  return "";
}

function denyPrivateCatalog(res) {
  res.statusCode = 404;

  res.setHeader(
    "Content-Type",
    "text/plain; charset=utf-8"
  );

  res.setHeader(
    "Cache-Control",
    "no-store"
  );

  res.setHeader(
    "X-Robots-Tag",
    "noindex, nofollow, noarchive, nosnippet"
  );

  res.setHeader(
    "Referrer-Policy",
    "no-referrer"
  );

  res.end("Not Found");
}

createServer((req, res) => {
  const host = String(req.headers.host || "").split(":")[0];
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const safePath = normalize(url.pathname)
    .replaceAll("\\", "/")
    .replace(/^(\.\.\/)+/, "");

  const isPublicDomain =
    host === "imai.my" ||
    host === "www.imai.my";


  const isCatalogPath =
    safePath === "/catalog" ||
    safePath.startsWith("/catalog/");

  if (
    isPublicDomain &&
    isCatalogPath
  ) {
    const expectedCatalogKey =
      readCatalogAccessKey();

    const providedCatalogKey =
      String(
        url.searchParams.get("key") || ""
      ).trim();

    if (
      !catalogKeyMatches(
        expectedCatalogKey,
        providedCatalogKey
      )
    ) {
      denyPrivateCatalog(res);
      return;
    }

    res.setHeader(
      "Set-Cookie",
      `imai_catalog_access=${expectedCatalogKey}; Path=/; Max-Age=21600; HttpOnly; Secure; SameSite=Strict`
    );

    res.setHeader(
      "Cache-Control",
      "private, no-store, max-age=0"
    );

    res.setHeader(
      "X-Robots-Tag",
      "noindex, nofollow, noarchive, nosnippet, noimageindex"
    );

    res.setHeader(
      "Referrer-Policy",
      "no-referrer"
    );
  }

  const isCatalogAsset =
    safePath.startsWith(
      "/assets/catalog-page-"
    ) &&
    safePath.endsWith(".js");

  if (
    isPublicDomain &&
    isCatalogAsset
  ) {
    const expectedCatalogKey =
      readCatalogAccessKey();

    const providedCookieKey =
      readRequestCookie(
        req.headers.cookie,
        "imai_catalog_access"
      );

    if (
      !catalogKeyMatches(
        expectedCatalogKey,
        providedCookieKey
      )
    ) {
      denyPrivateCatalog(res);
      return;
    }

    res.setHeader(
      "Cache-Control",
      "private, no-store, max-age=0"
    );

    res.setHeader(
      "X-Robots-Tag",
      "noindex, nofollow, noarchive"
    );

    res.setHeader(
      "Referrer-Policy",
      "no-referrer"
    );
  }

  let filePath = join(root, safePath === "/" ? "index.html" : safePath);

  if (
    isPublicDomain &&
    [
      "/privacy",
      "/terms",
      "/refund-policy",
      "/shipping-policy",
      "/blog",
      "/help",
      "/guides",
      "/guides/whatsapp-bot",
      "/updates",
      "/catalog",
    ].includes(safePath)
  ) {
    filePath = join(root, "index.html");
  }

  if (!existsSync(filePath)) {
    filePath = join(root, "index.html");
  }

  res.setHeader("Content-Type", types[extname(filePath)] || "application/octet-stream");
  createReadStream(filePath).pipe(res);
}).listen(port, "127.0.0.1", () => {
  console.log(`MyPocket web listening on ${port}`);
});
