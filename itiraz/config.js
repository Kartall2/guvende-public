// Web dispute form settings. No key: summary-dispute takes no account and no
// API key on the web path (verify_jwt = false; the function checks everything).
// Default: the SANDBOX function. At release this one line becomes the
// production address (separate, approved step).
window.GVD_DISPUTE_CONFIG = {
  endpoint: "https://skuwmniihvjswrwjypto.supabase.co/functions/v1/summary-dispute"
};
