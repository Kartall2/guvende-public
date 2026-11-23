// Web dispute form settings. No key: summary-dispute takes no account and no
// API key on the web path (verify_jwt = false; the function checks everything).
// Production function (1.1.0 Aşama 3, Samet's "evet" 23 Kas 2026).
window.GVD_DISPUTE_CONFIG = {
  endpoint: "https://lhhfmhhquzwoavrwmyok.supabase.co/functions/v1/summary-dispute"
};
