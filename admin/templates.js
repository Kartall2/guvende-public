// Ready-made alert texts. The admin edits them before saving or publishing;
// nothing here is published on its own.
window.GVD_ALERT_TEMPLATES = [
  {
    id: "fake_cargo",
    label: "Sahte kargo SMS'i",
    severity: "high",
    title: "Sahte kargo SMS'leri yayılıyor",
    body: "Kargonuzun teslim edilemediğini ya da gümrükte beklediğini söyleyen SMS'ler gönderiliyor. Mesajdaki bağlantı, küçük bir ücret ödemenizi isteyerek kart bilgilerinizi çalmak için hazırlanmış sahte bir sayfaya gidiyor.",
    protection: [
      "SMS'teki bağlantıya tıklamayın.",
      "Kargonuzu yalnız kargo firmasının kendi uygulamasından veya sitesinden takip edin.",
      "Kart bilgisi girdiyseniz hemen bankanızı arayıp kartınızı kapattırın."
    ]
  },
  {
    id: "fake_institution_call",
    label: "Sahte banka/kurum araması",
    severity: "high",
    title: "Banka ve kurum adına sahte aramalar",
    body: "Kendini banka, emniyet, savcılık ya da bir kamu kurumu çalışanı olarak tanıtan kişiler arayarak hesabınızın tehlikede olduğunu söylüyor; SMS ile gelen kodu, kart bilgilerinizi ya da para transferi istiyor. Arayan numara gerçek bir kurum numarası gibi görünebilir.",
    protection: [
      "Telefonda hiçbir kodu, şifreyi veya kart bilgisini paylaşmayın.",
      "Aramayı kapatın ve kurumu kendi bulduğunuz resmî numaradan arayın.",
      "Bankalar ve kamu kurumları sizden para transferi veya \"güvenli hesap\" istemez."
    ]
  },
  {
    id: "deposit_listing",
    label: "Kapora/ilan dolandırıcılığı",
    severity: "attention",
    title: "İlan sitelerinde kapora dolandırıcılığı",
    body: "Araç, ev veya ikinci el ürün ilanlarında satıcı, ürünü ayırmak için önceden kapora istiyor. Para gönderildikten sonra satıcıya ulaşılamıyor; ilan çoğu zaman piyasanın altında bir fiyatla verilmiş oluyor.",
    protection: [
      "Ürünü veya kişiyi görmeden kapora göndermeyin.",
      "Ödemeyi ilan sitesinin güvenli ödeme sistemiyle yapın.",
      "IBAN'daki alıcı adının ilandaki kişiyle aynı olduğunu kontrol edin."
    ]
  },
  {
    id: "fake_investment",
    label: "Sahte yatırım/kripto",
    severity: "high",
    title: "Yüksek kazanç vaat eden sahte yatırım teklifleri",
    body: "Sosyal medya reklamları ve mesajlaşma grupları üzerinden kısa sürede yüksek kazanç vaat eden yatırım ve kripto para teklifleri yapılıyor. Önce küçük kazançlar gösterilip daha büyük para yatırılması isteniyor; sonra para çekilemiyor.",
    protection: [
      "Garantili veya çok yüksek kazanç vaat eden tekliflere güvenmeyin.",
      "Kurumun yetkili olup olmadığını SPK'nın sitesinden kontrol edin.",
      "Ekran paylaşımı veya uzaktan erişim uygulaması kurmayın."
    ]
  },
  {
    id: "whatsapp_takeover",
    label: "WhatsApp hesap ele geçirme",
    severity: "high",
    title: "WhatsApp hesaplarını ele geçirme girişimleri",
    body: "Bir tanıdığınızın hesabından ya da bir kurum adına mesaj atılarak size gelen 6 haneli WhatsApp doğrulama kodu isteniyor. Kod paylaşıldığında hesap ele geçiriliyor ve rehberinizdekilerden para isteniyor.",
    protection: [
      "WhatsApp doğrulama kodunu kimseyle paylaşmayın.",
      "WhatsApp'ta iki adımlı doğrulamayı açın.",
      "Para isteyen tanıdığınızı mutlaka telefonla arayarak teyit edin."
    ]
  }
];
