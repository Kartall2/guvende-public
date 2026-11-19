// node --test tests/*.test.js   (no dependencies)
const test = require("node:test");
const assert = require("node:assert/strict");
const D = require("../admin/disputes.js");

// A tiny element factory standing in for the DOM (admin.js passes its el()).
function h(tag, className, text) {
  const node = { tag, className: className || "", textContent: text === undefined || text === null ? "" : String(text), children: [], dataset: {},
    append(...kids) { kids.filter(Boolean).forEach((k) => this.children.push(k)); } };
  return node;
}
function texts(node) { return [node.textContent, ...node.children.flatMap(texts)].filter(Boolean); }
function find(node, pred) { if (pred(node)) return node; for (const c of node.children) { const f = find(c, pred); if (f) return f; } return null; }
const ui = (extra = {}) => ({ h, badge: (text, tone) => h("span", `badge ${tone}`, text), when: (iso) => `T(${iso})`, selected: null, ...extra });

const web = { id: "d1", createdAt: "2026-11-19T10:00:00Z", source: "web", reason: "owner", status: "open", numberMasked: "0850 ••• •• 23",
  numberRef: "a1b2c3d4e5", suppressed: false, note: "Firma hattımız.", contactEmail: "ornek@firma.com",
  summary: [{ topic: "Yorumlarda: Kargo", line: "Bir kullanıcı kargo için arandığını yazmış.", site: "sikayetvar.com" }] };
const app = { id: "d2", createdAt: "2026-11-19T11:00:00Z", source: "app", reason: "wrong", status: "accepted", numberMasked: null,
  numberRef: "ffeeddcc", suppressed: true, note: null, contactEmail: null, summary: null };

test("list rows: date, source, masked number (or —), reason, status; open count for the menu badge", () => {
  const rows = [web, app, { ...web, id: "d3", status: "rejected", numberMasked: "05321234567" }].map(D.listRow);
  assert.deepEqual(rows.map((r) => [r.source, r.number, r.reason, r.status]), [
    ["Web", "0850 ••• •• 23", "Bu numara bana ya da firmama ait", "Açık"],
    ["Uygulama", "—", "Özet yorumları yanlış aktarıyor", "Kabul"],
    ["Web", "—", "Bu numara bana ya da firmama ait", "Ret"],
  ]);
  // Only a mask is ever shown (the server's rule: ≤ 6 digits and a "•", or a short code).
  for (const bad of ["05321234567", "0532 123 •• 67", "+90 532 <b>", 5]) assert.equal(D.listRow({ ...web, numberMasked: bad }).number, "—", String(bad));
  for (const good of ["444 •• 55", "+447 ••• •• 56", "186"]) assert.equal(D.listRow({ ...web, numberMasked: good }).number, good);
  assert.equal(D.openCount([web, app, { status: "open" }, null]), 2);
  assert.equal(D.openCount(undefined), 0);
  const drawn = D.renderRow(rows[0], ui({ selected: "d1" }));
  assert.equal(drawn.tag, "button");
  assert.match(drawn.className, /selected/);
  assert.deepEqual(texts(drawn), ["0850 ••• •• 23", "Açık", "Bu numara bana ya da firmama ait", "T(2026-11-19T10:00:00Z) · Web"]);
  assert.ok(!texts(drawn).join(" ").includes("ornek@firma.com"), "no e-mail in the list");
});

test("detail: mask, reason, note, e-mail, the summary items, fingerprint's first 8; actions by state", () => {
  const m = D.detailModel(web);
  assert.equal(m.number, "0850 ••• •• 23");
  assert.equal(m.numberRef, "a1b2c3d4");
  assert.deepEqual(m.actions, ["accept", "reject"]);
  const t = texts(D.renderDetail(m, ui({ onAction() {} })));
  for (const s of ["0850 ••• •• 23", "Açık", "Web", "Bu numara bana ya da firmama ait", "ornek@firma.com", "a1b2c3d4", "Firma hattımız.",
    "İlgili özetin şu anki maddeleri", "Yorumlarda: Kargo", "Bir kullanıcı kargo için arandığını yazmış.", "sikayetvar.com",
    "Kabul et ve özeti gizle", "Reddet"]) assert.ok(t.includes(s), s);
  assert.ok(!t.includes("Gizlemeyi kaldır"));

  const a = D.detailModel(app);
  assert.equal(a.number, "Uygulama içi itiraz · özet maddeleri");
  assert.deepEqual(a.actions, ["lift"]);
  const at = texts(D.renderDetail(a, ui({ onAction() {} })));
  for (const s of ["Uygulama içi itiraz · özet maddeleri", "Verilmedi", "Açıklama yazılmamış.", "Gizli", "Gizlemeyi kaldır"]) assert.ok(at.includes(s), s);
  assert.ok(!at.includes("Reddet"));
  assert.equal(D.detailModel({ ...web, status: "open", suppressed: true }).actions.join(","), "accept,reject,lift");
  assert.equal(D.detailModel({ ...web, source: "web", numberMasked: null }).number, "—");
});

test("actions: the in-page dialog first; nothing is sent when it is cancelled", async () => {
  const m = D.detailModel(web);
  const sent = [];
  const deps = (answer) => ({ dialog: (o) => { deps.last = o; return Promise.resolve(answer); }, act: (body, done) => { sent.push([body, done]); return Promise.resolve({ ok: true }); } });
  assert.equal(await D.runAction("accept", m, deps(null)), null);
  assert.equal(sent.length, 0);
  assert.equal(deps.last.title, "Kabul et ve özeti gizle");
  assert.equal(deps.last.value, "0850 ••• •• 23");
  assert.equal(deps.last.warn, true);
  assert.ok(!("danger" in deps.last), "no red dialog button");
  assert.deepEqual(await D.runAction("accept", m, deps({ reason: null, note: "" })), { ok: true });
  assert.deepEqual(sent[0][0], { action: "summaryDisputeDecide", id: "d1", decision: "accept" });
  await D.runAction("reject", m, deps({}));
  assert.deepEqual(sent[1][0], { action: "summaryDisputeDecide", id: "d1", decision: "reject" });
  // Not offered in this state → no dialog, nothing sent.
  let asked = false;
  assert.equal(await D.runAction("lift", m, { dialog: () => { asked = true; return Promise.resolve({}); }, act: () => sent.push("x") }), null);
  assert.equal(asked, false);
  await D.runAction("lift", D.detailModel(app), deps({}));
  assert.deepEqual(sent[2][0], { action: "summarySuppressionRemove", id: "d2" });
  // The button in the drawing calls back with its kind.
  const kinds = [];
  const box = D.renderDetail(m, ui({ onAction: (k) => kinds.push(k) }));
  find(box, (n) => n.dataset.action === "reject").onclick();
  assert.deepEqual(kinds, ["reject"]);
});

test("admin.js uses the panel's own dialog, never the browser's confirm/alert", () => {
  const src = require("node:fs").readFileSync(require("node:path").join(__dirname, "..", "admin", "admin.js"), "utf8");
  assert.ok(!/\b(window\.)?confirm\(|\balert\(/.test(src.replace(/dialog-|confirmBox|o\.confirm|confirmLabel/g, "")));
  assert.match(src, /D\.runAction\(kind, model, \{ dialog: dialog, act: act \}\)/);
  assert.match(src, /\{ id: "disputes", label: "Özet itirazları", icon: "flag"/);
});

test("dialog: the mask line only when there is a mask", () => {
  assert.equal(D.confirmOptions("accept", D.detailModel(web)).value, "0850 ••• •• 23");
  assert.equal(D.confirmOptions("lift", D.detailModel(app)).value, null);
});

test("Görev 7: no red in the dispute tab — accept and the menu badge use the panel's --warn", () => {
  const fs = require("node:fs"), path = require("node:path");
  const css = fs.readFileSync(path.join(__dirname, "..", "admin", "admin.css"), "utf8");
  const js = fs.readFileSync(path.join(__dirname, "..", "admin", "admin.js"), "utf8");
  const box = D.renderDetail(D.detailModel(web), ui({ onAction() {} }));
  assert.equal(find(box, (n) => n.dataset.action === "accept").className, "btn warn solid");
  assert.ok(!JSON.stringify(texts(box)).includes("danger"));
  assert.ok(!/danger/.test(fs.readFileSync(path.join(__dirname, "..", "admin", "disputes.js"), "utf8").replace(/\/\/.*$/gm, "")));
  assert.match(js, /el\("span", "count warn", state\.disputesOpen\)/);
  assert.match(js, /o\.warn \? "warn solid"/);
  assert.match(css, /\.btn\.warn\.solid \{ background: var\(--warn\); color: #fff;/);
  assert.match(css, /\.count\.warn \{ background: var\(--warn\); color: #fff; \}/);
  assert.match(css, /--warn: #c2570c;/);
  // white on --warn #C2570C ≥ 4.5:1 (and on the pressed #A44A06)
  const lum = (h) => h.match(/../g).map((x) => parseInt(x, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    .reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
  for (const bg of ["c2570c", "a44a06"]) assert.ok(1.05 / (lum(bg) + 0.05) >= 4.5, bg);
});

test("Görev 7: phones — the tab bar is one scrolling row; the chosen tab is scrolled into view", () => {
  const fs = require("node:fs"), path = require("node:path");
  const css = fs.readFileSync(path.join(__dirname, "..", "admin", "admin.css"), "utf8");
  const js = fs.readFileSync(path.join(__dirname, "..", "admin", "admin.js"), "utf8");
  assert.match(css, /\.tabbar \{ display: flex; gap: 2px; overflow-x: auto;/);
  assert.match(css, /\.tabbar button \{ flex: 0 0 auto; min-width: 78px; min-height: 52px; white-space: nowrap;/);
  assert.ok(!/grid-template-columns: repeat\(4, 1fr\); position: fixed/.test(css));
  assert.match(js, /bar\.scrollLeft = Math\.max\(0, active\.offsetLeft/);
});
