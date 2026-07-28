import assert from "node:assert/strict";
import test from "node:test";

async function render(pathname) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("routes-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      passThroughOnException() {},
      waitUntil() {},
    },
  );
}

test("permanently redirects the root route to /home", async () => {
  const response = await render("/");
  assert.equal(response.status, 308);
  assert.equal(response.headers.get("location"), "http://localhost/home");
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
