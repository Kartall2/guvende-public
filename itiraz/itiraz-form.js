// "Bu bilgi yanlış mı?" web form (1.1 Görev 6): checks and the request body.
// Pure helpers, no DOM; tested by tests/itiraz-form.test.js (node --test).
// The same texts and limits as the app's dispute sheet; the server checks again.
(function (root) {
  var TEXT = {
    title: "Bu bilgi yanlış mı?",
    body: "Bu numaranın sahibiysen ya da özetin yanlış olduğunu düşünüyorsan bize yaz. İnceleyip gerekirse özeti kaldırırız.",
    numberInvalid: "Telefon numarasını kontrol et.",
    emailInvalid: "E-posta adresini kontrol et.",
    sendFailed: "Gönderilemedi. Lütfen tekrar dene.",
    sentEyebrow: "ALINDI",
    sentTitle: "İtirazın bize ulaştı",
    sentBody: "Genellikle 24 saat içinde inceliyoruz. İnceleme bitene kadar özet görünmeye devam edebilir."
  };
  var REASONS = [
    ["owner", "Bu numara bana ya da firmama ait"],
    ["unrelated", "Yorumlar bu numarayla ilgili değil"],
    ["wrong", "Özet yorumları yanlış aktarıyor"],
    ["other", "Başka bir neden"]
  ];
  var NOTE_LIMIT = 1000, EMAIL_LIMIT = 254, NUMBER_LIMIT = 40;

  // A Turkish number research-engine can look up: mobile, landline, 0850/0800/0888
  // (with 0, +90, 90 or 0090) or a 444 number. Short codes and foreign numbers: no.
  function validNumber(value) {
    var text = String(value == null ? "" : value).trim();
    if (!text || text.length > NUMBER_LIMIT || !/^[0-9+()\-.\s]+$/.test(text)) return false;
    if (text.indexOf("+") > 0 || (text.match(/\+/g) || []).length > 1) return false;
    var digits = text.replace(/\D/g, "");
    if (text.charAt(0) !== "+" && /^444\d{4}$/.test(digits)) return true;
    var national = null;
    if (text.charAt(0) === "+") national = /^90\d{10}$/.test(digits) ? digits.slice(2) : null;
    else if (/^0090\d{10}$/.test(digits)) national = digits.slice(4);
    else if (/^90\d{10}$/.test(digits)) national = digits.slice(2);
    else if (/^0\d{10}$/.test(digits)) national = digits.slice(1);
    else if (/^[1-9]\d{9}$/.test(digits)) national = digits;
    return national !== null && /^(5\d|850|800|888|[2-4]\d)/.test(national) && !/^444/.test(national);
  }
  // Empty is fine (optional); otherwise something@something.tld, at most 254.
  function validEmail(value) {
    var email = String(value == null ? "" : value).trim();
    return email === "" || (email.length <= EMAIL_LIMIT && /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email));
  }
  function validNote(value) { return String(value == null ? "" : value).trim().length <= NOTE_LIMIT; }

  // { ok, errors: { number?, email?, note? } } — error texts as the form shows them.
  function validate(values) {
    var errors = {};
    if (!validNumber(values.number)) errors.number = TEXT.numberInvalid;
    if (!validEmail(values.email)) errors.email = TEXT.emailInvalid;
    if (!validNote(values.note)) errors.note = "Açıklama en çok " + NOTE_LIMIT + " karakter olabilir.";
    return { ok: Object.keys(errors).length === 0, errors: errors };
  }

  // The request body; null when the hidden trap field is filled (nothing is sent).
  // The number goes as written; the server normalises it and keeps only its
  // fingerprint and display mask.
  function requestBody(values) {
    if (String(values.website == null ? "" : values.website).trim() !== "") return null;
    var reason = REASONS.some(function (r) { return r[0] === values.reason; }) ? values.reason : "owner";
    var body = { source: "web", number: String(values.number).trim(), reason: reason };
    var note = String(values.note == null ? "" : values.note).trim();
    var email = String(values.email == null ? "" : values.email).trim();
    if (note) body.note = note.slice(0, NOTE_LIMIT);
    if (email) body.email = email;
    return body;
  }

  // "sent" | "invalid" | "failed". The trap field: "sent" with no request.
  async function submit(values, options) {
    if (!validate(values).ok) return "invalid";
    var body = requestBody(values);
    if (body === null) return "sent";
    try {
      var response = await options.fetchImpl(options.endpoint, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
        credentials: "omit", referrerPolicy: "no-referrer", cache: "no-store"
      });
      var data = await response.json().catch(function () { return {}; });
      return response.ok && data && data.ok === true ? "sent" : "failed";
    } catch (e) { return "failed"; }
  }

  var api = { TEXT: TEXT, REASONS: REASONS, NOTE_LIMIT: NOTE_LIMIT, validNumber: validNumber, validEmail: validEmail,
    validNote: validNote, validate: validate, requestBody: requestBody, submit: submit };
  root.GVD_ITIRAZ = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
