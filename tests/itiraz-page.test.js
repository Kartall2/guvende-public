// The web form page: texts, accessibility, privacy and colour contrast (static checks).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const dir = path.join(__dirname, "..", "itiraz");
const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const css = fs.readFileSync(path.join(dir, "itiraz.css"), "utf8");
const config = fs.readFileSync(path.join(dir, "config.js"), "utf8");

test("the app's texts, in order", () => {
  const texts = ["Bu bilgi yanlış mı?", "Bu numaranın sahibiysen ya da özetin yanlış olduğunu düşünüyorsan bize yaz. İnceleyip gerekirse özeti kaldırırız.",
    "Telefon numarası", "Bu numara bana ya da firmama ait", "Yorumlar bu numarayla ilgili değil", "Özet yorumları yanlış aktarıyor",
    "Başka bir neden", "Açıklama (isteğe bağlı)", "Sana dönüş için e-posta (isteğe bağlı)", "İtirazı gönder", "ALINDI",
    "İtirazın bize ulaştı", "Genellikle 24 saat içinde inceliyoruz. İnceleme bitene kadar özet görünmeye devam edebilir.",
    "Güvende kimseyi dolandırıcı olarak etiketlemez; internetteki yorumları aktarır ve hata yapabilir.", "guvendeapp@gmail.com"];
  let at = 0;
  for (const t of texts) { const i = html.indexOf(t, at); assert.ok(i >= 0, t); at = i; }
});

test("a real form: labels for every field, tel keyboard, required number, owner chosen, errors tied to fields", () => {
  assert.match(html, /<form id="form" novalidate>/);
  for (const id of ["number", "note", "email"]) assert.match(html, new RegExp(`<label for="${id}">`));
  assert.match(html, /id="number" name="number" type="tel" inputmode="tel"[^>]*required/);
  assert.match(html, /aria-describedby="number-error"/);
  assert.match(html, /aria-describedby="email-error"/);
  assert.match(html, /aria-describedby="note-count note-error"/);
  assert.match(html, /<textarea id="note"[^>]*maxlength="1000"/);
  assert.match(html, /<input id="email"[^>]*maxlength="254"/);
  assert.equal((html.match(/type="radio" name="reason"/g) || []).length, 4);
  assert.match(html, /value="owner" checked/);
  assert.match(html, /<fieldset class="reasons">\s*<legend>/);
  assert.match(html, /<button class="primary" id="send" type="submit">/);
});

test("trap field: hidden from view and screen readers, out of the tab order", () => {
  assert.match(html, /<div class="trap" aria-hidden="true">[\s\S]*?<input id="website" name="website" type="text" tabindex="-1" autocomplete="off">/);
  assert.match(css, /\.trap \{ position: absolute; left: -10000px;/);
});

test("privacy: no third-party script, font, analytics or cookie; only the dispute function", () => {
  assert.ok(!/<script[^>]+src="https?:/i.test(html), "no remote script");
  assert.ok(!/fonts\.googleapis|fonts\.gstatic|googletagmanager|analytics|gtag|plausible|matomo|facebook|hotjar/i.test(html + css));
  assert.ok(!/document\.cookie|localStorage|sessionStorage/.test(fs.readFileSync(path.join(dir, "itiraz.js"), "utf8")));
  assert.ok(!/@import|url\(/.test(css), "no external css resources");
  assert.match(html, /script-src 'self'; style-src 'self'; img-src 'self'; connect-src https:\/\/\*\.supabase\.co/);
  assert.match(config, /endpoint: "https:\/\/lhhfmhhquzwoavrwmyok\.supabase\.co\/functions\/v1\/summary-dispute"/);
  assert.ok(!/skuwmniihvjswrwjypto/.test(config + html), "no sandbox address");
  assert.ok(!/sb_publishable_|sb_secret_|eyJ/.test(config), "no key in the config");
});

test("touch targets ≥ 44 px; light only; system font", () => {
  assert.match(css, /button\.primary \{[^}]*min-height: 56px/);
  assert.match(css, /\.reason \{[^}]*min-height: 52px/);
  assert.match(css, /input\[type="tel"\], input\[type="email"\], textarea \{[^}]*min-height: 48px/);
  assert.match(css, /color-scheme: light/);
  assert.ok(!/prefers-color-scheme: dark/.test(css));
  assert.match(css, /--font: -apple-system/);
});

// WCAG relative luminance contrast.
function lum(hex) {
  const c = hex.replace("#", "").match(/../g).map((x) => parseInt(x, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function ratio(a, b) { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); }
test("text contrast ≥ 4.5:1 for every text colour on its background", () => {
  const v = Object.fromEntries([...css.matchAll(/--([a-z-]+): (#[0-9A-Fa-f]{6})/g)].map((m) => [m[1], m[2]]));
  const pairs = [["text", "card"], ["text", "bg"], ["secondary", "card"], ["secondary", "bg"], ["orange-text", "card"],
    ["green-text", "bg"], ["green-text", "card"], ["eyebrow-green", "card"], ["text", "green"], ["text", "green-soft"],
    ["text", "well"], ["text", "disabled"]];
  for (const [fg, bg] of pairs) {
    const r = ratio(v[fg], v[bg]);
    assert.ok(r >= 4.5, `${fg} on ${bg}: ${r.toFixed(2)}`);
  }
  assert.match(css, /button\.primary \{[^}]*background: var\(--green\);\s*color: var\(--text\)/);
});
