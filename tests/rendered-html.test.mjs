import assert from "node:assert/strict";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Perfect Prairie template", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Perfect Prairie/);
  assert.match(html, /Less lawn/);
  assert.match(html, /On-site consultations/);
  assert.match(html, /Native landscape design \+ installation/);
  assert.match(html, /Prairie \+ wildflower plots/);
  assert.match(html, /Not just flowers/);
  assert.match(html, /Wild by nature/);
  assert.match(html, /The Prairie/);
  assert.match(html, /Portal/);
  assert.ok(html.indexOf('id="field-notes"') < html.indexOf('id="services"'), "Prairie Portal should appear before services");
  assert.match(html, /wildflower-field\.webp/);
  assert.match(html, /bee-on-cornflower\.webp/);
  assert.equal((html.match(/<iframe\b/g) ?? []).length, 3);
  assert.match(html, /pfbid0haCffLQwuyRRrxavxTRG148b59/);
  assert.match(html, /pfbid038Fj6ZSwViBePGszEXrwZkZCVu/);
  assert.match(html, /pfbid02LtCZwCVBZ9UxXzCziJAoWQCC/);
  assert.match(html, /loading="lazy"/);
  assert.doesNotMatch(html, /Emma|Galena|Perfect Prairies/);
  assert.match(html, /Request an estimate/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});
