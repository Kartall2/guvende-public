// Güvende admin panel. The page holds no secret and no data: every call goes
// to the admin-api function, which accepts only an MFA (aal2) session of a
// user on the admin list. Text from the server is always set as textContent.
(function () {
  "use strict";
  // ?env=sandbox works only where a local config defines the test project.
  var envName = new URLSearchParams(location.search).get("env") === "sandbox" && window.GVD_ADMIN_CONFIG.sandbox
    ? "sandbox" : "production";
  var env = window.GVD_ADMIN_CONFIG[envName];
  var client = window.supabase.createClient(env.url, env.publishableKey, {
    auth: { flowType: "implicit", detectSessionInUrl: true, persistSession: true, storageKey: "gvd-admin-" + envName }
  });
  var templates = window.GVD_ALERT_TEMPLATES || [];

  var L = {
    kind: { phone: "Telefon", link: "Bağlantı", sms: "SMS", iban: "IBAN", email: "E-posta" },
    category: { fraud: "Dolandırıcılık", phishing: "Oltalama", fake_cargo: "Sahte kargo", fake_bank: "Sahte banka",
      fake_shopping: "Sahte alışveriş/ilan", impersonation: "Kurum/kişi taklidi", other: "Diğer" },
    severity: { info: "Bilgi", attention: "Dikkat", high: "Yüksek risk" },
    reason: { insufficient: "Yetersiz bilgi", personal_data: "Kişisel veri içeriyor", false_claim: "Yanlış/asılsız",
      duplicate: "Tekrar", spam: "Spam", other: "Diğer", approval_revoked: "Onay geri alındı" },
    action: { report_approve: "Bildirim onaylandı", report_reject: "Bildirim reddedildi",
      report_owner_confirm: "Sahibi doğruladı", report_revoke: "Onay geri alındı", report_reopen: "Yeniden incelemeye alındı",
      alert_publish: "Uyarı yayınlandı", alert_withdraw: "Uyarı geri çekildi", alert_push: "Push gönderildi",
      alert_update: "Uyarı düzenlendi", alert_draft_save: "Taslak kaydedildi", alert_draft_delete: "Taslak silindi", admin_login: "Yönetici girişi",
      registry_create: "Resmî numara eklendi", registry_reverify: "Resmî numara yeniden doğrulandı",
      registry_disable: "Resmî numara devre dışı bırakıldı",
      domain_registry_create: "Resmî alan adı eklendi", domain_registry_reverify: "Resmî alan adı yeniden doğrulandı",
      domain_registry_disable: "Resmî alan adı devre dışı bırakıldı",
      version_policy_update: "Sürüm ayarı değiştirildi", support_answered: "Destek mesajı yanıtlandı" },
    supportTopic: { bug: "Hata", confused: "Anlamadım", billing: "Abonelik / ödeme", idea: "Öneri" },
    registryStatus: { active: "Aktif", needs_review: "İncelenmeli", inactive: "Devre dışı", superseded: "Birleştirildi" },
    registryLine: { shared: "Ortak numara", operatorOnly: "Operatör hattı" }
  };

  // Static icon paths (24×24, stroke).
  var ICONS = {
    summary: '<path d="M4 13h4v7H4zM10 9h4v11h-4zM16 4h4v16h-4z"/>',
    registry: '<path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z"/><path d="M9 12l2 2 4-4"/>',
    update: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 19h14"/>',
    domains: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z"/>',
    reports: '<path d="M4 5h16v11H8l-4 4z"/><path d="M8 9h8M8 12h5"/>',
    alerts: '<path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    audit: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 12h7M9 16h7"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
    warn: '<path d="M12 3 2 20h20z"/><path d="M12 9v5M12 17h.01"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>',
    check: '<path d="m5 12 4 4 10-10"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    phone: '<path d="M5 4h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    users: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M16 4a3 3 0 0 1 0 6M21 20a6 6 0 0 0-4-5.6"/>',
    device: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
    inbox: '<path d="M3 13h5l1 3h6l1-3h5"/><path d="M5 5h14l2 8v6H3v-6z"/>',
    support: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>'
  };
  function icon(name) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("fill", "none"); svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.8"); svg.setAttribute("stroke-linecap", "round"); svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = ICONS[name] || ""; // static markup only
    return svg;
  }

  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }
  function add(parent) { for (var i = 1; i < arguments.length; i++) if (arguments[i]) parent.append(arguments[i]); return parent; }
  function button(label, cls, onClick, iconName) {
    var b = el("button", "btn " + (cls || "ghost"));
    if (iconName) b.append(icon(iconName));
    b.append(document.createTextNode(label));
    b.type = "button"; b.onclick = onClick;
    return b;
  }
  function when(iso) { return iso ? new Date(iso).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" }) : "—"; }
  function day(iso) { return iso ? new Date(iso + (iso.length === 10 ? "T12:00:00" : "")).toLocaleDateString("tr-TR", { dateStyle: "medium" }) : "—"; }
  function badge(text, tone) { return el("span", "badge " + (tone || ""), text); }
  function toast(text) {
    var t = $("toast"); t.textContent = text; t.hidden = false;
    clearTimeout(toast.timer); toast.timer = setTimeout(function () { t.hidden = true; }, 3200);
  }
  function empty(iconName, title, text) {
    var box = el("div", "empty"); box.append(icon(iconName), el("strong", null, title));
    if (text) box.append(el("span", null, text));
    return box;
  }
  function skeleton(kind) {
    var wrap = el("div", "grid " + (kind === "kpis" ? "kpis" : ""));
    for (var i = 0; i < (kind === "kpis" ? 6 : 3); i++) {
      var c = el("div", "card");
      if (kind === "kpis") add(c, el("div", "skeleton sk-line"), el("div", "skeleton sk-line"));
      else add(c, el("div", "skeleton sk-line"), el("div", "skeleton sk-block"));
      wrap.append(c);
    }
    return wrap;
  }

  // Values as people write them.
  function formatValue(kind, value) {
    if (kind === "phone" && /^\d{10}$/.test(value)) {
      return "0" + value.slice(0, 3) + " " + value.slice(3, 6) + " " + value.slice(6, 8) + " " + value.slice(8);
    }
    if (kind === "iban") return value.replace(/(.{4})/g, "$1 ").trim();
    return value;
  }
  function googleLink(kind, value) {
    var a = el("a", "btn subtle small");
    a.href = "https://www.google.com/search?q=" + encodeURIComponent('"' + formatValue(kind, value) + '"');
    a.target = "_blank"; a.rel = "noopener noreferrer";
    a.append(icon("search"), document.createTextNode("Google'da ara"));
    return a;
  }

  // Personal data in the description: a heuristic warning, never an automatic decision.
  function luhn(digits) {
    var sum = 0, alt = false;
    for (var i = digits.length - 1; i >= 0; i--) {
      var n = +digits[i]; if (alt) { n *= 2; if (n > 9) n -= 9; } sum += n; alt = !alt;
    }
    return sum % 10 === 0;
  }
  function tcValid(s) {
    if (!/^[1-9]\d{10}$/.test(s)) return false;
    var d = s.split("").map(Number);
    var odd = d[0] + d[2] + d[4] + d[6] + d[8], even = d[1] + d[3] + d[5] + d[7];
    return ((odd * 7 - even) % 10 + 10) % 10 === d[9] && (d.slice(0, 10).reduce(function (a, b) { return a + b; }, 0) % 10) === d[10];
  }
  var notNames = /^(Banka|Bankası|Bank|Kargo|Kargom|Telekom|Turkcell|Vodafone|Emniyet|Savcılık|Polis|Jandarma|Devlet|Bakanlığı|Müdürlüğü|Başkanlığı|Merkezi|Sahibinden|Trendyol|Hepsiburada|Whatsapp|WhatsApp|Instagram|Google|Türkiye|İstanbul|Ankara|İzmir|Hizmetleri|Müşteri|Kart|Kredi)$/;
  function piiFlags(text) {
    var flags = [], t = text || "";
    var iban = /\bTR\s?\d{2}(?:\s?\d{4}){5}\s?\d{2}\b/gi;
    // IBAN digits must not count as a card or ID number.
    var rest = t.replace(iban, " ");
    (rest.match(/\b[1-9]\d{10}\b/g) || []).some(tcValid) && flags.push("TC kimlik no");
    (rest.match(/(?:\d[ -]?){13,19}/g) || []).some(function (m) { var d = m.replace(/\D/g, ""); return d.length >= 13 && d.length <= 19 && luhn(d); }) && flags.push("kart numarası");
    /\bTR\s?\d{2}(?:\s?\d{4}){5}\s?\d{2}\b/i.test(t) && flags.push("IBAN");
    /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(t) && flags.push("e-posta");
    /(?:\+?90|0)?\s?5\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}\b/.test(t) && flags.push("telefon numarası");
    var names = t.match(/\b[A-ZÇĞİÖŞÜ][a-zçğıöşü]{2,}\s+[A-ZÇĞİÖŞÜ][a-zçğıöşü]{2,}\b/g) || [];
    names.some(function (n) { return n.split(/\s+/).every(function (w) { return !notNames.test(w); }); }) && flags.push("ad-soyad");
    return flags;
  }

  // ---------- API ----------
  async function api(body) {
    var session = (await client.auth.getSession()).data.session;
    if (!session) throw new Error("Oturum yok");
    var response = await fetch(env.url + "/functions/v1/admin-api", {
      method: "POST",
      headers: { "content-type": "application/json", apikey: env.publishableKey, authorization: "Bearer " + session.access_token },
      body: JSON.stringify(body)
    });
    var data = await response.json().catch(function () { return {}; });
    if (response.status === 403) throw new Error("Yetki yok");
    if (!response.ok) throw new Error(data.result || "Hata");
    return data;
  }
  var refusals = { not_pending: "Bu bildirim artık beklemede değil.", not_approved: "Bildirim onaylı değil.",
    not_rejected: "Bildirim reddedilmiş değil.", not_found: "Kayıt bulunamadı.", invalid: "Bilgiler eksik ya da hatalı.",
    push_limit: "Son 24 saatte 2 push gönderildi; şimdilik push gönderilemez. Uyarıyı pushsuz yayınlayabilirsin." };
  async function act(body, success) {
    try {
      var r = await api(body);
      if (r.ok === false) { toast(refusals[r.result] || "İşlem yapılamadı."); return null; }
      if (success) toast(success);
      return r;
    } catch (e) { toast(e.message === "Yetki yok" ? "Bu hesabın yönetici yetkisi yok." : "İşlem yapılamadı."); return null; }
  }

  // ---------- dialog ----------
  // options: title, text, value, reasons (bool), note ("required" | "optional"), noteLabel, ok, danger
  function dialog(o) {
    return new Promise(function (resolve) {
      $("dialog-title").textContent = o.title; $("dialog-text").textContent = o.text || ""; $("dialog-note").textContent = "";
      var body = $("dialog-body"); body.replaceChildren();
      if (o.value) body.append(el("p", "value", o.value));
      if (o.warning) add(body, banner("risk", o.warning));
      var picked = null;
      if (o.reasons) {
        var list = el("div", "reasons");
        Object.keys(L.reason).filter(function (k) { return k !== "approval_revoked"; }).forEach(function (k) {
          var label = el("label"), input = el("input");
          input.type = "radio"; input.name = "reason"; input.value = k;
          input.onchange = function () { picked = k; };
          label.append(input, document.createTextNode(L.reason[k])); list.append(label);
        });
        body.append(list);
      }
      var note = null;
      if (o.note) {
        var field = el("label", "field", o.noteLabel || "Not");
        note = el("textarea"); note.maxLength = 500; note.rows = 3; field.append(note); body.append(field);
      }
      // A required confirmation box (e.g. "security alert, not promotion").
      var confirmBox = null;
      if (o.confirm) {
        var confirmLabel = el("label", "check"); confirmBox = el("input"); confirmBox.type = "checkbox";
        confirmLabel.append(confirmBox, document.createTextNode(o.confirm)); body.append(confirmLabel);
      }
      $("dialog-ok").textContent = o.ok || "Onayla";
      $("dialog-ok").className = "btn " + (o.danger ? "danger solid" : "primary");
      $("dialog").hidden = false;
      var done = function (v) { $("dialog").hidden = true; $("dialog-ok").onclick = $("dialog-cancel").onclick = null; resolve(v); };
      $("dialog-cancel").onclick = function () { done(null); };
      $("dialog-ok").onclick = function () {
        var text = note ? note.value.trim() : "";
        if (o.reasons && !picked) { $("dialog-note").textContent = "Bir sebep seç."; return; }
        if (confirmBox && !confirmBox.checked) { $("dialog-note").textContent = "Göndermek için kutuyu işaretle."; return; }
        if ((o.note === "required" || picked === "other") && text.length < 3) { $("dialog-note").textContent = "Kısa bir açıklama yaz (en az 3 karakter)."; return; }
        done({ reason: picked, note: text });
      };
    });
  }
  function banner(tone, text, iconName) {
    var b = el("div", "banner " + tone); b.append(icon(iconName || "warn"), el("span", null, text)); return b;
  }

  // ---------- auth ----------
  function show(id) { ["login", "mfa", "panel"].forEach(function (s) { $(s).hidden = s !== id; }); }
  document.querySelectorAll("[data-env]").forEach(function (n) {
    var compact = n.classList.contains("compact");
    n.textContent = envName === "sandbox" ? (compact ? "Sandbox" : "Sandbox (test) ortamı") : (compact ? "Canlı" : "Canlı ortam");
    if (envName === "sandbox") n.classList.add("sandbox");
  });
  async function route() {
    var session = (await client.auth.getSession()).data.session;
    if (!session) return show("login");
    var aal = (await client.auth.mfa.getAuthenticatorAssuranceLevel()).data;
    if (!aal || aal.currentLevel !== "aal2") return startMFA();
    show("panel");
    go(location.hash.replace("#", "") || "summary");
  }
  $("sign-in").onclick = async function () {
    $("sign-in").disabled = true;
    var result = await client.auth.signInWithPassword({ email: $("email").value.trim(), password: $("password").value });
    $("password").value = ""; $("sign-in").disabled = false;
    if (result.error) { $("login-note").textContent = "Giriş yapılamadı."; return; }
    $("login-note").textContent = ""; route();
  };
  var factorID = null;
  async function startMFA() {
    show("mfa");
    var factors = (await client.auth.mfa.listFactors()).data;
    var verified = factors && factors.totp && factors.totp.find(function (f) { return f.status === "verified"; });
    if (verified) { factorID = verified.id; $("enroll").hidden = true; return; }
    var enrolled = await client.auth.mfa.enroll({ factorType: "totp", friendlyName: "Güvende yönetim" });
    if (enrolled.error) { $("mfa-note").textContent = "Doğrulama kurulamadı."; return; }
    factorID = enrolled.data.id; $("qr").src = enrolled.data.totp.qr_code;
    $("totp-secret").textContent = enrolled.data.totp.secret; $("enroll").hidden = false;
  }
  $("verify").onclick = async function () {
    var result = await client.auth.mfa.challengeAndVerify({ factorId: factorID, code: $("code").value.trim() });
    if (result.error) { $("mfa-note").textContent = "Kod doğrulanamadı."; return; }
    $("code").value = ""; route();
  };
  $("sign-out").onclick = async function () { await client.auth.signOut(); show("login"); };

  // ---------- navigation ----------
  var VIEWS = [
    { id: "summary", label: "Özet", icon: "summary", sub: "Son 7 günün durumu" },
    { id: "reports", label: "Bildirimler", icon: "reports", sub: "Kullanıcı bildirimlerini incele" },
    { id: "alerts", label: "Uyarılar", icon: "alerts", sub: "Uygulamadaki uyarılar ve push bildirimleri" },
    { id: "registry", label: "Resmî numaralar", icon: "registry", sub: "Kurumların resmî numaraları; incelenmesi gerekenler üstte" },
    { id: "domains", label: "Resmî alan adları", icon: "domains", sub: "Kurumların resmî siteleri; incelenmesi gerekenler üstte" },
    { id: "update", label: "Güncelleme", icon: "update", sub: "Uygulamanın güncelleme ekranı (1.0.2 ve sonrası)" },
    { id: "support", label: "Destek", icon: "support", sub: "Uygulamadaki \u201cBize yaz\u201d mesajları (1.0.3 ve sonrası)" },
    { id: "audit", label: "Kayıtlar", icon: "audit", sub: "Yönetici işlemlerinin denetim kaydı" }
  ];
  var state = { view: "summary", reportTab: "pending", pending: 0, auditFilter: "", editor: null, pushReady: false,
    supportNew: 0, supportStatus: "new", supportTopic: "", supportSelected: null };
  function buildNav() {
    [["nav", ""], ["tabbar", ""]].forEach(function (pair) {
      var host = $(pair[0]); host.replaceChildren();
      VIEWS.forEach(function (v) {
        var b = el("button"); b.type = "button"; b.dataset.view = v.id;
        b.append(icon(v.icon), el("span", null, v.label));
        if (v.id === "reports" && state.pending > 0) b.append(el("span", "count", state.pending));
        if (v.id === "support" && state.supportNew > 0) b.append(el("span", "count", state.supportNew));
        if (v.id === state.view) b.classList.add("active");
        b.onclick = function () { go(v.id); };
        host.append(b);
      });
    });
  }
  $("refresh").append(icon("refresh"));
  $("refresh").onclick = function () { go(state.view); };
  function go(view) {
    var v = VIEWS.find(function (x) { return x.id === view; }) || VIEWS[0];
    state.view = v.id; history.replaceState(null, "", "#" + v.id);
    $("view-title").textContent = v.label; $("view-sub").textContent = v.sub;
    buildNav();
    ({ summary: viewSummary, reports: viewReports, alerts: viewAlerts, registry: viewRegistry, domains: viewDomains,
      update: viewUpdate, support: viewSupport, audit: viewAudit })[v.id]();
    refreshSupportBadge();
  }
  function content() { var c = $("content"); c.replaceChildren(); return c; }

  // ---------- Özet ----------
  async function viewSummary() {
    var c = content(); c.append(skeleton("kpis"));
    var data, users = null;
    try {
      var both = await Promise.all([api({ action: "summary" }), api({ action: "users" }).catch(function () { return null; })]);
      data = both[0]; users = both[1] && both[1].users;
    } catch (e) { c.replaceChildren(failed(e)); return; }
    if (state.view !== "summary") return;
    var s = data.summary; state.pending = s.pendingReports; state.pushReady = data.pushReady; buildNav();
    var grid = el("div", "grid kpis");
    function kpi(label, iconName, value, foot, onClick) {
      var k = el("div", "card kpi" + (onClick ? " link" : ""));
      var l = el("div", "label"); l.append(icon(iconName), el("span", null, label));
      add(k, l, el("div", "num", value), foot ? el("div", "foot", foot) : null);
      if (onClick) k.onclick = onClick;
      return k;
    }
    var week = kpi("Son 7 gün araştırma", "summary", s.researches7d, null);
    week.classList.add("wide");
    var max = Math.max.apply(null, s.daily.map(function (d) { return d.count; }).concat([1]));
    var bars = el("div", "bars"), labels = el("div", "bar-labels");
    s.daily.forEach(function (d, i) {
      var bar = el("div", "bar" + (i === s.daily.length - 1 ? " today" : ""));
      bar.style.height = Math.max(4, Math.round(d.count / max * 100)) + "%";
      bar.title = day(d.day) + ": " + d.count;
      bars.append(bar);
      labels.append(el("span", null, new Date(d.day + "T12:00:00").toLocaleDateString("tr-TR", { weekday: "short" })));
    });
    add(week, bars, labels);
    add(grid,
      kpi("Bugün araştırma", "search", s.researchesToday, "İstanbul saatiyle bugün"),
      week,
      kpi("Bekleyen bildirim", "reports", s.pendingReports, s.pendingValues + " farklı değer", function () { go("reports"); }),
      kpi("Aktif abone", "users", s.activeSubscribers, "Test aboneliği: " + s.activeSandboxSubscribers),
      kpi("Bildirim cihazı", "device", s.pushDevices, data.pushReady ? "Push hazır" : "APNs anahtarı yok"),
      kpi("Aktif uyarı", "alerts", s.activeAlerts, s.drafts + " taslak", function () { go("alerts"); }),
      // Counts only; no user data.
      kpi("Kullanıcılar", "users", users ? users.total : "—", users
        ? "Apple ile giriş: " + users.apple + " · Misafir: " + users.guest +
          (users.otherSignIn ? " · Diğer giriş: " + users.otherSignIn : "") + " · Son 7 gün yeni: " + users.newLast7Days
        : "Yüklenemedi"));
    c.replaceChildren(grid);
  }
  function failed(e) {
    return empty("warn", e.message === "Yetki yok" ? "Bu hesabın yönetici yetkisi yok." : "Yüklenemedi.", "Yenile düğmesiyle tekrar dene.");
  }

  // ---------- Bildirimler ----------
  function viewReports() {
    var c = content();
    var seg = el("div", "segments");
    [["pending", "Bekleyen"], ["approved", "Onaylananlar"], ["rejected", "Reddedilenler"]].forEach(function (t) {
      var b = el("button", t[0] === state.reportTab ? "active" : "", t[1]); b.type = "button";
      if (t[0] === "pending" && state.pending > 0) b.append(el("span", "count", state.pending));
      b.onclick = function () { state.reportTab = t[0]; viewReports(); };
      seg.append(b);
    });
    var body = el("div");
    add(c, seg, body);
    if (state.reportTab === "pending") pendingQueue(body); else reviewedList(body, state.reportTab);
  }

  function reporterChip(r) {
    var chip = el("span", "reporter");
    chip.append(el("span", null, "Bildiren"), el("b", null, "#" + r.reporter.alias),
      el("span", null, "· " + r.reporter.total + " bildirim · " + r.reporter.approved + " onaylı · " + r.reporter.rejected + " reddedilen"));
    return chip;
  }

  async function pendingQueue(box) {
    box.append(skeleton());
    var data;
    try { data = await api({ action: "queue" }); } catch (e) { box.replaceChildren(failed(e)); return; }
    if (state.view !== "reports" || state.reportTab !== "pending") return;
    var reports = data.reports || [];
    state.pending = reports.length; buildNav();
    box.replaceChildren();
    if (!reports.length) { box.append(el("div", "card", null)); box.firstChild.append(empty("inbox", "Bekleyen bildirim yok", "Yeni bildirimler burada değere göre gruplanır.")); return; }
    var groups = [], byKey = {};
    reports.forEach(function (r) {
      if (!byKey[r.fingerprint]) { byKey[r.fingerprint] = { key: r.fingerprint, items: [] }; groups.push(byKey[r.fingerprint]); }
      byKey[r.fingerprint].items.push(r);
    });
    var list = el("div", "grid");
    groups.forEach(function (g) { list.append(groupCard(g)); });
    box.append(list);
  }

  function groupCard(g) {
    var first = g.items[0], shown = formatValue(first.kind, first.value);
    var card = el("section", "card group");
    var head = el("div", "group-head"), top = el("div", "group-top"), left = el("div");
    var kinds = el("div", "actions"); add(kinds, badge(L.kind[first.kind] || first.kind, "info"),
      g.items.length > 1 ? badge(g.items.length + " bekleyen bildirim", "warn") : null);
    add(left, kinds, el("div", "value", shown));
    add(top, left, googleLink(first.kind, first.value));
    var facts = el("div", "facts");
    var f1 = el("span"); f1.append(el("b", null, first.valueReporters), document.createTextNode(" farklı kullanıcı bildirdi"));
    var f2 = el("span"); f2.append(el("b", null, first.valueApproved), document.createTextNode(" onaylı bildirim"));
    add(facts, f1, f2);
    add(head, top, facts);
    if (first.official) {
      head.append(banner("risk", "Bu numara " + first.official.name + " kurumunun resmî numarası olarak kayıtlı. Arayan numarayı taklit etmiş (spoofing) olabilir; onaylamadan önce dikkatle incele."));
    }
    card.append(head);
    g.items.forEach(function (r) { card.append(reportRow(r, first)); });
    if (g.items.length > 1) {
      var ga = el("div", "group-actions");
      add(ga,
        button("Tümünü onayla (" + g.items.length + ")", "primary small", function () { decideGroup(g, "approve"); }, "check"),
        button("Tümünü reddet", "danger small", function () { decideGroup(g, "reject"); }));
      card.append(ga);
    }
    return card;
  }

  function reportRow(r, first) {
    var row = el("div", "report");
    var meta = el("div", "report-meta");
    add(meta, badge(L.category[r.category] || r.category, "green"), el("span", null, "Bildirim: " + when(r.createdAt)),
      el("span", null, "· Olay: " + day(r.incidentDate)));
    row.append(meta, el("p", "desc", r.description));
    var flags = piiFlags(r.description);
    if (flags.length) row.append(banner("warn", "Açıklamada kişisel veri olabilir: " + flags.join(", ") + ". Onaylamadan önce kontrol et."));
    row.append(reporterChip(r));
    var actions = el("div", "actions");
    add(actions,
      button("Onayla", "primary small", function () { decideOne(r, "approve", first); }, "check"),
      button("Reddet", "danger small", function () { decideOne(r, "reject", first); }),
      button("Sahibi doğruladı", "ghost small", function () { decideOne(r, "owner_confirm", first); }, "shield"));
    row.append(actions);
    return row;
  }

  var decisionText = {
    approve: { title: "Bildirimi onayla", text: "Onaylanan bildirimler uygulamada bu değer için yalnız sayı olarak görünür.", ok: "Onayla" },
    owner_confirm: { title: "Sahibi doğruladı", text: "Bildirim onaylanır ve numara/hesap sahibinin doğruladığı işaretlenir; tek bildirimle de uygulamada sayılır.", ok: "Onayla" },
    reject: { title: "Bildirimi reddet", text: "Reddedilen bildirim uygulamada sayılmaz. Bir sebep seç.", ok: "Reddet" }
  };
  async function decideOne(r, decision, first) {
    var t = decisionText[decision];
    var answer = await dialog({ title: t.title, text: t.text, value: formatValue(r.kind, r.value), reasons: decision === "reject",
      note: "optional", noteLabel: decision === "reject" ? "Not (\"Diğer\" için zorunlu)" : "Not (isteğe bağlı)", ok: t.ok,
      danger: decision === "reject", warning: decision !== "reject" && first.official ? "Resmî kurum numarası: taklit olabilir." : null });
    if (!answer) return;
    var done = await act({ action: "review", reportId: r.id, decision: decision, reason: answer.reason, note: answer.note },
      decision === "reject" ? "Bildirim reddedildi." : "Bildirim onaylandı.");
    if (done) viewReports();
  }
  async function decideGroup(g, decision) {
    var first = g.items[0], t = decisionText[decision];
    var answer = await dialog({ title: decision === "reject" ? "Hepsini reddet" : "Hepsini onayla",
      text: "Bu değerin " + g.items.length + " bekleyen bildiriminin tamamı " + (decision === "reject" ? "reddedilecek." : "onaylanacak.") +
        " Her biri denetim kaydına ayrı yazılır.",
      value: formatValue(first.kind, first.value), reasons: decision === "reject", note: "optional",
      noteLabel: decision === "reject" ? "Not (\"Diğer\" için zorunlu)" : "Not (isteğe bağlı)", ok: t.ok, danger: decision === "reject",
      warning: decision !== "reject" && first.official ? "Resmî kurum numarası: taklit olabilir." : null });
    if (!answer) return;
    var done = await act({ action: "reviewValue", fingerprint: g.key, decision: decision, reason: answer.reason, note: answer.note });
    if (done) { toast(done.count + " bildirim " + (decision === "reject" ? "reddedildi." : "onaylandı.")); viewReports(); }
  }

  function reviewedList(box, status) {
    var bar = el("div", "search");
    var q = el("input"); q.type = "search"; q.placeholder = "Değer veya açıklamada ara"; q.value = state.query || "";
    var cat = el("select");
    cat.append(new Option("Tüm kategoriler", ""));
    Object.keys(L.category).forEach(function (k) { cat.append(new Option(L.category[k], k)); });
    cat.value = state.category || "";
    var results = el("div", "card");
    add(bar, q, cat);
    add(box, bar, results);
    var timer;
    var load = async function () {
      state.query = q.value; state.category = cat.value;
      results.replaceChildren(el("div", "skeleton sk-line"), el("div", "skeleton sk-line"), el("div", "skeleton sk-line"));
      var data;
      try { data = await api({ action: "reports", status: status, query: q.value.trim(), category: cat.value }); }
      catch (e) { results.replaceChildren(failed(e)); return; }
      results.replaceChildren();
      var reports = data.reports || [];
      if (!reports.length) {
        results.append(empty(status === "approved" ? "check" : "inbox", status === "approved" ? "Onaylanan bildirim yok" : "Reddedilen bildirim yok",
          q.value || cat.value ? "Aramayı değiştirerek tekrar dene." : null));
        return;
      }
      reports.forEach(function (r) { results.append(reviewedRow(r, status)); });
    };
    q.oninput = function () { clearTimeout(timer); timer = setTimeout(load, 300); };
    cat.onchange = load;
    load();
  }

  function reviewedRow(r, status) {
    var row = el("div", "list-row"), top = el("div", "row-top"), left = el("div");
    var tags = el("div", "actions");
    add(tags, badge(L.kind[r.kind] || r.kind, "info"), badge(L.category[r.category] || r.category, "green"),
      r.ownerConfirmed ? badge("Sahibi doğruladı", "green") : null,
      status === "rejected" ? badge(L.reason[r.rejectReason] || "Sebep yok", r.rejectReason === "approval_revoked" ? "warn" : "risk") : null);
    add(left, tags, el("div", "value", formatValue(r.kind, r.value)));
    var actions = el("div", "actions");
    if (status === "approved") {
      actions.append(button("Onayı geri al", "danger small", async function () {
        var answer = await dialog({ title: "Onayı geri al", value: formatValue(r.kind, r.value),
          text: "Bildirim reddedilenlere taşınır ve uygulamadaki sayıdan hemen düşer. Sebebi yaz (ör. itiraz).",
          note: "required", noteLabel: "Sebep", ok: "Geri al", danger: true });
        if (!answer) return;
        if (await act({ action: "revoke", reportId: r.id, note: answer.note }, "Onay geri alındı.")) viewReports();
      }));
    } else {
      actions.append(button("Yeniden incele", "ghost small", async function () {
        var answer = await dialog({ title: "Yeniden incelemeye al", value: formatValue(r.kind, r.value),
          text: "Bildirim bekleyenlere döner; sebep ve not temizlenir.", ok: "Bekleyenlere al" });
        if (!answer) return;
        if (await act({ action: "reopen", reportId: r.id }, "Bildirim bekleyenlere alındı.")) viewReports();
      }));
    }
    add(top, left, actions);
    row.append(top, el("p", "desc", r.description));
    if (r.note) row.append(el("p", "small muted", "Not: " + r.note));
    var meta = el("div", "report-meta");
    add(meta, el("span", null, "İncelendi: " + when(r.reviewedAt)), el("span", null, "· Bu değer için " + r.valueApproved + " onaylı / " + r.valueReporters + " kullanıcı"));
    add(row, meta, reporterChip(r));
    return row;
  }

  // ---------- Uyarılar ----------
  function blankEditor() {
    return { mode: "new", id: null, draftId: null, template: null, title: "", body: "", severity: "attention",
      protection: ["", "", "", ""], sourceName: "", sourceURL: "", expires: "", push: false };
  }
  async function viewAlerts() {
    var c = content();
    if (!state.editor) state.editor = blankEditor();
    var layout = el("div", "grid two"), editorCard = el("section", "card"), previewCard = el("section", "card");
    add(layout, editorCard, previewCard);
    var lists = el("div");
    add(c, layout, lists);
    renderEditor(editorCard, previewCard);
    lists.append(skeleton());
    var drafts, alerts, audience;
    try {
      var results = await Promise.all([api({ action: "drafts" }), api({ action: "alerts" }), api({ action: "pushAudience" })]);
      drafts = results[0].drafts || []; alerts = results[1].alerts || []; audience = results[2];
    } catch (e) { lists.replaceChildren(failed(e)); return; }
    if (state.view !== "alerts") return;
    state.pushReady = audience.pushReady; state.audience = audience.audience;
    state.pushesLeft = typeof audience.pushesLeft === "number" ? audience.pushesLeft : 0;
    renderEditor(editorCard, previewCard);
    lists.replaceChildren();
    var active = alerts.filter(function (a) { return !a.withdrawnAt; }), withdrawn = alerts.filter(function (a) { return a.withdrawnAt; });
    lists.append(el("h2", "section-title", "Taslaklar"));
    lists.append(listCard(drafts, "Taslak yok", "Şablonla başlayıp taslak olarak kaydedebilirsin.", draftRow));
    lists.append(el("h2", "section-title", "Yayındaki uyarılar"));
    lists.append(listCard(active, "Yayında uyarı yok", null, alertRow));
    if (withdrawn.length) {
      lists.append(el("h2", "section-title", "Geri çekilenler"));
      lists.append(listCard(withdrawn, "", null, alertRow));
    }
  }
  function listCard(items, emptyTitle, emptyText, row) {
    var card = el("div", "card");
    if (!items.length) card.append(empty("alerts", emptyTitle, emptyText));
    items.forEach(function (i) { card.append(row(i)); });
    return card;
  }

  function renderEditor(card, previewCard) {
    var e = state.editor;
    card.replaceChildren();
    var head = el("div", "card-head");
    add(head, el("h2", null, e.mode === "edit" ? "Uyarıyı düzenle" : e.mode === "draft" ? "Taslağı düzenle" : "Yeni uyarı"),
      e.mode !== "new" ? button("Yeni uyarı", "subtle small", function () { state.editor = blankEditor(); renderEditor(card, previewCard); }) : null);
    card.append(head);
    if (e.mode === "new") {
      card.append(el("p", "small muted", "Hazır şablonlar"));
      var chips = el("div", "templates");
      templates.forEach(function (t) {
        var chip = el("button", "chip" + (e.template === t.id ? " active" : ""), t.label); chip.type = "button";
        chip.onclick = function () {
          Object.assign(e, { template: t.id, title: t.title, body: t.body, severity: t.severity,
            protection: t.protection.concat(["", "", "", ""]).slice(0, 4) });
          renderEditor(card, previewCard);
        };
        chips.append(chip);
      });
      card.append(chips);
    }
    var preview = function () { renderPreview(previewCard); };
    function input(label, key, attrs, area) {
      var f = el("label", "field", label), i = el(area ? "textarea" : "input");
      Object.assign(i, attrs || {}); i.value = e[key] || "";
      i.oninput = function () { e[key] = i.value; preview(); };
      f.append(i); return f;
    }
    card.append(input("Başlık", "title", { maxLength: 80, placeholder: "ör. Sahte kargo SMS'leri yayılıyor" }));
    card.append(input("Ne oluyor?", "body", { maxLength: 2000, rows: 5 }, true));
    card.append(el("p", "small muted", "Nasıl korunursun? (2–4 madde ya da hiç)"));
    var steps = el("div", "steps-grid");
    e.protection.forEach(function (s, i) {
      var inp = el("input"); inp.maxLength = 200; inp.placeholder = (i + 1) + ". madde"; inp.value = s;
      inp.oninput = function () { e.protection[i] = inp.value; preview(); };
      steps.append(inp);
    });
    card.append(steps);
    var row = el("div", "row-2");
    var sev = el("label", "field", "Önem"), sel = el("select");
    Object.keys(L.severity).forEach(function (k) { sel.append(new Option(L.severity[k], k)); });
    sel.value = e.severity; sel.onchange = function () { e.severity = sel.value; preview(); }; sev.append(sel);
    add(row, sev, input("Bitiş tarihi (isteğe bağlı)", "expires", { type: "date" }));
    card.append(row);
    var row2 = el("div", "row-2");
    add(row2, input("Kaynak adı (isteğe bağlı)", "sourceName", { maxLength: 120, placeholder: "ör. USOM" }),
      input("Kaynak bağlantısı (https://)", "sourceURL", { maxLength: 500, type: "url", placeholder: "https://" }));
    card.append(row2);
    if (e.mode !== "edit") {
      var canPush = state.pushReady && state.pushesLeft > 0;
      if (!canPush) e.push = false;
      var push = el("label", "check"), box = el("input"); box.type = "checkbox"; box.checked = e.push; box.disabled = !canPush;
      box.onchange = function () { e.push = box.checked; };
      push.append(box, document.createTextNode(!state.pushReady ? "Push gönderilemez (APNs anahtarı yok)"
        : state.pushesLeft > 0 ? "Push bildirimi olarak da gönder (son 24 saatte kalan: " + state.pushesLeft + "/2)"
        : "Push gönderilemez: son 24 saatte 2 push gönderildi"));
      card.append(push);
    }
    var note = el("p", "form-note");
    var actions = el("div", "editor-actions");
    if (e.mode === "edit") {
      actions.append(button("Değişiklikleri kaydet", "primary", function () { saveEdit(note); }, "check"));
    } else {
      add(actions, button("Yayınla…", "primary", function () { publish(note); }, "alerts"),
        button("Taslak olarak kaydet", "ghost", function () { saveDraft(note); }));
    }
    add(card, actions, note);
    renderPreview(previewCard);
  }

  function draftValues() {
    var e = state.editor;
    return { title: e.title.trim(), body: e.body.trim(), severity: e.severity,
      protection: e.protection.map(function (s) { return s.trim(); }).filter(Boolean),
      sourceName: e.sourceName.trim(), sourceURL: e.sourceURL.trim(),
      expiresAt: e.expires ? new Date(e.expires + "T23:59:00").toISOString() : null };
  }
  function problems(d) {
    if (d.title.length < 3) return "Başlık en az 3 karakter olmalı.";
    if (d.body.length < 10) return "\"Ne oluyor?\" en az 10 karakter olmalı.";
    if (d.protection.length === 1) return "Korunma için en az 2 madde gir ya da hepsini boş bırak.";
    if (d.protection.some(function (s) { return s.length < 3; })) return "Her madde en az 3 karakter olmalı.";
    if (d.sourceURL && (!/^https:\/\/\S+$/.test(d.sourceURL) || !d.sourceName)) return "Kaynak bağlantısı https:// ile başlamalı ve kaynak adı girilmeli.";
    return null;
  }
  function renderPreview(card) {
    var d = draftValues();
    card.replaceChildren();
    var head = el("div", "card-head"); add(head, el("h2", null, "Önizleme"), el("span", "small muted", "Uygulamadaki görünüm"));
    var phone = el("div", "phone");
    add(phone, el("div", "band " + d.severity, L.severity[d.severity]), el("h3", null, d.title || "Başlık"),
      el("div", "date", when(new Date().toISOString())));
    var what = el("div", "box"); add(what, el("h4", null, "Ne oluyor?"), el("p", null, d.body || "Metin")); phone.append(what);
    if (d.protection.length) {
      var how = el("div", "box"), list = el("ol"); how.append(el("h4", null, "Nasıl korunursun?"));
      d.protection.forEach(function (s) { list.append(el("li", null, s)); }); how.append(list); phone.append(how);
    }
    if (d.sourceName) phone.append(el("p", "src", "Kaynak: " + d.sourceName));
    phone.append(el("div", "share", "Ailene gönder"));
    add(card, head, phone);
  }

  async function saveDraft(note) {
    var e = state.editor, d = draftValues();
    if (!d.title && !d.body) { note.textContent = "Taslak için en az bir başlık ya da metin yaz."; return; }
    var r = await act(Object.assign({ action: "saveDraft", id: e.draftId, template: e.template }, d), "Taslak kaydedildi.");
    if (r) { e.draftId = r.id; e.mode = "draft"; viewAlerts(); }
  }
  async function publish(note) {
    var e = state.editor, d = draftValues(), problem = problems(d);
    note.textContent = problem || "";
    if (problem) return;
    var first = await dialog({ title: "Uyarıyı yayınla", value: d.title,
      text: "Bu uyarı uygulamadaki Uyarılar sekmesinde tüm kullanıcılara görünecek." + (e.push ? " Ardından push bildirimi onayı istenecek." : " Push gönderilmeyecek."),
      ok: e.push ? "Devam" : "Yayınla" });
    if (!first) return;
    if (e.push) {
      var a = state.audience || { production: 0, sandbox: 0 };
      var second = await dialog({ title: "Push bildirimi gönder", danger: true, ok: "Gönder ve yayınla",
        confirm: "Bu bir güvenlik uyarısıdır, tanıtım içermez.",
        text: (a.production + a.sandbox) + " cihaza bildirim gidecek (canlı: " + a.production + ", test: " + a.sandbox + "). Gönderilen bildirim geri alınamaz." });
      if (!second) return;
    }
    var r = await act(Object.assign({ action: "publish", push: e.push, securityOnly: e.push, draftId: e.draftId }, d));
    if (!r) return;
    var push = r.push;
    toast("Yayınlandı." + (push ? (push.status === "notConfigured" ? " Push gönderilemedi: APNs anahtarı yok." : " Push: " + push.sent + " başarılı, " + push.failed + " başarısız.") : ""));
    state.editor = blankEditor(); viewAlerts();
  }
  async function saveEdit(note) {
    var e = state.editor, d = draftValues(), problem = problems(d);
    note.textContent = problem || "";
    if (problem) return;
    var ok = await dialog({ title: "Değişiklikleri kaydet", value: d.title, text: "Uygulamadaki uyarı hemen güncellenir. Push yeniden gönderilmez." });
    if (!ok) return;
    if (await act(Object.assign({ action: "updateAlert", alertId: e.id }, d), "Uyarı güncellendi.")) { state.editor = blankEditor(); viewAlerts(); }
  }
  function loadIntoEditor(source, mode) {
    state.editor = { mode: mode, id: mode === "edit" ? source.id : null, draftId: mode === "draft" ? source.id : null,
      template: source.template || null, title: source.title || "", body: source.body || "", severity: source.severity || "attention",
      protection: (source.protection || []).concat(["", "", "", ""]).slice(0, 4), sourceName: source.sourceName || "",
      sourceURL: source.sourceURL || "", expires: source.expiresAt ? source.expiresAt.slice(0, 10) : "", push: false };
    viewAlerts(); window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function draftRow(d) {
    var row = el("div", "alert-row"), top = el("div", "row-top"), left = el("div");
    add(left, el("h3", null, d.title || "(başlıksız taslak)"), el("p", "small muted", "Son düzenleme: " + when(d.updatedAt)));
    var actions = el("div", "actions");
    add(actions, button("Düzenle", "ghost small", function () { loadIntoEditor(d, "draft"); }),
      button("Sil", "danger small", async function () {
        if (!(await dialog({ title: "Taslağı sil", value: d.title || "(başlıksız)", ok: "Sil", danger: true }))) return;
        if (await act({ action: "deleteDraft", id: d.id }, "Taslak silindi.")) viewAlerts();
      }));
    add(top, left, badge(L.severity[d.severity], d.severity === "high" ? "risk" : d.severity === "attention" ? "warn" : "info"));
    add(row, top, actions);
    return row;
  }
  function alertRow(a) {
    var row = el("div", "alert-row"), top = el("div", "row-top");
    add(top, el("h3", null, a.title), a.withdrawnAt ? badge("Geri çekildi") :
      badge(L.severity[a.severity], a.severity === "high" ? "risk" : a.severity === "attention" ? "warn" : "info"));
    row.append(top);
    var meta = el("div", "report-meta");
    add(meta, el("span", null, "Yayın: " + when(a.publishedAt)), a.expiresAt ? el("span", null, "· Bitiş: " + when(a.expiresAt)) : null,
      a.withdrawnAt ? el("span", null, "· Geri çekildi: " + when(a.withdrawnAt)) : null);
    row.append(meta);
    row.append(a.pushRequested
      ? add(el("div", "actions"), badge("Push: " + a.pushSent + " başarılı", "green"), badge(a.pushFailed + " başarısız", a.pushFailed ? "risk" : ""))
      : el("p", "small muted", "Push gönderilmedi"));
    if (!a.withdrawnAt) {
      var actions = el("div", "actions");
      add(actions, button("Düzenle", "ghost small", function () { loadIntoEditor(a, "edit"); }),
        button("Geri çek", "danger small", async function () {
          if (!(await dialog({ title: "Uyarıyı geri çek", value: a.title, text: "Uyarı uygulamadan kaldırılır.", ok: "Geri çek", danger: true }))) return;
          if (await act({ action: "withdraw", alertId: a.id }, "Uyarı geri çekildi.")) viewAlerts();
        }));
      row.append(actions);
    }
    return row;
  }

  // ---------- Kayıtlar ----------
  // ---------- Resmî numaralar ----------
  var registryRefusals = { invalid_number: "Numara tanınmadı (444, 0850, 0800, 0888, sabit hat, cep veya 3–4 haneli kısa kod).",
    invalid_source: "Kaynak, kurumun https ile başlayan resmî sayfası olmalı.", duplicate: "Bu numara bu kaynakla zaten kayıtlı.",
    not_found: "Kayıt bulunamadı.", invalid: "Bilgiler eksik ya da hatalı.",
    superseded: "Bu kayıt daha yeni bir kayıtla birleştirildi; yeni kaydı kullan." };
  async function registryAct(body, success) {
    try {
      var r = await api(body);
      if (r.ok === false) { toast(registryRefusals[r.result] || "İşlem yapılamadı."); return null; }
      if (success) toast(success);
      return r;
    } catch (e) {
      toast(e.message === "Yetki yok" ? "Bu hesabın yönetici yetkisi yok." : (registryRefusals[e.message] || "İşlem yapılamadı."));
      return null;
    }
  }
  function isHttpsSource(value) {
    try { var u = new URL(value); return u.protocol === "https:" && u.hostname.indexOf(".") > 0 && !u.username && !u.password; }
    catch (e) { return false; }
  }
  function sourceLink(url) {
    var host = ""; try { host = new URL(url).hostname; } catch (e) { host = url; }
    if (!isHttpsSource(url)) return el("span", "muted", host);
    var a = el("a", null, host); a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer"; return a;
  }
  // "Yeniden doğrula": the server opens the source page first (same check as
  // the monthly run). Found → active. Not found or not opened → nothing
  // changes; "Yine de elle doğrula" needs a note and is logged as manual.
  var checkErrors = { timeout: "zaman aşımı", network: "bağlantı hatası", not_https: "kaynak https değil" };
  async function reverifyFlow(action, id, value, what, refusals, reload) {
    var first = await dialog({ title: "Yeniden doğrula", value: value,
      text: "Kaynak sayfa şimdi açılıp " + what + " aranacak. Sayfada bulunursa kayıt aktif olur ve doğrulama tarihi bugüne güncellenir.",
      ok: "Sayfayı kontrol et" });
    if (!first) return;
    var r;
    try { r = await api({ action: action, id: id }); }
    catch (e) { toast(e.message === "Yetki yok" ? "Bu hesabın yönetici yetkisi yok." : (refusals[e.message] || "İşlem yapılamadı.")); return; }
    if (r.ok) { toast("Sayfada bulundu; kayıt doğrulandı."); reload(); return; }
    if (r.result !== "check_failed") { toast(refusals[r.result] || "İşlem yapılamadı."); return; }
    var c = r.check || {};
    var why = c.outcome === "notFound"
      ? "Kaynak sayfa açıldı ama " + what + " sayfada bulunamadı."
      : "Kaynak sayfa açılmadı (" + (checkErrors[c.error] || String(c.error || "bilinmeyen hata").replace(/^http_/, "HTTP ")) + ").";
    var second = await dialog({ title: "Sayfa kontrolü başarısız", value: value,
      text: why + " Kayıt değiştirilmedi. Sayfayı kendin açıp " + what + " gördüysen elle doğrulayabilirsin; bu işlem kayda “elle, sayfa kontrolü başarısız” olarak yazılır.",
      note: "required", noteLabel: "Not (zorunlu): nerede ve nasıl gördün?", ok: "Yine de elle doğrula" });
    if (!second) return;
    try {
      var m = await api({ action: action, id: id, manual: true, note: second.note });
      if (m.ok) { toast("Elle doğrulandı."); reload(); } else toast(refusals[m.result] || "İşlem yapılamadı.");
    } catch (e) { toast(refusals[e.message] || "İşlem yapılamadı."); }
  }

  function viewRegistry() {
    var c = content();
    var bar = el("div", "search"), q = el("input");
    q.type = "search"; q.placeholder = "Kurum, etiket veya numara ara"; q.maxLength = 80; q.value = state.registryQuery || "";
    var create = button("Yeni kayıt", "primary small", function () { form.hidden = !form.hidden; if (!form.hidden) fields.institution.focus(); });
    add(bar, q, create);
    var form = el("div", "card"); form.hidden = true;
    var fields = {};
    [["institution", "Kurum", "text", 120], ["category", "Kategori", "text", 60], ["number", "Numara", "text", 40],
      ["label", "Etiket", "text", 120], ["sourceUrl", "Kaynak URL (kurumun resmî sayfası, https)", "url", 2048]].forEach(function (f) {
      var label = el("label", "field", f[1]), input = el("input");
      input.type = f[2]; input.maxLength = f[3]; input.required = true;
      if (f[0] === "sourceUrl") input.placeholder = "https://";
      fields[f[0]] = input; label.append(input); form.append(label);
    });
    var formNote = el("p", "muted");
    add(form, formNote, el("div", "actions"));
    form.lastChild.append(button("Kaydet", "primary", async function () {
      var v = {}; Object.keys(fields).forEach(function (k) { v[k] = fields[k].value.trim(); });
      if (!v.institution || !v.category || !v.number || !v.label) { formNote.textContent = "Tüm alanları doldur."; return; }
      if (!isHttpsSource(v.sourceUrl)) { formNote.textContent = registryRefusals.invalid_source; return; }
      var r = await registryAct({ action: "registryCreate", institution: v.institution, category: v.category,
        number: v.number, label: v.label, sourceUrl: v.sourceUrl }, "Kayıt eklendi.");
      if (r) { state.registryQuery = v.number; viewRegistry(); }
    }), button("Vazgeç", "ghost", function () { form.hidden = true; }));
    var card = el("div", "card");
    add(c, bar, form, card);
    var timer = null;
    q.oninput = function () { clearTimeout(timer); timer = setTimeout(function () { state.registryQuery = q.value.trim(); load(); }, 300); };
    var load = async function () {
      card.replaceChildren(skeleton("list"));
      var data;
      try { data = await api({ action: "registry", query: state.registryQuery || "" }); }
      catch (e) { card.replaceChildren(failed(e)); return; }
      var rows = data.rows || [];
      card.replaceChildren();
      if (!rows.length) { card.append(empty("registry", "Kayıt yok", "Aramaya uyan resmî numara bulunamadı.")); return; }
      var review = rows.filter(function (r) { return r.status === "needs_review"; }).length;
      if (review) card.append(banner("warn", review + " kayıt incelenmeli: kaynak sayfada numara bulunamadı ya da sayfa açılmadı. 14 gün içinde doğrulanmazsa devre dışı kalır."));
      rows.forEach(function (r) { card.append(registryRow(r, load)); });
    };
    load();
  }
  function registryRow(r, reload) {
    var row = el("div", "list-row"), top = el("div", "row-top"), left = el("div");
    add(left, el("div", "value", r.number + " · " + r.institution),
      el("div", "muted", [r.label, r.category, r.sharedLabel ? "Genel ad: " + r.sharedLabel : null,
        r.groupLabel ? "Ortak gösterim: " + r.groupLabel : null,
        r.operator ? "Yalnız " + r.operator + " hattından" : null].filter(Boolean).join(" · ")));
    var badges = el("div", "actions");
    badges.append(badge(L.registryStatus[r.status] || r.status, r.status === "active" ? "green" : r.status === "needs_review" ? "warn" : "risk"));
    if (L.registryLine[r.lineKind]) badges.append(badge(L.registryLine[r.lineKind], "info"));
    add(top, left, badges);
    var meta = el("div", "muted");
    add(meta, document.createTextNode("Kaynak: "), sourceLink(r.sourceUrl),
      document.createTextNode(" · Doğrulandı: " + day(r.verifiedAt) + " · Son kontrol: " + (r.lastCheckedAt ? day(r.lastCheckedAt) : "—") +
        (r.needsReviewSince ? " · İncelemede: " + day(r.needsReviewSince) : "")));
    var check = null;
    if (r.fetchFailures > 0 || r.lastCheckError) {
      var errorText = { numberNotFound: "sayfada numara yok", timeout: "zaman aşımı", network: "bağlantı hatası", not_https: "https değil" };
      var err = r.lastCheckError ? (errorText[r.lastCheckError] || r.lastCheckError.replace(/^http_/, "HTTP ")) : null;
      check = el("div", r.fetchFailures >= 2 ? "banner warn" : "muted",
        (r.fetchFailures > 0 ? "Sayfa açılmadı: " + r.fetchFailures + " kez üst üste (3'te incelemeye düşer)" : "Son kontrol") +
        (err ? " · Son hata: " + err : "") + (r.lastCheckAttemptAt ? " · " + day(r.lastCheckAttemptAt) : ""));
    }
    var actions = el("div", "actions");
    if (r.status === "superseded") {
      add(row, top, meta, el("div", "muted", "Aynı numara ve kurum için daha yeni bir kayıt var; bu satır kullanıcıya dönmez ve aylık kontrolde atlanır."));
      return row;
    }
    actions.append(button("Yeniden doğrula", "ghost small", function () {
      reverifyFlow("registryReverify", r.id, r.number + " · " + r.institution, "numara", registryRefusals, reload);
    }, "refresh"));
    if (r.status !== "inactive") {
      actions.append(button("Devre dışı bırak", "danger small", async function () {
        var answer = await dialog({ title: "Devre dışı bırak", value: r.number + " · " + r.institution,
          text: "Numara uygulamada artık resmî numara olarak gösterilmez.", note: "optional", noteLabel: "Not (isteğe bağlı)",
          ok: "Devre dışı bırak", danger: true });
        if (answer && await registryAct({ action: "registryDisable", id: r.id, note: answer.note }, "Kayıt devre dışı bırakıldı.")) reload();
      }));
    }
    add(row, top, meta, check, actions);
    return row;
  }

  // ---------- Destek (1.0.3 B2, tuval Panel-Destek) ----------
  // The messages carry no checked number, link or IBAN; the app never adds them.
  async function refreshSupportBadge() {
    try {
      var r = await api({ action: "supportNewCount" });
      if (typeof r.newCount === "number" && r.newCount !== state.supportNew) { state.supportNew = r.newCount; buildNav(); }
    } catch (e) { /* the badge simply stays as it was */ }
  }
  function supportReplyLink(m) {
    var a = el("a", "btn primary");
    var topic = L.supportTopic[m.topic] || m.topic;
    a.href = "mailto:" + encodeURIComponent(m.replyEmail) + "?subject=" + encodeURIComponent("Re: Güvende destek \u2013 " + topic);
    a.append(icon("mail"), document.createTextNode("E-postayla yanıtla"));
    return a;
  }
  function viewSupport() {
    var c = content();
    var seg = el("div", "segments"), newCount = el("span", "count");
    newCount.hidden = !(state.supportNew > 0); newCount.textContent = state.supportNew;
    [["", "Tümü"], ["new", "Yeni"], ["answered", "Yanıtlandı"]].forEach(function (t) {
      var b = el("button", t[0] === state.supportStatus ? "active" : "", t[1]); b.type = "button";
      if (t[0] === "new") b.append(newCount);
      b.onclick = function () { state.supportStatus = t[0]; state.supportSelected = null; viewSupport(); };
      seg.append(b);
    });
    var topics = el("div", "templates");
    [["", "Bütün konular"]].concat(Object.keys(L.supportTopic).map(function (k) { return [k, L.supportTopic[k]]; })).forEach(function (t) {
      var chip = el("button", "chip" + (t[0] === state.supportTopic ? " active" : ""), t[1]); chip.type = "button";
      chip.setAttribute("aria-pressed", t[0] === state.supportTopic ? "true" : "false");
      chip.onclick = function () { state.supportTopic = t[0]; state.supportSelected = null; viewSupport(); };
      topics.append(chip);
    });
    var layout = el("div", "grid two"), listCard = el("section", "card"), detailCard = el("section", "card");
    listCard.setAttribute("aria-label", "Mesajlar"); detailCard.setAttribute("aria-label", "Mesaj ayrıntısı");
    add(layout, listCard, detailCard);
    add(c, seg, topics, layout);
    listCard.append(skeleton("list"));
    detailCard.append(empty("support", "Bir mesaj seç", "Ayrıntı ve yanıt burada görünür."));
    (async function () {
      var data;
      try { data = await api({ action: "support", status: state.supportStatus, topic: state.supportTopic }); }
      catch (e) { listCard.replaceChildren(failed(e)); return; }
      if (state.view !== "support") return;
      state.supportNew = data.newCount || 0; buildNav();
      newCount.textContent = state.supportNew; newCount.hidden = !(state.supportNew > 0);
      listCard.replaceChildren();
      if (!data.messages.length) { listCard.append(empty("inbox", "Mesaj yok", "Bu filtrede mesaj bulunmuyor.")); return; }
      data.messages.forEach(function (m) {
        var row = el("button", "list-row support-row" + (m.id === state.supportSelected ? " selected" : "")); row.type = "button";
        var top = el("div", "row-top");
        add(top, el("strong", null, L.supportTopic[m.topic] || m.topic),
          badge(m.status === "answered" ? "Yanıtlandı" : "Yeni", m.status === "answered" ? "" : "green"));
        add(row, top, el("span", "support-preview", m.preview),
          el("span", "muted small", when(m.createdAt) + " · " + (m.replyEmail || "Yanıt adresi yok")));
        row.dataset.id = m.id;
        row.onclick = function () { state.supportSelected = m.id; viewSupportDetail(detailCard, m.id, listCard); };
        listCard.append(row);
      });
      if (state.supportSelected) viewSupportDetail(detailCard, state.supportSelected, listCard);
    })();
  }
  async function viewSupportDetail(card, id, listCard) {
    Array.prototype.forEach.call(listCard.querySelectorAll(".support-row"), function (r) {
      r.classList.toggle("selected", r.dataset.id === id);
    });
    card.replaceChildren(skeleton("list"));
    var data;
    try { data = await api({ action: "supportDetail", id: id }); }
    catch (e) { card.replaceChildren(failed(e)); return; }
    var m = data.message;
    card.replaceChildren();
    var top = el("div", "row-top");
    add(top, el("h3", null, L.supportTopic[m.topic] || m.topic),
      badge(m.status === "answered" ? "Yanıtlandı" : "Yeni", m.status === "answered" ? "" : "green"));
    var facts = el("div", "support-facts");
    [["Yanıt adresi", m.replyEmail || "Verilmedi"], ["Uygulama", m.appVersion], ["iOS", m.osVersion], ["Gönderildi", when(m.createdAt)]]
      .forEach(function (f) { var box = el("div", "support-fact"); add(box, el("span", "muted small", f[0]), el("strong", null, f[1])); facts.append(box); });
    var body = el("div", "support-message", m.message);
    var flags = piiFlags(m.message);
    var actions = el("div", "actions");
    if (m.replyEmail) actions.append(supportReplyLink(m));
    if (m.status !== "answered") {
      actions.append(button("Yanıtlandı olarak işaretle", "ghost", async function () {
        var r = await act({ action: "supportMarkAnswered", id: m.id }, "Yanıtlandı olarak işaretlendi.");
        if (r) viewSupport();
      }, "check"));
    }
    add(card, top, facts, body,
      flags.length ? banner("warn", "Mesajda kişisel veri olabilir: " + flags.join(", ") + ". Yanıtta tekrarlama.") : null,
      el("p", "muted small", "Mesajda kullanıcının kontrol ettiği numara veya link yoktur; uygulama bunları eklemez." +
        (m.answeredAt ? " Yanıtlandı: " + when(m.answeredAt) + "." : "")),
      actions);
  }

  // ---------- Güncelleme (1.0.2, panolar 16–18) ----------
  var versionRefusals = { invalidVersion: "Sürüm 1.0.3 biçiminde olmalı.", recommendedBelowMin: "Önerilen sürüm en düşük sürümden küçük olamaz.",
    invalidWhatsNew: "Yenilikler en fazla 5 madde, her biri 2–80 karakter olmalı." };
  var versionPattern = /^[0-9]{1,3}\.[0-9]{1,3}(\.[0-9]{1,3})?$/;
  function compareVersions(a, b) {
    var x = (a + ".0.0").split(".").slice(0, 3).map(Number), y = (b + ".0.0").split(".").slice(0, 3).map(Number);
    for (var i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
    return 0;
  }
  function viewUpdate() {
    var c = content();
    var rules = el("div", "card");
    add(rules, el("p", "muted", "En düşük sürümün altındaki uygulamalar zorunlu güncelleme ekranını görür ve güncellemeden kullanılamaz. " +
      "Önerilen sürümün altındakiler \u201cDaha sonra\u201d seçenekli ekranı görür (3 gün tekrar sorulmaz). İnternet yoksa ya da ayar okunamazsa " +
      "uygulama engellenmez. Bu ekran 1.0.2 ile gelir; 1.0 ve 1.0.1'de çalışmaz."));
    var card = el("div", "card");
    add(c, rules, card);
    card.replaceChildren(skeleton("list"));
    (async function () {
      var data;
      try { data = await api({ action: "versionPolicy" }); }
      catch (e) { card.replaceChildren(failed(e)); return; }
      var policy = data.policy || { minVersion: "1.0", recommendedVersion: "1.0", whatsNew: [] };
      var live = data.appStoreVersion;
      card.replaceChildren();
      var fields = {};
      [["minVersion", "En düşük sürüm (altındaysa zorunlu)"], ["recommendedVersion", "Önerilen sürüm (altındaysa nazik)"]].forEach(function (f) {
        var label = el("label", "field", f[1]), input = el("input");
        input.type = "text"; input.maxLength = 11; input.inputMode = "decimal"; input.value = policy[f[0]];
        fields[f[0]] = input; label.append(input); card.append(label);
      });
      var notesLabel = el("label", "field", "Yenilikler (her satır bir madde; en fazla 5, boşsa kutu gizlenir)"), notes = el("textarea");
      notes.rows = 5; notes.maxLength = 5 * 81; notes.value = (policy.whatsNew || []).join("\n");
      notesLabel.append(notes); card.append(notesLabel);
      add(card, el("p", "muted", "App Store'daki sürüm: " + (live || "okunamadı") +
        (policy.updatedAt ? " · Son değişiklik: " + new Date(policy.updatedAt).toLocaleString("tr-TR") : "")));
      var note = el("p", "muted"); card.append(note);
      var actions = el("div", "actions"); card.append(actions);
      actions.append(button("Kaydet", "primary", async function () {
        var min = fields.minVersion.value.trim(), rec = fields.recommendedVersion.value.trim();
        var lines = notes.value.split("\n").map(function (l) { return l.trim(); }).filter(Boolean);
        if (!versionPattern.test(min) || !versionPattern.test(rec)) { note.textContent = versionRefusals.invalidVersion; return; }
        if (compareVersions(rec, min) < 0) { note.textContent = versionRefusals.recommendedBelowMin; return; }
        if (lines.length > 5 || lines.some(function (l) { return l.length < 2 || l.length > 80; })) { note.textContent = versionRefusals.invalidWhatsNew; return; }
        note.textContent = "";
        if (live && (compareVersions(rec, live) > 0 || compareVersions(min, live) > 0)) {
          var notLive = await dialog({ title: "Bu sürüm App Store'da henüz görünmüyor",
            text: "App Store'daki sürüm " + live + ". Apple yeni sürümü birkaç saat gecikmeyle gösterebilir; bu sürede ekran, indirilemeyen bir sürümü önerir.",
            ok: "Yine de kaydet" });
          if (!notLive) return;
        }
        var raise = compareVersions(min, policy.minVersion) > 0;
        if (raise) {
          var sure = await dialog({ title: "En düşük sürümü yükselt", danger: true, ok: "Yükselt",
            text: "Bu sürümün altındaki herkes uygulamayı güncellemeden kullanamaz.",
            value: policy.minVersion + " → " + min, confirm: "Zorunlu güncellemeyi anladım ve onaylıyorum." });
          if (!sure) return;
        }
        try {
          var r = await api({ action: "versionPolicySave", minVersion: min, recommendedVersion: rec, whatsNew: lines, confirmMinRaise: raise });
          if (r.ok === false) { note.textContent = versionRefusals[r.result] || "Kaydedilemedi."; return; }
          toast("Sürüm ayarı kaydedildi.");
          viewUpdate();
        } catch (e) {
          note.textContent = versionRefusals[e.message] || (e.message === "Yetki yok" ? "Bu hesabın yönetici yetkisi yok." : "Kaydedilemedi.");
        }
      }));
    })();
  }

  // ---------- Resmî alan adları ----------
  var domainRefusals = Object.assign({}, registryRefusals, {
    invalid_domain: "Alan adı tanınmadı (ör. akbank.com; Türkçe karakterli adlar xn-- biçiminde).",
    duplicate: "Bu alan adı bu kaynakla zaten kayıtlı." });
  async function domainAct(body, success) {
    try {
      var r = await api(body);
      if (r.ok === false) { toast(domainRefusals[r.result] || "İşlem yapılamadı."); return null; }
      if (success) toast(success);
      return r;
    } catch (e) {
      toast(e.message === "Yetki yok" ? "Bu hesabın yönetici yetkisi yok." : (domainRefusals[e.message] || "İşlem yapılamadı."));
      return null;
    }
  }
  function viewDomains() {
    var c = content();
    var bar = el("div", "search"), q = el("input");
    q.type = "search"; q.placeholder = "Kurum, alan adı veya etiket ara"; q.maxLength = 80; q.value = state.domainQuery || "";
    var create = button("Yeni kayıt", "primary small", function () { form.hidden = !form.hidden; if (!form.hidden) fields.institution.focus(); });
    add(bar, q, create);
    var form = el("div", "card"); form.hidden = true;
    var fields = {};
    [["institution", "Kurum", "text", 120, true], ["category", "Kategori", "text", 60, true],
      ["domain", "Alan adı (ör. akbank.com)", "text", 253, true], ["label", "Etiket", "text", 120, true],
      ["brandLabel", "Marka etiketi (taklit kontrolü; boş bırakılırsa kontrol yapılmaz)", "text", 63, false],
      ["sourceUrl", "Kaynak URL (kurumun resmî sayfası, https)", "url", 2048, true]].forEach(function (f) {
      var label = el("label", "field", f[1]), input = el("input");
      input.type = f[2]; input.maxLength = f[3]; input.required = f[4];
      if (f[0] === "sourceUrl") input.placeholder = "https://";
      fields[f[0]] = input; label.append(input); form.append(label);
    });
    var scopeLabel = el("label", "field", "Kapsam"), scope = el("select");
    scope.append(new Option("Alan adı ve alt alan adları", "subdomains"), new Option("Yalnız bu alan adı", "exact"));
    scopeLabel.append(scope); form.append(scopeLabel);
    var formNote = el("p", "muted");
    add(form, formNote, el("div", "actions"));
    form.lastChild.append(button("Kaydet", "primary", async function () {
      var v = {}; Object.keys(fields).forEach(function (k) { v[k] = fields[k].value.trim(); });
      if (!v.institution || !v.category || !v.domain || !v.label) { formNote.textContent = "Zorunlu alanları doldur."; return; }
      if (!isHttpsSource(v.sourceUrl)) { formNote.textContent = domainRefusals.invalid_source; return; }
      var r = await domainAct({ action: "domainRegistryCreate", institution: v.institution, category: v.category,
        domain: v.domain, label: v.label, brandLabel: v.brandLabel, sourceUrl: v.sourceUrl, matchScope: scope.value }, "Kayıt eklendi.");
      if (r) { state.domainQuery = v.domain; viewDomains(); }
    }), button("Vazgeç", "ghost", function () { form.hidden = true; }));
    var card = el("div", "card");
    add(c, bar, form, card);
    var timer = null;
    q.oninput = function () { clearTimeout(timer); timer = setTimeout(function () { state.domainQuery = q.value.trim(); load(); }, 300); };
    var load = async function () {
      card.replaceChildren(skeleton("list"));
      var data;
      try { data = await api({ action: "domainRegistry", query: state.domainQuery || "" }); }
      catch (e) { card.replaceChildren(failed(e)); return; }
      var rows = data.rows || [];
      card.replaceChildren();
      if (!rows.length) { card.append(empty("domains", "Kayıt yok", "Aramaya uyan resmî alan adı bulunamadı.")); return; }
      var review = rows.filter(function (r) { return r.status === "needs_review"; }).length;
      if (review) card.append(banner("warn", review + " kayıt incelenmeli: kaynak sayfada alan adı bulunamadı ya da sayfa açılmadı. 14 gün içinde doğrulanmazsa devre dışı kalır."));
      card.append(el("p", "muted", "Kamu alan adları (.gov.tr, .edu.tr, .bel.tr, .pol.tr, .tsk.tr, .k12.tr) listede olmadan resmî sayılır."));
      rows.forEach(function (r) { card.append(domainRow(r, load)); });
    };
    load();
  }
  function domainRow(r, reload) {
    var row = el("div", "list-row"), top = el("div", "row-top"), left = el("div");
    add(left, el("div", "value", r.domain + " · " + r.institution),
      el("div", "muted", [r.label, r.category, r.groupLabel ? "Grup: " + r.groupLabel : null,
        r.matchScope === "exact" ? "Yalnız bu alan adı" : "Alt alan adları dahil",
        r.brandLabel ? "Taklit kontrolü: " + r.brandLabel : "Taklit kontrolü yok"].filter(Boolean).join(" · ")));
    var badges = el("div", "actions");
    badges.append(badge(L.registryStatus[r.status] || r.status, r.status === "active" ? "green" : r.status === "needs_review" ? "warn" : "risk"));
    add(top, left, badges);
    var meta = el("div", "muted");
    add(meta, document.createTextNode("Kaynak: "), sourceLink(r.sourceUrl),
      document.createTextNode(" · Doğrulandı: " + day(r.verifiedAt) + " · Son kontrol: " + (r.lastCheckedAt ? day(r.lastCheckedAt) : "—") +
        (r.needsReviewSince ? " · İncelemede: " + day(r.needsReviewSince) : "")));
    var check = null;
    if (r.fetchFailures > 0 || r.lastCheckError) {
      var errorText = { domainNotFound: "sayfada alan adı yok", timeout: "zaman aşımı", network: "bağlantı hatası", not_https: "https değil" };
      var err = r.lastCheckError ? (errorText[r.lastCheckError] || r.lastCheckError.replace(/^http_/, "HTTP ")) : null;
      check = el("div", r.fetchFailures >= 2 ? "banner warn" : "muted",
        (r.fetchFailures > 0 ? "Sayfa açılmadı: " + r.fetchFailures + " kez üst üste (3'te incelemeye düşer)" : "Son kontrol") +
        (err ? " · Son hata: " + err : "") + (r.lastCheckAttemptAt ? " · " + day(r.lastCheckAttemptAt) : ""));
    }
    if (r.status === "superseded") {
      add(row, top, meta, el("div", "muted", "Aynı alan adı ve kurum için daha yeni bir kayıt var; bu satır kullanılmaz ve aylık kontrolde atlanır."));
      return row;
    }
    var actions = el("div", "actions");
    actions.append(button("Yeniden doğrula", "ghost small", function () {
      reverifyFlow("domainRegistryReverify", r.id, r.domain + " · " + r.institution, "alan adı", domainRefusals, reload);
    }, "refresh"));
    if (r.status !== "inactive") {
      actions.append(button("Devre dışı bırak", "danger small", async function () {
        var answer = await dialog({ title: "Devre dışı bırak", value: r.domain + " · " + r.institution,
          text: "Site uygulamada artık tanınmış site olarak gösterilmez ve taklit kontrolünde kullanılmaz.", note: "optional",
          noteLabel: "Not (isteğe bağlı)", ok: "Devre dışı bırak", danger: true });
        if (answer && await domainAct({ action: "domainRegistryDisable", id: r.id, note: answer.note }, "Kayıt devre dışı bırakıldı.")) reload();
      }));
    }
    add(row, top, meta, check, actions);
    return row;
  }

  function viewAudit() {
    var c = content();
    var bar = el("div", "search"), sel = el("select");
    [["", "Tüm işlemler"], ["report", "Bildirim işlemleri"], ["alert", "Uyarı işlemleri"], ["registry", "Resmî numara işlemleri"], ["domain_registry", "Resmî alan adı işlemleri"]].concat(
      Object.keys(L.action).map(function (k) { return [k, L.action[k]]; })).forEach(function (o) { sel.append(new Option(o[1], o[0])); });
    sel.value = state.auditFilter;
    sel.onchange = function () { state.auditFilter = sel.value; viewAudit(); };
    bar.append(sel);
    var card = el("div", "card"), table = el("table", "table"), thead = el("thead"), tbody = el("tbody"), hr = el("tr");
    ["Zaman", "Kim", "İşlem", "Ayrıntı"].forEach(function (h) { hr.append(el("th", null, h)); });
    thead.append(hr); add(table, thead, tbody);
    var more = button("Daha eski kayıtlar", "ghost small");
    add(card, table, more);
    add(c, bar, card);
    var before = null;
    var load = async function () {
      more.disabled = true;
      var data;
      try { data = await api({ action: "audit", filter: state.auditFilter, before: before }); }
      catch (e) { card.replaceChildren(failed(e)); return; }
      var entries = data.entries || [];
      if (!entries.length && before === null) { card.replaceChildren(empty("audit", "Kayıt yok", "Yönetici işlemleri burada listelenir.")); return; }
      entries.forEach(function (x) {
        var tr = el("tr");
        add(tr, el("td", "when", when(x.at)), el("td", null, x.actor), el("td", null, L.action[x.action] || x.action),
          el("td", "detail", details(x)));
        tbody.append(tr);
      });
      before = entries.length ? entries[entries.length - 1].id : before;
      more.disabled = entries.length < 50; more.hidden = entries.length < 50;
    };
    more.onclick = load;
    load();
  }
  function details(x) {
    var d = x.details || {}, parts = [];
    if (d.reason) parts.push("Sebep: " + (L.reason[d.reason] || d.reason));
    if (d.previousReason) parts.push("Önceki sebep: " + (L.reason[d.previousReason] || d.previousReason));
    if (d.note) parts.push("Not: " + d.note);
    if (d.severity) parts.push("Önem: " + (L.severity[d.severity] || d.severity));
    if (d.push === true) parts.push("Push istendi");
    if (d.sent !== undefined) parts.push(d.sent + " başarılı, " + d.failed + " başarısız");
    if (d.template) {
      var tpl = templates.find(function (t) { return t.id === d.template; });
      parts.push("Şablon: " + (tpl ? tpl.label : d.template));
    }
    if (d.domain) parts.push("Alan adı: " + d.domain);
    if (d.check === "found") parts.push("Sayfada bulundu");
    if (d.check === "manual") parts.push("Elle, sayfa kontrolü başarısız");
    if (x.targetId) parts.push("Kayıt: " + String(x.targetId).slice(0, 8));
    return parts.join(" · ") || "—";
  }

  // Back/forward and links like #reports switch the view.
  window.addEventListener("hashchange", function () {
    var view = location.hash.replace("#", "");
    if (!$("panel").hidden && view && view !== state.view) go(view);
  });
  client.auth.onAuthStateChange(function (event) { if (event === "SIGNED_IN") route(); });
  route();
})();
