// Public settings only. Secret keys never go in the app: they live in the Supabase Edge Function.
window.GILLU = {
  SUPABASE_URL: "https://evxwnmxwxorjdmdwnknc.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_Gbv90otMl_hjRuCUsZxlBg_E5R6w95e",          // the public "publishable" key from Supabase (safe to ship); empty = sign-in not connected yet
  APP_SCHEME: "com.himanshugarg.gillu",   // used to come back into the app after Google sign-in
  DAILY_LIMIT: 5,
};
