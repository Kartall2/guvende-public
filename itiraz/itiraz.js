// Web dispute form: DOM wiring only (checks and body: itiraz-form.js).
(function () {
  "use strict";
  var F = window.GVD_ITIRAZ, cfg = window.GVD_DISPUTE_CONFIG || {};
  var $ = function (id) { return document.getElementById(id); };
  var form = $("form"), send = $("send");

  function values() {
    var picked = form.querySelector('input[name="reason"]:checked');
    return { number: $("number").value, reason: picked ? picked.value : "owner", note: $("note").value,
      email: $("email").value, website: $("website").value };
  }
  function showError(field, text) {
    var box = $(field + "-error"), input = $(field);
    box.textContent = text || ""; box.hidden = !text;
    if (input) input.setAttribute("aria-invalid", text ? "true" : "false");
  }
  function showErrors(errors) {
    ["number", "email", "note"].forEach(function (k) { showError(k, errors[k]); });
  }
  $("note").addEventListener("input", function () { $("note-count").textContent = $("note").value.length + " / " + F.NOTE_LIMIT; });
  // An error disappears as soon as the field is corrected.
  ["number", "email"].forEach(function (k) {
    $(k).addEventListener("input", function () { if (!$(k + "-error").hidden) showErrors(F.validate(values()).errors); });
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    $("send-error").hidden = true;
    var check = F.validate(values());
    showErrors(check.errors);
    if (!check.ok) { $(check.errors.number ? "number" : check.errors.email ? "email" : "note").focus(); return; }
    send.disabled = true; send.setAttribute("aria-busy", "true");
    var result = await F.submit(values(), { endpoint: cfg.endpoint, fetchImpl: window.fetch.bind(window) });
    send.disabled = false; send.removeAttribute("aria-busy");
    if (result === "sent") {
      form.reset(); $("form-card").hidden = true; $("sent-card").hidden = false; $("sent-card").focus();
      return;
    }
    $("send-error").textContent = F.TEXT.sendFailed; $("send-error").hidden = false;
  });
})();
