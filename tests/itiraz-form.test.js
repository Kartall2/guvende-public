// node --test tests/*.test.js   (no dependencies)
const test = require("node:test");
const assert = require("node:assert/strict");
const F = require("../itiraz/itiraz-form.js");

const ok = { number: "0850 123 45 67", reason: "owner", note: "", email: "", website: "" };

test("number: Turkish mobile, landline, 0850 and 444 numbers in every written form; others refused", () => {
  for (const n of ["0850 123 45 67", "+90 850 123 45 67", "905321234567", "05321234567", "5321234567", "(0216) 908-00-98",
    "0090 212 123 45 67", "444 6 255", "4446255", "0800 211 00 00"]) assert.ok(F.validNumber(n), n);
  for (const n of ["", "   ", "112", "186", "0850 123", "+44 7911 123456", "+90 444 6255", "abc 0850", "0850 123 45 67 8",
    "08501234567+", "1".repeat(41), "0123 456 78 90"]) assert.ok(!F.validNumber(n), n);
});

test("e-mail: empty is fine; otherwise plausible and at most 254 characters", () => {
  for (const e of ["", "  ", "ornek@firma.com", "a.b+c@alt.firma.com.tr"]) assert.ok(F.validEmail(e), e);
  for (const e of ["ornek", "ornek@firma", "@firma.com", "a b@firma.com", "x@y.c", `${"a".repeat(250)}@b.co`]) assert.ok(!F.validEmail(e), e);
});

test("note: at most 1000 characters (trimmed)", () => {
  assert.ok(F.validNote("a".repeat(1000)));
  assert.ok(F.validNote("  " + "a".repeat(1000) + "  "));
  assert.ok(!F.validNote("a".repeat(1001)));
});

test("validate: the form's error texts", () => {
  assert.deepEqual(F.validate(ok), { ok: true, errors: {} });
  const bad = F.validate({ ...ok, number: "12", email: "ornek@", note: "a".repeat(1001) });
  assert.equal(bad.ok, false);
  assert.equal(bad.errors.number, "Telefon numarasını kontrol et.");
  assert.equal(bad.errors.email, "E-posta adresini kontrol et.");
  assert.ok(bad.errors.note);
});

test("request body: source web, the number as written (only path that sends it), optional fields only when written", () => {
  assert.deepEqual(F.requestBody(ok), { source: "web", number: "0850 123 45 67", reason: "owner" });
  assert.deepEqual(F.requestBody({ ...ok, reason: "wrong", note: "  Firma hattı.  ", email: " a@b.co " }),
    { source: "web", number: "0850 123 45 67", reason: "wrong", note: "Firma hattı.", email: "a@b.co" });
  assert.equal(F.requestBody({ ...ok, reason: "nonsense" }).reason, "owner");
  const body = F.requestBody(ok);
  assert.ok(!("website" in body) && !("summaryId" in body) && !("isOwner" in body));
});

test("trap field: filled → nothing is sent, the visitor still sees 'sent'", async () => {
  assert.equal(F.requestBody({ ...ok, website: "http://spam" }), null);
  let calls = 0;
  const r = await F.submit({ ...ok, website: "x" }, { endpoint: "https://e", fetchImpl: () => { calls++; } });
  assert.equal(r, "sent");
  assert.equal(calls, 0);
});

test("submit: one POST to the configured endpoint, no credentials; ok → sent, anything else → failed", async () => {
  const seen = [];
  const fetchImpl = (url, init) => { seen.push({ url, init }); return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, result: "ok" }) }); };
  assert.equal(await F.submit({ ...ok, email: "a@b.co" }, { endpoint: "https://x.supabase.co/functions/v1/summary-dispute", fetchImpl }), "sent");
  assert.equal(seen.length, 1);
  assert.equal(seen[0].url, "https://x.supabase.co/functions/v1/summary-dispute");
  assert.equal(seen[0].init.method, "POST");
  assert.equal(seen[0].init.credentials, "omit");
  assert.deepEqual(Object.keys(seen[0].init.headers), ["content-type"]);
  assert.deepEqual(JSON.parse(seen[0].init.body), { source: "web", number: "0850 123 45 67", reason: "owner", email: "a@b.co" });
  for (const answer of [{ ok: false, status: 429, json: () => Promise.resolve({ ok: false }) },
    { ok: false, status: 503, json: () => Promise.reject(new Error("x")) }]) {
    assert.equal(await F.submit(ok, { endpoint: "https://e", fetchImpl: () => Promise.resolve(answer) }), "failed");
  }
  assert.equal(await F.submit(ok, { endpoint: "https://e", fetchImpl: () => Promise.reject(new Error("offline")) }), "failed");
  let calls = 0;
  assert.equal(await F.submit({ ...ok, number: "1" }, { endpoint: "https://e", fetchImpl: () => { calls++; } }), "invalid");
  assert.equal(calls, 0);
});
