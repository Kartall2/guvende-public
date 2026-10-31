// Güvende admin panel. The page holds no secret and no data: every call goes
// to the admin-api function, which accepts only an MFA (aal2) session of a
// user on the admin list. Text from the server is always set as textContent.
(function () {
  "use strict";
  var envName = new URLSearchParams(location.search).get("env") === "sandbox" ? "sandbox" : "production";
  var env = window.GVD_ADMIN_CONFIG[envName];
  var client = window.supabase.createClient(env.url, env.publishableKey, {
    auth: { flowType: "implicit", detectSessionInUrl: true, persistSession: true, storageKey: "gvd-admin-" + envName }
  });
  var $ = function (id) { return document.getElementById(id); };
  var labels = {
    kind: { phone: "Telefon", link: "Bağlantı", sms: "SMS", iban: "IBAN", email: "E-posta" },
    category: { fraud: "Dolandırıcılık", phishing: "Oltalama", fake_cargo: "Sahte kargo", fake_bank: "Sahte banka",
      fake_shopping: "Sahte alışveriş", impersonation: "Kimlik taklidi", other: "Diğer" },
    severity: { info: "Bilgi", attention: "Dikkat", high: "Yüksek risk" }
  };
  $("env").textContent = envName === "sandbox" ? "Sandbox ortamı" : "Canlı ortam";

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }
  function show(id) { ["login", "mfa", "panel"].forEach(function (s) { $(s).hidden = s !== id; }); }
  function when(iso) { return iso ? new Date(iso).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" }) : "—"; }

  function confirmDialog(text) {
    return new Promise(function (resolve) {
      $("modal-text").textContent = text;
      $("modal").hidden = false;
      var done = function (value) { $("modal").hidden = true; $("modal-ok").onclick = $("modal-cancel").onclick = null; resolve(value); };
      $("modal-ok").onclick = function () { done(true); };
      $("modal-cancel").onclick = function () { done(false); };
    });
  }

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

  async function route() {
    var session = (await client.auth.getSession()).data.session;
    if (!session) return show("login");
    var aal = (await client.auth.mfa.getAuthenticatorAssuranceLevel()).data;
    if (!aal || aal.currentLevel !== "aal2") return startMFA();
    show("panel");
    loadAll();
  }

  // Production: password + TOTP only. The e-mail link stays for the test project.
  $("send-link").hidden = envName !== "sandbox";
  $("sign-in").onclick = async function () {
    $("sign-in").disabled = true;
    var result = await client.auth.signInWithPassword({ email: $("email").value.trim(), password: $("password").value });
    $("password").value = "";
    $("sign-in").disabled = false;
    if (result.error) { $("login-note").textContent = "Giriş yapılamadı."; return; }
    $("login-note").textContent = "";
    route();
  };

  $("send-link").onclick = async function () {
    $("send-link").disabled = true;
    var result = await client.auth.signInWithOtp({
      email: $("email").value.trim(),
      options: { shouldCreateUser: false, emailRedirectTo: location.origin + location.pathname + location.search }
    });
    $("login-note").textContent = result.error ? "Gönderilemedi." : "Bağlantı gönderildi; e-postanı kontrol et.";
    $("send-link").disabled = false;
  };

  var factorID = null;
  async function startMFA() {
    show("mfa");
    var factors = (await client.auth.mfa.listFactors()).data;
    var verified = factors && factors.totp && factors.totp.find(function (f) { return f.status === "verified"; });
    if (verified) { factorID = verified.id; $("enroll").hidden = true; return; }
    var enrolled = await client.auth.mfa.enroll({ factorType: "totp", friendlyName: "Güvende yönetim" });
    if (enrolled.error) { $("mfa-note").textContent = "Doğrulama kurulamadı."; return; }
    factorID = enrolled.data.id;
    $("qr").src = enrolled.data.totp.qr_code;
    $("totp-secret").textContent = enrolled.data.totp.secret;
    $("enroll").hidden = false;
  }

  $("verify").onclick = async function () {
    var result = await client.auth.mfa.challengeAndVerify({ factorId: factorID, code: $("code").value.trim() });
    if (result.error) { $("mfa-note").textContent = "Kod doğrulanamadı."; return; }
    $("code").value = "";
    route();
  };

  async function loadAll() {
    try {
      var s = await api({ action: "summary" });
      var stats = $("stats"); stats.replaceChildren();
      [["Bugünkü araştırma", s.summary.researchesToday], ["Bekleyen bildirim", s.summary.pendingReports],
        ["Aktif abone", s.summary.activeSubscribers], ["Test aboneliği", s.summary.activeSandboxSubscribers],
        ["Bildirim cihazı", s.summary.pushDevices], ["Aktif uyarı", s.summary.activeAlerts]].forEach(function (pair) {
        var box = el("div", "stat"); box.append(el("b", null, pair[1]), el("span", null, pair[0])); stats.append(box);
      });
      $("a-push").disabled = !s.pushReady;
      if (!s.pushReady) $("a-push").parentNode.title = "APNs anahtarı yüklü değil";
      await Promise.all([loadQueue(), loadAlerts()]);
    } catch (e) {
      if (String(e.message) === "Yetki yok") { $("stats").textContent = "Bu hesabın yönetici yetkisi yok."; }
      else { $("stats").textContent = "Yüklenemedi."; }
    }
  }

  async function loadQueue() {
    var data = await api({ action: "pendingReports" });
    var box = $("queue"); box.replaceChildren();
    if (!data.reports.length) { box.append(el("p", "note", "Bekleyen bildirim yok.")); return; }
    data.reports.forEach(function (r) {
      var item = el("div", "item");
      item.append(
        el("div", "meta", (labels.kind[r.kind] || r.kind) + " · " + (labels.category[r.category] || r.category) + " · " + when(r.created_at)),
        el("p", "value", r.value),
        el("p", null, r.description),
        el("div", "meta", "Olay tarihi: " + r.incidentDate + " · Aynı değeri bildiren: " + r.sameValueReporters +
          " kullanıcı · onaylı: " + r.sameValueApproved)
      );
      var actions = el("div", "actions");
      [["approve", "Onayla", "primary"], ["reject", "Reddet", "danger"], ["owner_confirm", "Sahibi doğruladı", "ghost"]]
        .forEach(function (a) {
          var b = el("button", a[2], a[1]);
          b.onclick = async function () {
            if (!(await confirmDialog(a[1] + ": " + r.value))) return;
            b.disabled = true;
            try { await api({ action: "moderate", reportId: r.id, decision: a[0] }); } catch (e) { alert("İşlem yapılamadı."); }
            loadAll();
          };
          actions.append(b);
        });
      item.append(actions);
      box.append(item);
    });
  }

  async function loadAlerts() {
    var data = await api({ action: "alerts" });
    var box = $("alerts"); box.replaceChildren();
    if (!data.alerts.length) { box.append(el("p", "note", "Henüz uyarı yok.")); return; }
    data.alerts.forEach(function (a) {
      var item = el("div", "item");
      var head = el("div", "row");
      head.append(el("strong", null, a.title), el("span", "tag " + (a.withdrawnAt ? "off" : a.severity),
        a.withdrawnAt ? "Geri çekildi" : labels.severity[a.severity]));
      item.append(head, el("p", null, a.body),
        el("div", "meta", "Yayın: " + when(a.publishedAt) + (a.expiresAt ? " · Bitiş: " + when(a.expiresAt) : "") +
          (a.pushRequested ? " · Push: " + a.pushSent + " başarılı, " + a.pushFailed + " başarısız" : "")));
      if (!a.withdrawnAt) {
        var b = el("button", "danger", "Geri çek");
        b.onclick = async function () {
          if (!(await confirmDialog("Bu uyarı uygulamadan kaldırılsın mı? " + a.title))) return;
          try { await api({ action: "withdraw", alertId: a.id }); } catch (e) { alert("Geri çekilemedi."); }
          loadAll();
        };
        var actions = el("div", "actions"); actions.append(b); item.append(actions);
      }
      box.append(item);
    });
  }

  function draft() {
    var expires = $("a-expires").value;
    return {
      title: $("a-title").value.trim(), body: $("a-body").value.trim(), severity: $("a-severity").value,
      expiresAt: expires ? new Date(expires + "T23:59:00").toISOString() : null, push: $("a-push").checked
    };
  }

  $("preview").onclick = function () {
    var d = draft(), box = $("preview-box"); box.replaceChildren();
    if (d.title.length < 3 || d.body.length < 10) { $("publish-note").textContent = "Başlık en az 3, metin en az 10 karakter olmalı."; box.hidden = true; return; }
    $("publish-note").textContent = "";
    var card = el("div", "preview"), head = el("div", "row");
    head.append(el("strong", null, d.title), el("span", "tag " + d.severity, labels.severity[d.severity]));
    card.append(head, el("p", null, d.body), el("div", "meta",
      (d.expiresAt ? "Bitiş: " + when(d.expiresAt) : "Bitiş tarihi yok") + (d.push ? " · Push bildirimi gönderilecek" : " · Push gönderilmeyecek")));
    var publish = el("button", "primary", "Yayınla");
    publish.onclick = async function () {
      var text = "Bu uyarı tüm kullanıcılara yayınlanacak" + (d.push ? " ve push bildirimi gönderilecek" : "") + ". Emin misin?";
      if (!(await confirmDialog(text))) return;
      publish.disabled = true;
      try {
        var result = await api(Object.assign({ action: "publish" }, d));
        var push = result.push;
        $("publish-note").textContent = "Yayınlandı." + (push ? (push.status === "notConfigured" ? " Push gönderilemedi: APNs anahtarı yok."
          : " Push: " + push.sent + " başarılı, " + push.failed + " başarısız.") : "");
        ["a-title", "a-body", "a-expires"].forEach(function (id) { $(id).value = ""; });
        $("a-push").checked = false; box.hidden = true;
        loadAll();
      } catch (e) { $("publish-note").textContent = "Yayınlanamadı."; publish.disabled = false; }
    };
    card.append(publish);
    box.append(card); box.hidden = false;
  };

  $("refresh").onclick = loadAll;
  $("sign-out").onclick = async function () { await client.auth.signOut(); show("login"); };
  client.auth.onAuthStateChange(function (event) { if (event === "SIGNED_IN") route(); });
  route();
})();
