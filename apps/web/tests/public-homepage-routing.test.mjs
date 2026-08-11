import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { request } from "node:http";
import { once } from "node:events";
import test from "node:test";

const appRoot = new URL("../", import.meta.url);

async function reservePort() {
  const server = createServer();

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  assert.equal(typeof address, "object");
  const port = address.port;

  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

  return port;
}

async function getPublicHomepage(port) {
  return await new Promise((resolve, reject) => {
    const req = request(
      {
        host: "127.0.0.1",
        port,
        path: "/",
        headers: { Host: "imai.my" },
      },
      (response) => {
        response.setEncoding("utf8");
        let body = "";
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          resolve({ body, status: response.statusCode });
        });
      },
    );

    req.once("error", reject);
    req.end();
  });
}

async function waitForServer(port) {
  const deadline = Date.now() + 5_000;

  while (Date.now() < deadline) {
    try {
      const response = await getPublicHomepage(port);
      if (response.status === 200) return;
    } catch {
      // The child process is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  throw new Error("public web test server did not start");
}

test("imai.my serves the React homepage instead of the legacy landing file", async () => {
  const fixtureRoot = await mkdtemp(join(tmpdir(), "imai-public-home-"));
  const dist = join(fixtureRoot, "dist");
  await mkdir(dist);
  await writeFile(join(dist, "index.html"), "REACT_HOMEPAGE");
  await writeFile(join(dist, "landing.html"), "LEGACY_LANDING");
  const serverSource = await readFile(
    new URL("../server.mjs", import.meta.url),
    "utf8",
  );
  await writeFile(
    join(fixtureRoot, "server.mjs"),
    serverSource.replace('from "node:path"', 'from "node:path/posix"'),
  );

  const port = await reservePort();
  const child = spawn(process.execPath, ["server.mjs"], {
    cwd: fixtureRoot,
    env: { ...process.env, WEB_PORT: String(port) },
    stdio: "ignore",
  });

  try {
    await waitForServer(port);
    const response = await getPublicHomepage(port);

    assert.equal(response.status, 200);
    assert.equal(response.body, "REACT_HOMEPAGE");
  } finally {
    child.kill("SIGTERM");
    await once(child, "exit");
    await rm(fixtureRoot, { force: true, recursive: true });
  }
});
