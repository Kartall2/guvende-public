// Özet itirazları (1.1 Görev 6): what the panel draws for AI summary disputes,
// and the confirm-then-act flow. No DOM of its own: drawing goes through the
// element factory h(tag, className, text) the caller gives (admin.js: el()),
// so tests/disputes.test.js (node --test) can draw with a fake one.
// The number is only ever the server's display mask ("0850 ••• •• 23").
(function (root) {
  var L = {
    source: { app: "Uygulama", web: "Web" },
    reason: { owner: "Bu numara bana ya da firmama ait", unrelated: "Yorumlar bu numarayla ilgili değil",
      wrong: "Özet yorumları yanlış aktarıyor", other: "Başka bir neden" },
    status: { open: "Açık", accepted: "Kabul", rejected: "Ret" },
    tone: { open: "warn", accepted: "green", rejected: "" }
  };
  var APP_NO_NUMBER = "Uygulama içi itiraz · özet maddeleri";
  // Same rule as the server (number_mask.ts isMaskedNumber): at most 6 digits and
  // a "•", or a 3–4 digit short code; anything else is not shown.
  var MASK = /^[0-9+ •]{3,24}$/;
  function mask(value) {
    if (typeof value !== "string" || !MASK.test(value)) return null;
    var digits = value.replace(/[^0-9]/g, "").length;
    return digits <= 6 && (value.indexOf("•") >= 0 || (/^[0-9]{3,4}$/.test(value))) ? value : null;
  }

  function listRow(d) {
    return { id: d.id, createdAt: d.createdAt, source: L.source[d.source] || d.source, number: mask(d.numberMasked) || "—",
      reason: L.reason[d.reason] || d.reason, status: L.status[d.status] || d.status, tone: L.tone[d.status] || "",
      suppressed: d.suppressed === true };
  }
  function openCount(list) { return (Array.isArray(list) ? list : []).filter(function (d) { return d && d.status === "open"; }).length; }

  function detailModel(d) {
    var number = mask(d.numberMasked) || (d.source === "app" ? APP_NO_NUMBER : "—");
    var items = (Array.isArray(d.summary) ? d.summary : []).filter(function (i) { return i && typeof i.line === "string"; })
      .map(function (i) { return { topic: String(i.topic || ""), line: i.line, site: i.site ? String(i.site) : "" }; });
    var actions = [];
    if (d.status === "open") actions.push("accept", "reject");
    if (d.suppressed === true) actions.push("lift");
    return { id: d.id, number: number, hasNumber: !!mask(d.numberMasked), source: L.source[d.source] || d.source,
      reason: L.reason[d.reason] || d.reason, status: L.status[d.status] || d.status, tone: L.tone[d.status] || "",
      note: d.note || "", email: d.contactEmail || "", items: items, numberRef: String(d.numberRef || "").slice(0, 8),
      suppressed: d.suppressed === true, createdAt: d.createdAt, resolvedAt: d.resolvedAt || null, actions: actions };
  }

  var ACTIONS = {
    accept: { label: "Kabul et ve özeti gizle", ok: "Kabul et ve gizle", warn: true,
      text: "İtiraz kapanır ve bu numaranın yapay zekâ özeti uygulamada artık gösterilmez (önbellekte olsa bile). Sonra “Gizlemeyi kaldır” ile geri açabilirsin.",
      body: function (id) { return { action: "summaryDisputeDecide", id: id, decision: "accept" }; }, done: "İtiraz kabul edildi; özet gizlendi." },
    reject: { label: "Reddet", ok: "Reddet", warn: false,
      text: "İtiraz kapanır; özet görünmeye devam eder.",
      body: function (id) { return { action: "summaryDisputeDecide", id: id, decision: "reject" }; }, done: "İtiraz reddedildi." },
    lift: { label: "Gizlemeyi kaldır", ok: "Gizlemeyi kaldır", warn: false,
      text: "Bu numaranın yapay zekâ özeti yeniden gösterilebilir.",
      body: function (id) { return { action: "summarySuppressionRemove", id: id }; }, done: "Gizleme kaldırıldı." }
  };
  // Options for the panel's own in-page dialog (never the browser's confirm()).
  function confirmOptions(kind, model) {
    var a = ACTIONS[kind];
    // The number line only when there is a mask (an app dispute has none).
    return { title: a.label, text: a.text, value: model.hasNumber ? model.number : null, ok: a.ok, warn: a.warn };
  }
  // Ask first; only a confirmed dialog reaches the API. → the API answer, or null.
  async function runAction(kind, model, deps) {
    if (!ACTIONS[kind] || model.actions.indexOf(kind) < 0) return null;
    var answer = await deps.dialog(confirmOptions(kind, model));
    if (!answer) return null;
    return deps.act(ACTIONS[kind].body(model.id), ACTIONS[kind].done);
  }

  // ---- drawing (h = element factory, when = date text, badge = badge factory) ----
  function renderRow(row, ui) {
    var h = ui.h;
    var b = h("button", "list-row dispute-row" + (row.id === ui.selected ? " selected" : "")); b.type = "button";
    b.dataset.id = row.id;
    var top = h("div", "row-top");
    top.append(h("strong", "dispute-number", row.number), ui.badge(row.status, row.tone));
    var meta = h("span", "muted small", ui.when(row.createdAt) + " · " + row.source + (row.suppressed ? " · özet gizli" : ""));
    b.append(top, h("span", "dispute-reason", row.reason), meta);
    return b;
  }
  function renderDetail(model, ui) {
    var h = ui.h, box = h("div", "dispute-detail");
    var top = h("div", "row-top");
    top.append(h("h3", model.hasNumber ? "dispute-number" : "dispute-number app", model.number), ui.badge(model.status, model.tone));
    var facts = h("div", "support-facts");
    [["Kaynak", model.source], ["Neden", model.reason], ["Gönderildi", ui.when(model.createdAt)],
      ["E-posta", model.email || "Verilmedi"], ["Parmak izi", model.numberRef || "—"],
      ["Özet", model.suppressed ? "Gizli" : "Görünüyor"]].forEach(function (f) {
      var fact = h("div", "support-fact"); fact.append(h("span", "muted small", f[0]), h("strong", null, f[1])); facts.append(fact);
    });
    var note = h("div", "support-message", model.note || "Açıklama yazılmamış.");
    var summary = h("section", "dispute-summary");
    summary.append(h("h4", null, "İlgili özetin şu anki maddeleri"));
    if (!model.items.length) summary.append(h("p", "muted small", "Önbellekte bu numaranın özeti yok (süresi dolmuş ya da gizli olabilir)."));
    model.items.forEach(function (i) {
      var item = h("div", "dispute-item");
      if (i.topic) item.append(h("span", "dispute-topic", i.topic));
      item.append(h("p", null, i.line));
      if (i.site) item.append(h("span", "muted small", i.site));
      summary.append(item);
    });
    var actions = h("div", "actions");
    model.actions.forEach(function (kind) {
      // No red (not in the palette): accept uses the panel's warning colour --warn.
      var b = h("button", "btn " + (kind === "accept" ? "warn solid" : "ghost"), ACTIONS[kind].label); b.type = "button";
      b.dataset.action = kind; b.onclick = function () { ui.onAction(kind); };
      actions.append(b);
    });
    box.append(top, facts, note, summary, actions);
    return box;
  }

  var api = { L: L, APP_NO_NUMBER: APP_NO_NUMBER, ACTIONS: ACTIONS, listRow: listRow, openCount: openCount,
    detailModel: detailModel, confirmOptions: confirmOptions, runAction: runAction, renderRow: renderRow, renderDetail: renderDetail };
  root.GVD_DISPUTES = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
