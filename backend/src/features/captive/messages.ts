/**
 * Captive portal API messages (Rakhine / Arakanese).
 * Keep in sync with captive-portal i18n locales where codes match.
 */

export const captiveErrors = {
  INVALID_CREDENTIAL: 'Token သို့မဟုတ် account မှားနီပါရေ။',
  CREDENTIAL_PAUSED: 'ဆိုင်မှ ပြန်ဖွင့်မပေးမချင်း ဤ code ကို အသုံးမပြုနိုင်သေးပါ။',
  CREDENTIAL_INACTIVE: 'ဤ code ကို အသုံးမပြုနိုင်တော့ပါ။',
  CREDENTIAL_EXPIRED: 'ဤ code သည် သက်တမ်းကုန်ပြီးပါယာ။',
  CREDENTIAL_CONSUMED:
    'ဤ code သည် အသုံးပြုပြီးဖြစ်ပါရေ။ ပြန်ဝင်ခွင့် မရှိပါယာ။ ဆိုင်မှ code အသစ် ထပ်ဝယ်သုံးပါ။',
  RADIUS_SESSION_ACTIVE:
    'ဖုန်း တစ်လုံးမှာ အသုံးပြုနီပြီးဖြစ်ပါရေ။ ယင်းဖုန်းက လိုင်းဖြုတ်ပါ သို့မဟုတ် တနားစောင့်ပြီးမှ ပြန်ဝင်ပါ။',
  CAPTIVE_LOGIN_WINDOW_EXPIRED:
    'ဤ plan အတွက် သတ်မှတ်ထားသော အချိန်ကျော်လွန်လားပါယာ။ Login မလုပ်နိုင်ပါယာ။',
  DEVICE_LIMIT_REACHED:
    'ချိတ်ဆက်နိုင်သော ဖုန်း အရေအတွက် ပြည့်နီပါရေ။ အခြား ဖုန်း တစ်ခုကို ဖြုတ်ပြီးမှ ဝင်ပါ။',
  TOKEN_SITE_MISMATCH:
    'ဤ code သည် အခြား ဆိုင်အတွက် ဖြစ်ပါရေ။ ဤဆိုင်တွင် အသုံးမပြုနိုင်ပါ။',
  TOKEN_LOCATION_UNKNOWN:
    'ဆိုင် တည်နေရာ အတည်မပြုနိုင်ပါ။ ဝိုင်ဖိုင် ပြန်ချိတ်ပြီးမှ ကြိုးစားပါ။',
  TOKEN_LOCATION_AMBIGUOUS:
    'ဆိုင် တည်နေရာ မရှင်းလင်းပါ။ ဆိုင်မှ အကူအညီ တောင်းပါ။',
  NO_TIME_REMAINING: 'သင့် plan တွင် အချိန် မကျန်တော့ပါ။',
  NO_DATA_REMAINING: 'သင့် plan တွင် Data မကျန်တော့ပါ။',
  UNAUTHORIZED: 'Authentication လိုအပ်ပါရေ။',
  INVALID_PAYLOAD: 'nasParams အချက်အလက် လိုအပ်ပါရေ။',
  TOO_MANY_REQUESTS:
    'မကြာမကြာ ဝင်ရောက်ကြိုးစားနီလို့ ပိတ်ထားပါရေ။ မိနစ်အနည်းငယ် စောင့်ပြီးမှ ပြန်ကြိုးစားပါ။',
  INTERNAL_SERVER_ERROR: 'စနစ်အတွင်း အမှားဖြစ်နီပါရေ။',
} as const;

export function captiveDeviceLimitReached(maxDevices: number): string {
  return `ဤ voucher ကို ခွင့်ပြုထားသော ဖုန်း ${maxDevices} လုံးတွင် အသုံးပြုပြီးဖြစ်ပါရေ။ အခြား ဖုန်းကို ဖြုတ်ပြီးမှ ဝင်ပါ။`;
}

export const captiveSuccess = {
  LOGIN: 'အောင်မြင်စွာ ဝင်ရောက်ပြီးပါယာ',
  LOGOUT: 'အောင်မြင်စွာ ထွက်ပြီးပါယာ',
  SESSION_SAVED: 'ချိတ်ဆက်မှု သိမ်းပြီးပါယာ',
  SESSION_NONE: 'ချိတ်ဆက်မှု မရှိပါ',
  OK: 'အောင်မြင်ပါရေ',
  SERVER_RUNNING: 'Server အလုပ်လုပ်နီပါရေ',
  DASHBOARD_RETRIEVED: 'Dashboard အချက်အလက် ရယူပြီးပါယာ',
  USAGE_RETRIEVED: 'အသုံးပြုမှု အချက်အလက် ရယူပြီးပါယာ',
  CONNECTION_RETRIEVED: 'ချိတ်ဆက်မှု အချက်အလက် ရယူပြီးပါယာ',
  PLAN_RETRIEVED: 'Plan နှင့် လက်ကျန် အချက်အလက် ရယူပြီးပါယာ',
  PLANS: 'Package များ',
  NO_CREDENTIAL: 'အသုံးပြုသူအမည်/ token မရှိပါ',
  NO_PLAN: 'Plan မရှိပါ',
  DEFAULT_USER: 'အသုံးပြုသူ',
} as const;

export const captiveConnection = {
  ONLINE: 'သင့် ဖုန်း သည် online ဖြစ်နီပြီး အသုံးပြုရန် အဆင်သင့်ဖြစ်ပါရေ',
  OFFLINE: 'မချိတ်ဆက်ရသေးပါ',
} as const;

const planTypeLabels: Record<string, string> = {
  TIME_ONLY: 'အချိန်အလိုက်',
  DATA_ONLY: 'Data အလိုက်',
  TIME_AND_DATA: 'အချိန်နှင့် Data',
};

const credentialStatusLabels: Record<string, string> = {
  ACTIVATED: 'အသုံးပြုရန် ဖွင့်ထားပြီး',
  SOLD: 'ရောင်းပြီး',
  EXPIRED: 'သက်တမ်းကုန်ပြီး',
  CONSUMED: 'အသုံးပြုပြီး',
  PAUSED: 'ယာယီရပ်ထားပြီး (reseller)',
  REVOKED: 'ပိတ်သိမ်းထားပြီး',
};

export function captivePlanQuotaTypeLabel(quotaType: string): string {
  return planTypeLabels[quotaType] ?? quotaType ?? 'မသိရှိပါ';
}

export function captiveCredentialStatusLabel(status: string): string {
  return credentialStatusLabels[status] ?? status ?? 'မသိရှိပါ';
}
