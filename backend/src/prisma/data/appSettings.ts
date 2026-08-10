export type AppSettingValueType   = "STRING" | "NUMBER" | "BOOLEAN" | "JSON";
export type AppSettingControlType =
  | "TEXT"       // short single-line input
  | "TEXTAREA"   // plain multi-line textarea (no formatting)
  | "RICHTEXT"   // Quill WYSIWYG → outputs HTML (mobile & web ready)
  | "MARKDOWN"   // legacy: plain textarea + preview (raw markdown)
  | "NUMBER"     // numeric input
  | "BOOLEAN"    // toggle switch (auto-saves)
  | "JSON"       // key/value row editor
  | "LIST"       // tag-input for simple string arrays
  | "IMAGE"      // FilePicker (single) + thumbnail + url input
  | "IMAGE_LIST" // FilePicker (multiple) + thumbnail strip
  | "SELECT";    // dropdown with `options`

export interface AppSettingSeed {
  key:          string;
  value:        string;
  defaultValue?: string | null;
  valueType:    AppSettingValueType;
  controlType?: AppSettingControlType | null;
  options?:     string | null;
  category?:    string | null;
  sortOrder?:   number;
  labelEn?:     string | null;
  labelMy?:     string | null;
  description?: string | null;
  isPublic?:    boolean;
}

// ── helpers ────────────────────────────────────────────────────────────────
const jstr = (v: any) => JSON.stringify(v);
const selectOpts = (items: { label: string; value: string }[]) => jstr(items);

// ── seed data (Volo WiFi — admin console, tenant licensing, commerce, auth) ─
const appSettingsData: AppSettingSeed[] = [

  // ── category: app — branding & console UI ───────────────────────────────

  {
    key: "app_name", value: "Volo WiFi", defaultValue: "Volo WiFi",
    valueType: "STRING", controlType: "TEXT",
    category: "app", sortOrder: 1, isPublic: true,
    labelEn: "System name (console)", labelMy: "စနစ် အမည် (console)",
    description: "Shown in dashboard header, footer, and browser title.",
  },
  {
    key: "app_short_code", value: "VOLO", defaultValue: "VOLO",
    valueType: "STRING", controlType: "TEXT",
    category: "app", sortOrder: 2, isPublic: true,
    labelEn: "Short code (sidebar)", labelMy: "အတိုကောက် (sidebar)",
    description: "Short label next to the logo when sidebar text is enabled.",
  },
  {
    key: "app_version", value: "1.0.0", defaultValue: "1.0.0",
    valueType: "STRING", controlType: "TEXT",
    category: "app", sortOrder: 3, isPublic: true,
    labelEn: "App version", labelMy: "App version",
    description: "Displayed in the footer and sign-in page for reference.",
  },
  {
    key: "app_icon", value: "/img/logo.png", defaultValue: "/img/logo.png",
    valueType: "STRING", controlType: "IMAGE",
    category: "app", sortOrder: 4, isPublic: true,
    labelEn: "Console logo", labelMy: "Console logo",
    description: "Logo in the sidebar and header. Upload or enter a URL.",
  },
  {
    key: "login_text", value: "Welcome to Volo WiFi", defaultValue: "Welcome to Volo WiFi",
    valueType: "STRING", controlType: "TEXT",
    category: "app", sortOrder: 5, isPublic: true,
    labelEn: "Sign-in headline", labelMy: "Login ခေါင်းစဉ်",
    description: "Headline on the admin sign-in page.",
  },
  {
    key: "login_icon", value: "/img/logo.png", defaultValue: "/img/logo.png",
    valueType: "STRING", controlType: "IMAGE",
    category: "app", sortOrder: 6, isPublic: true,
    labelEn: "Sign-in page logo", labelMy: "Login logo",
    description: "Logo or icon on the sign-in page.",
  },
  {
    key: "show_menu_logo", value: "true", defaultValue: "true",
    valueType: "BOOLEAN", controlType: "BOOLEAN",
    category: "app", sortOrder: 7, isPublic: true,
    labelEn: "Show sidebar logo", labelMy: "Sidebar logo ပြရန်",
    description: "When enabled, the logo appears in the sidebar.",
  },
  {
    key: "show_menu_text", value: "true", defaultValue: "true",
    valueType: "BOOLEAN", controlType: "BOOLEAN",
    category: "app", sortOrder: 8, isPublic: true,
    labelEn: "Show sidebar text", labelMy: "Sidebar စာသား ပြရန်",
    description: "When enabled, the short code is shown beside the logo in the sidebar.",
  },
  {
    key: "notifications_enabled", value: "true", defaultValue: "true",
    valueType: "BOOLEAN", controlType: "BOOLEAN",
    category: "app", sortOrder: 9, isPublic: true,
    labelEn: "Enable notifications", labelMy: "Notification ဖွင့်ရန်",
    description: "In-console notification bell and related alerts.",
  },
  {
    key: "site_name", value: "Volo WiFi", defaultValue: "Volo WiFi",
    valueType: "STRING", controlType: "TEXT",
    category: "app", sortOrder: 10, isPublic: true,
    labelEn: "Public product name", labelMy: "ထုတ်ကုန် အမည်",
    description: "Name shown on public surfaces (e.g. portal, emails).",
  },
  {
    key: "site_description",
    value: "Volo WiFi — managed WiFi platform for tenant onboarding, site licensing, partner commerce, and RADIUS operations.",
    defaultValue: "Volo WiFi — managed WiFi platform for tenant onboarding, site licensing, partner commerce, and RADIUS operations.",
    valueType: "STRING", controlType: "TEXTAREA",
    category: "app", sortOrder: 11, isPublic: true,
    labelEn: "Product tagline", labelMy: "ထုတ်ကုန် ဖော်ပြချက်",
    description: "Short description for about screens, metadata, or onboarding.",
  },
  {
    key: "app_copyright", value: "Brainwave Data", defaultValue: "Brainwave Data",
    valueType: "STRING", controlType: "TEXT",
    category: "app", sortOrder: 12, isPublic: true,
    labelEn: "Copyright / powered-by name", labelMy: "မူပိုင်ခွင့် / powered-by",
    description: "Legal or vendor name shown on the sign-in footer.",
  },
  {
    key: "app_website", value: "https://www.brainwavedata.com", defaultValue: "https://www.brainwavedata.com",
    valueType: "STRING", controlType: "TEXT",
    category: "app", sortOrder: 13, isPublic: true,
    labelEn: "Company website", labelMy: "Company website",
    description: "Link shown on the sign-in page.",
  },
  {
    key: "app_facebook", value: "", defaultValue: "",
    valueType: "STRING", controlType: "TEXT",
    category: "app", sortOrder: 14, isPublic: true,
    labelEn: "Company Facebook", labelMy: "Company Facebook",
    description: "Optional social link on the sign-in page.",
  },
  {
    key: "app_build_number", value: "1", defaultValue: "1",
    valueType: "NUMBER", controlType: "NUMBER",
    category: "app", sortOrder: 15, isPublic: true,
    labelEn: "Build number", labelMy: "Build number",
    description: "Internal build number on the sign-in footer.",
  },
  {
    key: "default_locale", value: "en", defaultValue: "en",
    valueType: "STRING", controlType: "SELECT",
    options: selectOpts([
      { label: "English", value: "en" },
      { label: "Myanmar", value: "my" },
    ]),
    category: "app", sortOrder: 16, isPublic: true,
    labelEn: "Default language", labelMy: "မူရင်း ဘာသာစကား",
    description: "Default UI language when the user has no preference.",
  },
  {
    key: "default_theme", value: "dark", defaultValue: "dark",
    valueType: "STRING", controlType: "SELECT",
    options: selectOpts([
      { label: "Light", value: "light" },
      { label: "Dark",  value: "dark"  },
    ]),
    category: "app", sortOrder: 17, isPublic: true,
    labelEn: "Default console theme", labelMy: "Console theme",
    description: "Default light or dark theme for the admin console.",
  },

  // ── category: legal — policies (ရခိုင်ဘာသာ) ─────────────────────────────

  {
    key: "privacy_policy_md",
    value: "<h1>အချက်အလက် ကာကွယ်ရေးမူဝါဒ</h1><p>Volo WiFi စီမံခန့်ခွဲမှုစနစ်သည် tenant၊ partner၊ ဝန်ထမ်းနှင့် အသုံးပြုသူများ၏ ကိုယ်ရေးအချက်အလက်ကို လုံခြုံစွာ ကိုင်တွယ်ပါသည်။</p><h2>ကျွန်ုပ်တို့ စုဆောင်းသော အချက်အလက်</h2><ul><li>အမည်၊ ဆက်သွယ်ရန်ဖုန်းနံပါတ်၊ လိပ်စာ</li><li>Tenant / site / NAS စက်ပစ္စည်း အချက်အလက်</li><li>ဝန်ဆောင်မှုအစီအစဉ်၊ access token၊ ငွေပေးချေမှတ်တမ်း</li><li>RADIUS session နှင့် အသုံးပြုမှု မှတ်တမ်း</li><li>Admin console ဝင်ရောက်မှတ်တမ်း (လုံခြုံရေးအတွက်)</li></ul><h2>အသုံးပြုရခြင်း ရည်ရွယ်ချက်</h2><ul><li>Site licensing နှင့် လစဉ် SaaS ငွေချေစီမံခန့်ခွဲမှု</li><li>Partner commerce၊ access token ထုတ်ပေးခြင်းနှင့် ငွေပေးချေမှတ်တမ်း</li><li>WiFi network နှင့် RADIUS လုပ်ငန်းဆောင်ရွက်မှု</li><li>အသုံးပြုမှု analytics နှင့် reconciliation</li></ul><h2>အချက်အလက် ထိန်းသိမ်းခြင်း</h2><p>ငွေချေ၊ ဝန်ဆောင်မှုနှင့် လုံခြုံရေးဆိုင်ရာ မှတ်တမ်းများကို ဥပဒေနှင့် လုပ်ငန်းလိုအပ်ချက်အရ လိုအပ်သည့်အချိန်အထိ သိမ်းဆည်းပါသည်။ Admin ဝန်ထမ်းများသာ အခန်းကဏ္ဍအလိုက် ဝင်ရောက်ကြည့်ရှုနိုင်ပါသည်။</p><h2>အချက်အလက် မျှဝေခြင်း</h2><p>အသုံးပြုသူအချက်အလက်ကို တတိယပါတီသို့ ရောင်းချခြင်း မပြုပါ။ ဥပဒေအရ တောင်းဆိုမှု သို့မဟုတ် လုံခြုံရေးအရေးပေါ်ဖြစ်ရပ်များတွင် သက်ဆိုင်ရာအာဏာပိုင်များနှင့် ပူးပေါင်းဆောင်ရွက်နိုင်ပါသည်။</p><h2>သင်၏ အခွင့်အရေးများ</h2><p>မိမိအချက်အလက် မှားယွင်းနေပါက Support ဆက်သွယ်ရန်မှတဆင့် ပြင်ဆင်ခွင့် တောင်းဆိုနိုင်ပါသည်။</p><h2>ဆက်သွယ်ရန်</h2><p>ကိုယ်ရေးအချက်အလက် ဆိုင်ရာ မေးမြန်းမှုများအတွက် Support ဆက်သွယ်ရန် အချက်အလက်ကို console တွင် ကြည့်ရှုနိုင်ပါသည်။</p>",
    defaultValue: "<h1>အချက်အလက် ကာကွယ်ရေးမူဝါဒ</h1><p>Volo WiFi စီမံခန့်ခွဲမှုစနစ်သည် tenant၊ partner၊ ဝန်ထမ်းနှင့် အသုံးပြုသူများ၏ ကိုယ်ရေးအချက်အလက်ကို လုံခြုံစွာ ကိုင်တွယ်ပါသည်။</p>",
    valueType: "STRING", controlType: "RICHTEXT",
    category: "legal", sortOrder: 1, isPublic: true,
    labelEn: "Privacy policy", labelMy: "ကိုယ်ရေးအချက်အလက် မူဝါဒ",
    description: "Privacy policy for tenants, partners, operators, and staff (Rakhine).",
  },
  {
    key: "terms_and_conditions_md",
    value: "<h1>စည်းကမ်းချက်များ</h1><p>Volo WiFi Admin console နှင့် ဆက်စပ်ဝန်ဆောင်မှုများကို အသုံးပြုခြင်းသည် အောက်ပါ စည်းကမ်းများကို လက်ခံခြင်းဖြစ်ပါသည်။</p><h2>ဝန်ဆောင်မှုအကြောင်း</h2><p>ဤစနစ်သည် WiFi tenant စီမံခန့်ခွဲမှု၊ site licensing၊ partner commerce၊ access token ထုတ်ပေးခြင်း၊ RADIUS network လုပ်ငန်းဆောင်ရွက်မှုနှင့် ငွေချေစီမံခန့်ခွဲမှုတို့ကို ပံ့ပိုးပေးပါသည်။</p><h2>Tenant နှင့် Partner တာဝန်</h2><ul><li>လစဉ် license နှင့် ငွေချေစာရင်းကို သတ်မှတ်ရက်အတွင်း ပေးဆောင်ရန်</li><li>မှန်ကန်သော ဆက်သွယ်ရန်နှင့် site အချက်အလက် ထားရှိရန်</li><li>ခွင့်ပြုထားသော plan နှင့် site အတွင်းသာ access token ထုတ်ပေးရန်</li><li>အကောင့် လုံခြုံရေးနှင့် role-based access ကို ထိန်းသိမ်းရန်</li></ul><h2>ဝန်ထမ်းတာဝန်</h2><ul><li>ငွေပေးချေမှု၊ order နှင့် session မှတ်တမ်းကို မှန်ကန်စွာ မှတ်တမ်းတင်ရန်</li><li>အသုံးပြုသူအချက်အလက်ကို ခွင့်ပြုချက်မရှိဘဲ မျှဝေခြင်း မပြုရန်</li><li>Admin console ကို တာဝန်ယူထားသော အခန်းကဏ္ဍအတွက်သာ အသုံးပြုရန်</li></ul><h2>ငွေပေးချေမှု</h2><p>Partner သို့မဟုတ် Admin မှ မှတ်တမ်းတင်သော ငွေပေးချေမှုအချို့သည် Finance အတည်ပြုချက် (Pending) အခြေအနေတွင် ရှိနိုင်ပါသည်။ အတည်မပြုမီ ငွေပေးချေပြီးကြောင်း တရားဝင်အဖြစ် မသတ်မှတ်ပါ။</p><h2>မှားယွင်းအသုံးပြုမှု</h2><p>စနစ်ကို ခွင့်မပြုသော ဝင်ရောက်မှု၊ မှတ်တမ်းအတုဖန်တီးမှု သို့မဟုတ် အချက်အလက်ခိုးယူမှုကို တားမြစ်ပြီး လိုအပ်ပါက ဥပဒေအရ အရေးယူနိုင်ပါသည်။</p><h2>စည်းကမ်းပြောင်းလဲမှု</h2><p>ဝန်ဆောင်မှုအခြေအနေနှင့် ဥပဒေပြောင်းလဲမှုအလိုက် ဤစည်းကမ်းများကို ပြင်ဆင်နိုင်ပါသည်။</p>",
    defaultValue: "<h1>စည်းကမ်းချက်များ</h1><p>Volo WiFi Admin console နှင့် ဆက်စပ်ဝန်ဆောင်မှုများကို အသုံးပြုခြင်းသည် အောက်ပါ စည်းကမ်းများကို လက်ခံခြင်းဖြစ်ပါသည်။</p>",
    valueType: "STRING", controlType: "RICHTEXT",
    category: "legal", sortOrder: 2, isPublic: true,
    labelEn: "Terms and conditions", labelMy: "စည်းကမ်းချက်များ",
    description: "Terms of use for Volo WiFi admin console and related services (Rakhine).",
  },
  {
    key: "about_us_md",
    value: "<h1>Volo WiFi အကြောင်း</h1><p><strong>Volo WiFi</strong> သည် managed WiFi platform အတွက် tenant onboarding၊ site licensing၊ service plan catalog၊ partner commerce၊ access token ထုတ်ပေးခြင်းနှင့် RADIUS network လုပ်ငန်းဆောင်ရွက်မှုများကို တစ်နေရာတည်းတွင် ဆောင်ရွက်နိုင်ရန် Brainwave Data မှ တည်ဆောက်ထားသော စနစ်ဖြစ်ပါသည်။</p><h2>Platform Admin အတွက်</h2><ul><li>Tenant စာရင်းသွင်းခြင်းနှင့် subscription စီမံခန့်ခွဲမှု</li><li>Capacity tier နှင့် platform tier rates သတ်မှတ်ခြင်း</li><li>Cross-tenant analytics နှင့် system configuration</li></ul><h2>Tenant Admin အတွက်</h2><ul><li>Site၊ plan၊ pricing နှင့် partner စီမံခန့်ခွဲမှု</li><li>Internal account နှင့် role assignment</li><li>Voucher runs နှင့် network policy configuration</li></ul><h2>Partner အတွက်</h2><ul><li>Partner workspace မှ access token ထုတ်ပေးခြင်း</li><li>Order နှင့် payment မှတ်တမ်းတင်ခြင်း</li><li>Partner-scoped sales analytics</li></ul><h2>Finance</h2><p>Admin console မှ subscription၊ လစဉ် invoice၊ reconciliation နှင့် revenue reporting များကို ဆောင်ရွက်နိုင်ပါသည်။</p><p>ကျေးဇူးတင်ပါသည် — Volo WiFi</p>",
    defaultValue: "<h1>Volo WiFi အကြောင်း</h1><p><strong>Volo WiFi</strong> သည် managed WiFi platform အတွက် tenant onboarding၊ site licensing၊ partner commerce နှင့် RADIUS operations များကို တစ်နေရာတည်းတွင် ဆောင်ရွက်နိုင်ရန် တည်ဆောက်ထားသော စနစ်ဖြစ်ပါသည်။</p>",
    valueType: "STRING", controlType: "RICHTEXT",
    category: "legal", sortOrder: 3, isPublic: true,
    labelEn: "About us", labelMy: "ကျွန်ုပ်တို့အကြောင်း",
    description: "About Volo WiFi for help and public screens (Rakhine).",
  },

  // ── category: support ─────────────────────────────────────────────────────

  {
    key: "support_contacts",
    value: jstr({
      address: "Yangon, Myanmar", email: "support@brainwavedata.com", phone: "+95 9 0000 00000",
      facebook: "", instagram: "", twitter: "", youtube: "", linkedin: "",
      tiktok: "", telegram: "", wechat: "", whatsapp: "", line: "",
      direction: "", heroImages: [],
    }),
    defaultValue: jstr({
      address: "Yangon, Myanmar", email: "support@brainwavedata.com", phone: "+95 9 0000 00000",
      facebook: "", instagram: "", twitter: "", youtube: "", linkedin: "",
      tiktok: "", telegram: "", wechat: "", whatsapp: "", line: "",
      direction: "", heroImages: [],
    }),
    valueType: "JSON", controlType: "JSON",
    category: "support", sortOrder: 1, isPublic: true,
    labelEn: "Support contacts", labelMy: "Support ဆက်သွယ်ရန်",
    description: "IT support: address, email, phone, and optional social links.",
  },

  // ── category: ops — availability (no fleet / ride logic) ─────────────────

  {
    key: "maintenance_mode", value: "false", defaultValue: "false",
    valueType: "BOOLEAN", controlType: "BOOLEAN",
    category: "ops", sortOrder: 1, isPublic: true,
    labelEn: "Maintenance mode", labelMy: "Maintenance mode",
    description: "When enabled, clients can show a maintenance state instead of normal use.",
  },
  {
    key: "maintenance_message",
    value: "Volo WiFi is under scheduled maintenance. Please try again shortly.",
    defaultValue: "Volo WiFi is under scheduled maintenance. Please try again shortly.",
    valueType: "STRING", controlType: "TEXTAREA",
    category: "ops", sortOrder: 2, isPublic: true,
    labelEn: "Maintenance message", labelMy: "Maintenance စာသား",
    description: "Message shown while maintenance mode is on.",
  },

  // ── Log retention ──────────────────────────────────────────────────────
  // Read by the `log-cleanup` cron job in `backend/src/jobs/`.

  {
    key: "log_cleanup_enabled", value: "true", defaultValue: "true",
    valueType: "BOOLEAN", controlType: "BOOLEAN",
    category: "ops", sortOrder: 10, isPublic: false,
    labelEn: "Enable log cleanup job", labelMy: "Log cleanup ဖွင့်ထား",
    description: "Periodically delete old audit and login logs based on the retention values below.",
  },
  {
    key: "log_cleanup_cron", value: "0 3 * * *", defaultValue: "0 3 * * *",
    valueType: "STRING", controlType: "TEXT",
    category: "ops", sortOrder: 11, isPublic: false,
    labelEn: "Log cleanup schedule (cron)", labelMy: "Cleanup cron expression",
    description: "Standard 5-field cron expression. Default: every day at 03:00.",
  },
  {
    key: "audit_log_retention_days", value: "90", defaultValue: "90",
    valueType: "NUMBER", controlType: "NUMBER",
    category: "ops", sortOrder: 12, isPublic: false,
    labelEn: "Audit log retention (days)", labelMy: "Audit log သိမ်းရက်",
    description: "Audit log rows older than this many days are deleted by the cleanup job. Set 0 to keep forever.",
  },
  {
    key: "login_log_retention_days", value: "60", defaultValue: "60",
    valueType: "NUMBER", controlType: "NUMBER",
    category: "ops", sortOrder: 13, isPublic: false,
    labelEn: "Login log retention (days)", labelMy: "Login log သိမ်းရက်",
    description: "Login log rows older than this many days are deleted by the cleanup job. Set 0 to keep forever.",
  },
  {
    key: "log_cleanup_batch_size", value: "5000", defaultValue: "5000",
    valueType: "NUMBER", controlType: "NUMBER",
    category: "ops", sortOrder: 14, isPublic: false,
    labelEn: "Log cleanup batch size", labelMy: "Cleanup batch အရွယ်",
    description: "Maximum rows deleted per query loop, to keep table locks short.",
  },

  // ── Reporting aggregation (pre-aggregated stat tables — not operational) ─
  // Read by `reporting-aggregate.job.ts`.

  {
    key: "reporting_aggregate_enabled", value: "true", defaultValue: "true",
    valueType: "BOOLEAN", controlType: "BOOLEAN",
    category: "ops", sortOrder: 20, isPublic: false,
    labelEn: "Enable reporting aggregate job", labelMy: "Reporting aggregate ဖွင့်ရန်",
    description: "Rebuilds rpt_daily_sales_stat and rpt_daily_radius_usage_stat from operational tables.",
  },
  {
    key: "reporting_aggregate_cron", value: "15 * * * *", defaultValue: "15 * * * *",
    valueType: "STRING", controlType: "TEXT",
    category: "ops", sortOrder: 21, isPublic: false,
    labelEn: "Reporting aggregate schedule (cron)", labelMy: "Aggregate cron",
    description: "Default: every hour at :15. Re-processes recent UTC days for late-arriving orders/sessions.",
  },
  {
    key: "reporting_aggregate_lookback_days", value: "3", defaultValue: "3",
    valueType: "NUMBER", controlType: "NUMBER",
    category: "ops", sortOrder: 22, isPublic: false,
    labelEn: "Aggregate lookback (days)", labelMy: "Aggregate lookback (ရက်)",
    description: "How many UTC calendar days (including today) to rebuild each aggregate tick.",
  },
  {
    key: "reporting_rollup_enabled", value: "true", defaultValue: "true",
    valueType: "BOOLEAN", controlType: "BOOLEAN",
    category: "ops", sortOrder: 23, isPublic: false,
    labelEn: "Enable monthly/yearly rollup job", labelMy: "Rollup job ဖွင့်ရန်",
    description: "Rolls daily stats into monthly and yearly sales tables for closed periods.",
  },
  {
    key: "reporting_rollup_cron", value: "30 2 1 * *", defaultValue: "30 2 1 * *",
    valueType: "STRING", controlType: "TEXT",
    category: "ops", sortOrder: 24, isPublic: false,
    labelEn: "Rollup schedule (cron)", labelMy: "Rollup cron",
    description: "Default: 02:30 on the 1st of each month (org TZ). Yearly rollup runs in January.",
  },
  {
    key: "reporting_stats_retention_days", value: "1095", defaultValue: "1095",
    valueType: "NUMBER", controlType: "NUMBER",
    category: "ops", sortOrder: 25, isPublic: false,
    labelEn: "Daily stats retention (days)", labelMy: "Daily stats retention",
    description: "Purges rpt_daily_* rows older than this (~3 years). Monthly/yearly stats are kept. Set 0 to keep forever.",
  },

  // ── Operational archive (credentials, sales, RADIUS, captive portal) ────
  // Read by `ops-archive.job.ts`.

  {
    key: "ops_archive_enabled", value: "true", defaultValue: "true",
    valueType: "BOOLEAN", controlType: "BOOLEAN",
    category: "ops", sortOrder: 30, isPublic: false,
    labelEn: "Enable operational archive job", labelMy: "Ops archive ဖွင့်ရန်",
    description: "Archives or purges hot operational tables (credentials, orders, RADIUS sessions) in batches.",
  },
  {
    key: "ops_archive_cron", value: "30 4 * * *", defaultValue: "30 4 * * *",
    valueType: "STRING", controlType: "TEXT",
    category: "ops", sortOrder: 31, isPublic: false,
    labelEn: "Operational archive schedule (cron)", labelMy: "Ops archive cron",
    description: "Default: daily at 04:30. Runs after aggregate job window.",
  },
  {
    key: "ops_archive_batch_size", value: "500", defaultValue: "500",
    valueType: "NUMBER", controlType: "NUMBER",
    category: "ops", sortOrder: 32, isPublic: false,
    labelEn: "Ops archive batch size", labelMy: "Ops archive batch",
    description: "Rows processed per loop to keep table locks short.",
  },
  {
    key: "credential_archive_grace_days", value: "7", defaultValue: "7",
    valueType: "NUMBER", controlType: "NUMBER",
    category: "ops", sortOrder: 33, isPublic: false,
    labelEn: "Credential archive grace (days)", labelMy: "Credential archive grace",
    description: "Days after EXPIRED / CONSUMED / REVOKED before wf_credential moves to archive. Active tokens are never archived.",
  },
  {
    key: "credential_archive_retention_days", value: "2555", defaultValue: "2555",
    valueType: "NUMBER", controlType: "NUMBER",
    category: "ops", sortOrder: 34, isPublic: false,
    labelEn: "Credential archive retention (days)", labelMy: "Credential archive retention",
    description: "Purges wf_credential_archive rows older than this (~7 years). Set 0 to keep forever.",
  },
  {
    key: "captive_portal_retention_days", value: "14", defaultValue: "14",
    valueType: "NUMBER", controlType: "NUMBER",
    category: "ops", sortOrder: 35, isPublic: false,
    labelEn: "Captive portal retention (days)", labelMy: "Captive portal retention",
    description: "Purges wf_captive_portal_session rows older than this (no archive table).",
  },
  {
    key: "radius_session_hot_retention_days", value: "30", defaultValue: "30",
    valueType: "NUMBER", controlType: "NUMBER",
    category: "ops", sortOrder: 36, isPublic: false,
    labelEn: "RADIUS session hot retention (days)", labelMy: "RADIUS hot retention",
    description: "Stopped wf_radius_session rows older than this move to wf_radius_session_archive.",
  },
  {
    key: "radius_session_archive_retention_days", value: "730", defaultValue: "730",
    valueType: "NUMBER", controlType: "NUMBER",
    category: "ops", sortOrder: 37, isPublic: false,
    labelEn: "RADIUS session archive retention (days)", labelMy: "RADIUS archive retention",
    description: "Purges archived session rows older than this (2 years). Set 0 to keep forever.",
  },
  {
    key: "sale_order_hot_retention_days", value: "180", defaultValue: "180",
    valueType: "NUMBER", controlType: "NUMBER",
    category: "ops", sortOrder: 38, isPublic: false,
    labelEn: "Sale order hot retention (days)", labelMy: "Sale order hot retention",
    description: "PAID / VOID / REFUNDED orders older than this are snapshotted to wf_sale_order_archive.",
  },
  {
    key: "sale_order_draft_retention_days", value: "30", defaultValue: "30",
    valueType: "NUMBER", controlType: "NUMBER",
    category: "ops", sortOrder: 39, isPublic: false,
    labelEn: "Draft order retention (days)", labelMy: "Draft order retention",
    description: "DRAFT wf_sale_order rows older than this are deleted (not archived).",
  },
  {
    key: "sale_order_archive_retention_days", value: "2555", defaultValue: "2555",
    valueType: "NUMBER", controlType: "NUMBER",
    category: "ops", sortOrder: 40, isPublic: false,
    labelEn: "Sale order archive retention (days)", labelMy: "Sale archive retention",
    description: "Purges wf_sale_order_archive rows older than this (~7 years). Set 0 to keep forever.",
  },

  // ── category: developer — auth & security (admin console / mobile API) ───

  {
    key: "jwt_secret_key", value: "supersecuret", defaultValue: "supersecuret",
    valueType: "STRING", controlType: "TEXT",
    category: "developer", sortOrder: 1, isPublic: false,
    labelEn: "JWT signing secret", labelMy: "JWT secret key",
    description: "Signing secret for admin console and mobile API tokens. Override via environment in production.",
  },
  {
    key: "token_expire_duration", value: "1h", defaultValue: "15m",
    valueType: "STRING", controlType: "TEXT",
    category: "developer", sortOrder: 2, isPublic: false,
    labelEn: "Access token lifetime", labelMy: "Access token ကြာချိန်",
    description: "Admin console access token and cookie lifetime (e.g. 15m, 1h).",
  },
  {
    key: "refresh_token_expire_duration", value: "7d", defaultValue: "7d",
    valueType: "STRING", controlType: "TEXT",
    category: "developer", sortOrder: 3, isPublic: false,
    labelEn: "Refresh token lifetime", labelMy: "Refresh token ကြာချိန်",
    description: "Admin console refresh token and mobile session lifetime (e.g. 7d, 30d).",
  },
  {
    key: "dev_max_login_attempts", value: "5", defaultValue: "5",
    valueType: "NUMBER", controlType: "NUMBER",
    category: "developer", sortOrder: 4, isPublic: false,
    labelEn: "Max admin sign-in attempts", labelMy: "Login ကြိမ်ရေ ကန့်သတ်",
    description: "Failed admin console sign-in attempts before temporary lockout.",
  },
  {
    key: "dev_login_lock_duration_minutes", value: "30", defaultValue: "30",
    valueType: "NUMBER", controlType: "NUMBER",
    category: "developer", sortOrder: 5, isPublic: false,
    labelEn: "Admin lockout duration (minutes)", labelMy: "Lock ကြာချိန် (min)",
    description: "How long an admin account stays locked after too many failures.",
  },
  {
    key: "dev_login_attempt_window_minutes", value: "10", defaultValue: "10",
    valueType: "NUMBER", controlType: "NUMBER",
    category: "developer", sortOrder: 6, isPublic: false,
    labelEn: "Admin attempt window (minutes)", labelMy: "Login window (min)",
    description: "Sliding window in which failed admin sign-in attempts are counted.",
  },
  {
    key: "otp_secret", value: "bdata24242", defaultValue: "bdata24242",
    valueType: "STRING", controlType: "TEXT",
    category: "developer", sortOrder: 7, isPublic: false,
    labelEn: "OTP secret (legacy)", labelMy: "OTP secret key",
    description: "Legacy TOTP/OTP secret for core auth helpers. Not used by WiFi captive portal login.",
  },
  {
    key: "otp_cool_down_duration", value: "30s", defaultValue: "30s",
    valueType: "STRING", controlType: "TEXT",
    category: "developer", sortOrder: 8, isPublic: false,
    labelEn: "OTP cooldown (legacy)", labelMy: "OTP cooldown",
    description: "Legacy OTP cooldown. Not used by WiFi captive portal login.",
  },
  {
    key: "otp_expire_duration", value: "1h", defaultValue: "1h",
    valueType: "STRING", controlType: "TEXT",
    category: "developer", sortOrder: 9, isPublic: false,
    labelEn: "OTP expiry (legacy)", labelMy: "OTP သက်တမ်း",
    description: "Legacy OTP validity duration.",
  },
  {
    key: "otp_limit_per_time_frame", value: "1h", defaultValue: "1h",
    valueType: "STRING", controlType: "TEXT",
    category: "developer", sortOrder: 10, isPublic: false,
    labelEn: "OTP rate-limit window (legacy)", labelMy: "OTP rate limit",
    description: "Legacy OTP rate-limit window.",
  },
  {
    key: "otp_time_frame_duration", value: "1h", defaultValue: "1h",
    valueType: "STRING", controlType: "TEXT",
    category: "developer", sortOrder: 11, isPublic: false,
    labelEn: "OTP time-frame (legacy)", labelMy: "OTP time frame",
    description: "Legacy OTP time-frame duration.",
  },

  // ── category: wifi — Volo WiFi (licensing, billing, commerce) ─────────
  // Setting keys retain the `sms_` prefix for backward compatibility with existing code.

  {
    key: "sms_invoice_number_prefix", value: "INV", defaultValue: "INV",
    valueType: "STRING", controlType: "TEXT",
    category: "wifi", sortOrder: 1, isPublic: false,
    labelEn: "Org invoice number prefix", labelMy: "Org invoice နံပါတ် ရှေ့ဆက်",
    description: "Monthly OrgInvoice numbers use {PREFIX}-{YYYYMM}-{seq} (e.g. INV-202506-0001).",
  },
  {
    key: "sms_invoice_default_due_days", value: "14", defaultValue: "14",
    valueType: "NUMBER", controlType: "NUMBER",
    category: "wifi", sortOrder: 2, isPublic: false,
    labelEn: "Default invoice due (days)", labelMy: "Invoice ပေးချေရက် (ရက်)",
    description: "When creating an OrgInvoice without a due date, due = issued date + this many days. Set 0 for no default due date.",
  },
  {
    key: "sms_support_ticket_prefix", value: "TKT", defaultValue: "TKT",
    valueType: "STRING", controlType: "TEXT",
    category: "wifi", sortOrder: 3, isPublic: false,
    labelEn: "Support ticket prefix", labelMy: "Ticket နံပါတ် ရှေ့ဆက်",
    description: "Support ticket numbers use {PREFIX}-{YYYY}-{seq} (e.g. TKT-2026-00001). Reserved for future use.",
  },
  {
    key: "sms_company_legal_name", value: "Brainwave Data", defaultValue: "Brainwave Data",
    valueType: "STRING", controlType: "TEXT",
    category: "wifi", sortOrder: 4, isPublic: true,
    labelEn: "Platform / issuer name", labelMy: "Platform / issuer အမည်",
    description: "Legal or trading name on OrgInvoices, receipts, licenses, and tenant-facing documents.",
  },
  {
    key: "sms_billing_contact_email", value: "billing@brainwavedata.com", defaultValue: "billing@brainwavedata.com",
    valueType: "STRING", controlType: "TEXT",
    category: "wifi", sortOrder: 5, isPublic: true,
    labelEn: "Billing contact email", labelMy: "Billing အီးမေးလ်",
    description: "Shown on OrgInvoices and payment notices for tenant billing enquiries.",
  },
  {
    key: "sms_overdue_grace_days", value: "0", defaultValue: "0",
    valueType: "NUMBER", controlType: "NUMBER",
    category: "wifi", sortOrder: 6, isPublic: false,
    labelEn: "Overdue grace (days)", labelMy: "Overdue grace (ရက်)",
    description: "Extra days after the due date before an OrgInvoice counts as overdue in stats and filters.",
  },
  {
    key: "sms_customer_portal_enabled", value: "true", defaultValue: "true",
    valueType: "BOOLEAN", controlType: "BOOLEAN",
    category: "wifi", sortOrder: 7, isPublic: false,
    labelEn: "Captive portal enabled", labelMy: "Captive portal ဖွင့်ရန်",
    description: "When off, end-user captive portal login is discouraged in the admin UI.",
  },
  {
    key: "captive_login_ip_rate_limit_enabled", value: "true", defaultValue: "true",
    valueType: "BOOLEAN", controlType: "BOOLEAN",
    category: "wifi", sortOrder: 71, isPublic: false,
    labelEn: "Captive login same-IP rate limit", labelMy: "Captive same-IP rate limit",
    description:
      "Throttle failed/frequent captive logins per NAS client IP (MikroTik ip / Ruijie wlanuserip). Does not use portal/proxy public IP. Override with CAPTIVE_LOGIN_IP_RATE_LIMIT_ENABLED env if set.",
  },
  {
    key: "sms_payments_require_finance_confirm", value: "true", defaultValue: "true",
    valueType: "BOOLEAN", controlType: "BOOLEAN",
    category: "wifi", sortOrder: 8, isPublic: false,
    labelEn: "Payments require finance confirmation", labelMy: "Finance confirm လိုအပ်ရန်",
    description: "Partner and retail payments are recorded as PENDING until Finance confirms (recommended).",
  },
  {
    key: "sms_invoice_footer_note",
    value: "Volo WiFi ဝန်ဆောင်မှုကို ရွေးချယ်ပေးသောအတွက် ကျေးဇူးတင်ပါသည်။ မေးမြန်းလိုပါက billing ဆက်သွယ်ရန်သို့ ဆက်သွယ်ပါ။",
    defaultValue: "Volo WiFi ဝန်ဆောင်မှုကို ရွေးချယ်ပေးသောအတွက် ကျေးဇူးတင်ပါသည်။",
    valueType: "STRING", controlType: "TEXTAREA",
    category: "wifi", sortOrder: 9, isPublic: false,
    labelEn: "Invoice footer note", labelMy: "Invoice အောက်ခြေ မှတ်ချက်",
    description: "Optional note appended to printed or exported OrgInvoices.",
  },
  {
    key: "currency_code", value: "MMK", defaultValue: "MMK",
    valueType: "STRING", controlType: "SELECT",
    options: selectOpts([
      { label: "Myanmar Kyat (MMK)", value: "MMK" },
      { label: "US Dollar (USD)",    value: "USD" },
      { label: "Thai Baht (THB)",    value: "THB" },
      { label: "Singapore Dollar (SGD)", value: "SGD" },
    ]),
    category: "wifi", sortOrder: 10, isPublic: true,
    labelEn: "Default currency (ISO)", labelMy: "ငွေကြေး (ISO)",
    description: "Default ISO currency code for OrgInvoices, SaleOrders, payments, and amount displays.",
  },
  {
    key: "currency_symbol", value: "Ks", defaultValue: "Ks",
    valueType: "STRING", controlType: "TEXT",
    category: "wifi", sortOrder: 11, isPublic: true,
    labelEn: "Currency symbol / suffix", labelMy: "ငွေကြေး သင်္ကေတ",
    description: "Symbol or suffix shown after amounts when no per-record currency is set (e.g. MMK, Ks).",
  },
  {
    key: "commerce_access_token_revoke_window_minutes", value: "15", defaultValue: "15",
    valueType: "NUMBER", controlType: "NUMBER",
    category: "wifi", sortOrder: 12, isPublic: false,
    labelEn: "Partner revoke window (minutes after sale)", labelMy: "Partner revoke ကာလ (မိနစ်)",
    description:
      "Partners may revoke a sold access token only within this many minutes after soldAt. Org staff and developers are not limited. Set 0 to disable the window for partners.",
  },

  // ── Conversations ───────────────────────────────────────────────────────
  // Roles excluded from the "Start a direct message" recipient picker.
  // Compare is case-insensitive against `MngRoles.roleName`.
  {
    key: "dev_direct_chat_excluded_roles",
    value: jstr([]),
    defaultValue: jstr([]),
    valueType: "JSON", controlType: "LIST",
    category: "developer", sortOrder: 12, isPublic: false,
    labelEn: "Roles hidden from Direct Chat",
    labelMy: "Direct Chat မှ ဖျောက်ထားသော Role များ",
    description:
      "Admins whose role matches any value here are hidden from the New DM recipient picker. Compares case-insensitively against MngRoles.roleName (e.g. \"DEVELOPER\", \"SYSTEM\").",
  },
];

export default appSettingsData;
