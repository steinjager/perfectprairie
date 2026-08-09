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

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  return (await import(workerUrl.href)).default;
}

test("server-renders the Perfect Prairie template", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Perfect Prairie/);
  assert.match(html, /images\/perfect-prairie-logo\.png/);
  assert.match(html, /Less lawn/);
  assert.match(html, /On-site consultations/);
  assert.match(html, /Native landscape design \+ installation/);
  assert.match(html, /Prairie \+ wildflower plots/);
  assert.match(html, /Not just flowers/);
  assert.match(html, /Wild by nature/);
  assert.match(html, /Rewild the ordinary/);
  assert.match(html, /Make room for life/);
  assert.doesNotMatch(html, /hero-whispers|hero-script|hero-bloom/);
  assert.match(html, /Follow the prairie/);
  assert.match(html, /Follow Perfect Prairie/);
  assert.doesNotMatch(html, /Portal|portal/);
  assert.ok(html.indexOf('id="field-notes"') > html.indexOf('id="estimate"'), "Facebook follow section should appear near the bottom, after contact");
  assert.match(html, /href="#prairie-story">Gallery/);
  assert.doesNotMatch(html, />Facebook<\/a>\s*<a href="#services"/);
  assert.match(html, /Consultations/);
  assert.doesNotMatch(html, /Consult the land/);
  assert.doesNotMatch(html, /[Nn]ew construction/);
  assert.match(html, /Empty lots/);
  assert.match(html, /wildflower-drive\.webp/);
  assert.match(html, /curbside-monarch-waystation\.jpg/);
  assert.match(html, /cosmos-field\.webp/);
  assert.match(html, /central-illinois-pollinator-garden\.jpg/);
  assert.match(html, /school-wildflower-garden\.jpg/);
  assert.match(html, /A schoolyard blooming with joy/);
  assert.match(html, /everyday happiness to the kids/);
  assert.doesNotMatch(html, /Imagine the curb alive/);
  assert.doesNotMatch(html, /founder-in-the-field\.jpg/);
  assert.match(html, /wildflower-field\.webp/);
  assert.match(html, /bee-on-cornflower\.webp/);
  assert.equal((html.match(/<iframe\b/g) ?? []).length, 5);
  assert.match(html, /pfbid0haCffLQwuyRRrxavxTRG148b59/);
  assert.match(html, /pfbid038Fj6ZSwViBePGszEXrwZkZCVu/);
  assert.match(html, /pfbid02LtCZwCVBZ9UxXzCziJAoWQCC/);
  assert.match(html, /pfbid02r2Z6z6GrrpwsJoFzneeCk1mGD3/);
  assert.match(html, /pfbid02cEorhxMGQn19HWtYUnefyRLDy/);
  assert.match(html, /loading="lazy"/);
  assert.doesNotMatch(html, /Emma|Galena|Perfect Prairies/);
  assert.match(html, /Request an estimate/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});

test("inquiries address both Perfect Prairie inboxes", async () => {
  const originalFetch = globalThis.fetch;
  const originalWebhookUrl = process.env.CONTACT_WEBHOOK_URL;
  let delivery;

  process.env.CONTACT_WEBHOOK_URL = "https://webhook.example/perfect-prairie";
  const worker = await loadWorker();

  globalThis.fetch = async (request, init) => {
    const url = typeof request === "string" ? request : request.url;
    if (url === "https://webhook.example/perfect-prairie") {
      delivery = JSON.parse(String(init?.body));
      return new Response(null, { status: 204 });
    }
    return originalFetch(request, init);
  };

  try {
    const response = await worker.fetch(
      new Request("http://localhost/api/inquiry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          firstName: "Prairie",
          lastName: "Friend",
          email: "friend@example.com",
          location: "Central Illinois",
          message: "Please help us plant more habitat.",
        }),
      }),
      {
        ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
      },
      { waitUntil() {}, passThroughOnException() {} },
    );

    assert.equal(response.status, 200);
    assert.deepEqual(delivery.recipients, ["emmahowerter@gmail.com", "contact@perfectprairie.com"]);
    assert.equal(delivery.to, "emmahowerter@gmail.com, contact@perfectprairie.com");
    assert.equal(delivery.replyTo, "friend@example.com");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalWebhookUrl === undefined) delete process.env.CONTACT_WEBHOOK_URL;
    else process.env.CONTACT_WEBHOOK_URL = originalWebhookUrl;
  }
});
