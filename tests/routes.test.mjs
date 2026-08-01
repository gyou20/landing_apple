import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import test, { after, before } from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const vinextCli = fileURLToPath(new URL("../node_modules/vinext/dist/cli.js", import.meta.url));
let origin = "";
let serverProcess;
let serverOutput = "";
let serverError = "";

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function reservePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

async function waitForServer(url) {
  for (let attempt = 1; attempt <= 80; attempt += 1) {
    if (serverProcess.exitCode !== null) {
      throw new Error(`Route test server exited early.\n${serverOutput}\n${serverError}`);
    }
    try {
      const response = await fetch(`${url}/`, {
        redirect: "manual",
        signal: AbortSignal.timeout(1_000),
      });
      if (response.status === 308) {
        console.info("[routes-test:server-ready]", { attempt, status: response.status, url });
        return;
      }
    } catch {}
    await delay(100);
  }
  throw new Error(`Route test server did not become ready.\n${serverOutput}\n${serverError}`);
}

before(async () => {
  const port = await reservePort();
  origin = `http://localhost:${port}`;
  console.info("[routes-test:server-start]", { origin });
  serverProcess = spawn(process.execPath, [vinextCli, "dev", "--port", String(port)], {
    cwd: projectRoot,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  serverProcess.stdout.setEncoding("utf8");
  serverProcess.stderr.setEncoding("utf8");
  serverProcess.stdout.on("data", (chunk) => { serverOutput += chunk; });
  serverProcess.stderr.on("data", (chunk) => { serverError += chunk; });
  await waitForServer(origin);
});

after(async () => {
  if (!serverProcess) return;
  console.info("[routes-test:server-stop]", { origin });
  if (serverProcess.exitCode === null) serverProcess.kill();
  if (serverProcess.exitCode === null) {
    await Promise.race([once(serverProcess, "exit"), delay(3_000)]);
  }
  if (serverProcess.exitCode === null) serverProcess.kill("SIGKILL");
});

async function render(pathname) {
  return fetch(new URL(pathname, origin), {
    headers: { accept: "text/html" },
    redirect: "manual",
  });
}
test("permanently redirects the root route to /home", async () => {
  const response = await render("/");
  assert.equal(response.status, 308);
  assert.equal(response.headers.get("location"), `${origin}/home`);
});

test("keeps Sections 01 through 06 on /home", async () => {
  const response = await render("/home");
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /data-page-number="01"/);
  assert.match(html, /Section 01/);
  assert.match(html, /Section 06/);
  assert.match(html, /주요 페이지 내비게이션/);
});

test("server-renders numbered Contact and Vlog routes", async () => {
  const [contactResponse, vlogResponse] = await Promise.all([
    render("/contact"),
    render("/vlog"),
  ]);
  const [contactHtml, vlogHtml] = await Promise.all([
    contactResponse.text(),
    vlogResponse.text(),
  ]);

  assert.equal(contactResponse.status, 200);
  assert.match(contactHtml, /data-page-number="02"/);
  assert.match(contactHtml, /움직여야 할 것이/);
  assert.match(contactHtml, /주요 페이지 내비게이션/);

  assert.equal(vlogResponse.status, 200);
  assert.match(vlogHtml, /data-page-number="03"/);
  assert.match(vlogHtml, /생각은 기록될 때/);
  assert.match(vlogHtml, /주요 페이지 내비게이션/);
});

test("contact API rejects cross-origin requests and silently accepts honeypots", async () => {
  const payload = {
    name: "Route Test",
    company: "Aether",
    email: "route-test@example.com",
    inquiryType: "digital",
    budget: "undecided",
    message: "라우트 테스트를 위한 충분히 긴 문의 내용입니다.",
    website: "https://bot.example",
  };
  const rejected = await fetch(new URL("/api/contact", origin), {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://outside.example" },
    body: JSON.stringify(payload),
  });
  assert.equal(rejected.status, 403);

  const accepted = await fetch(new URL("/api/contact", origin), {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify(payload),
  });
  assert.equal(accepted.status, 201);
  assert.deepEqual(await accepted.json(), { accepted: true, id: null });
});