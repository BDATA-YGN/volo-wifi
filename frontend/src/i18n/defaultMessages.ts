/** Fallback namespaces so sign-in renders when API/DB lacks keys (cache or unmigrated translations). */

export type MessagesTree = Record<string, Record<string, string>>;

export const defaultMessagesByLocale: Record<string, MessagesTree> = {
  en: {
    login_page: {
      login_text: "VOLO - Subscription",
      label_email: "Username",
      window_desc: "VOLO - Subscription",
      window_title: "VOLO - Subscription",
      label_password: "Password",
      sign_in_success: "Welcome!",
      login_button_text: "Sign In",
      placeholder_email: "Enter your username",
      error_message_email: "Please enter your username",
      placeholder_password: "Enter your password",
      sign_in_success_desc: "You have successfully signed in.",
      error_message_password: "Please enter your password",
      error_invalid_credentials: "Something went wrong! Please try again.",
      error_invalid_account: "We could not find an account with those details.",
      error_message_email_invalid: "Please enter a valid username",
      error_ascii_only: "Only English letters, numbers, and standard keyboard symbols are allowed.",
      error_attempts_remaining:
        "Incorrect username or password. {remaining} of {max} attempts remaining.",
      error_account_locked_countdown:
        "Too many failed attempts. You can sign in again in {countdown}.",
      error_account_blocked: "This account has been blocked. Contact an administrator.",
      readiness_checking: "Checking system connection…",
      readiness_unreachable_title: "Cannot connect to server",
      readiness_unreachable_body:
        "The application cannot reach the API. Check your network connection or try again in a moment.",
      readiness_not_ready_title: "System not ready",
      readiness_not_ready_body:
        "The server is reachable but initial setup is incomplete. Contact your administrator or support team.",
      readiness_support_title: "Need help?",
      readiness_support_body: "If this persists, contact support with the details above.",
      readiness_support_email: "Email",
      readiness_support_phone: "Phone",
      readiness_retry: "Check again",
    },
    LocaleSwitcher: {
      en: "English",
      my: "Burmese",
      ta: "Tamil",
      hi: "Hindi",
      zh: "Chinese",
      ja: "Japanese",
      ko: "Korean",
      fr: "French",
      label: "Language",
    },
  },
  my: {
    login_page: {
      login_text: "VOLO - Subscription",
      label_email: "အသုံးပြုသူအမည်",
      window_desc: "VOLO - Subscription",
      window_title: "VOLO - Subscription",
      label_password: "စကားဝှက်",
      sign_in_success: "ကြိုဆိုပါတယ်။",
      login_button_text: "ဝင်ရောက်ရန်",
      placeholder_email: "သင့်အသုံးပြုသူအမည်ထည့်ပါ",
      error_message_email: "အသုံးပြုသူအမည်ထည့်ပါ",
      placeholder_password: "သင့်စကားဝှက်ထည့်ပါ",
      sign_in_success_desc: "သင်အောင်မြင်စွာ ဝင်ရောက်ပြီးပါပြီ။",
      error_message_password: "စကားဝှက်ထည့်ပါ",
      error_invalid_credentials: "တစ်ခုခုမမှန်ကန်ပါ။ ထပ်မံကြိုးစားပါ။",
      error_invalid_account: "ဤအချက်အလက်များနှင့် အကောင့်မတွေ့ပါ။",
      error_message_email_invalid: "ကျေးဇူးပြု၍ မမှန်ကန်သော အသုံးပြုသူအမည်ထည့်ပါ",
      error_ascii_only: "အင်္ဂလိပ်အက္ခရာ၊ ဂဏန်းနှင့် စံကီးဘုတ်သင်္ကေတများသာ ခွင့်ပြုပါသည်။",
      error_attempts_remaining:
        "အသုံးပြုသူအမည် သို့မဟုတ် စကားဝှက် မမှန်ကန်ပါ။ ကျန်ကြိမ်ရေ {remaining} / {max}",
      error_account_locked_countdown:
        "ကြိမ်ရေများလွန်းသောကြောင့် ယာယီပိတ်ထားပါသည်။ {countdown} အကြာတွင် ထပ်ဝင်ပါ။",
      error_account_blocked: "ဤအကောင့်ကို ပိတ်ထားပါသည်။ စီမံခန့်ခွဲသူကို ဆက်သွယ်ပါ။",
      readiness_checking: "စနစ်ချိတ်ဆက်မှုကို စစ်ဆေးနေပါသည်…",
      readiness_unreachable_title: "ဆာဗာနှင့် ချိတ်ဆက်၍မရပါ",
      readiness_unreachable_body:
        "အက်ပ်က API သို့ ရောက်မရပါ။ အင်တာနက်ချိတ်ဆက်မှုကို စစ်ပြီး ခဏန후 ထပ်ကြိုးစားပါ။",
      readiness_not_ready_title: "စနစ် အဆင်သင့် မဖြစ်သေးပါ",
      readiness_not_ready_body:
        "ဆာဗာသို့ ရောက်နိုင်သော်လည်း အစပြု setup မပြည့်စုံပါ။ Administrator သို့မဟုတ် support ကို ဆက်သွယ်ပါ။",
      readiness_support_title: "အကူအညီ လိုပါသလား?",
      readiness_support_body: "ဆက်မရပါက အထက်ပါ အချက်အလက်များဖြင့် support ကို ဆက်သွယ်ပါ။",
      readiness_support_email: "Email",
      readiness_support_phone: "Phone",
      readiness_retry: "ထပ်စစ်ဆေးရန်",
    },
    LocaleSwitcher: {
      en: "English",
      my: "မြန်မာ",
      ta: "Tamil",
      hi: "Hindi",
      zh: "Chinese",
      ja: "Japanese",
      ko: "Korean",
      fr: "French",
      label: "ဘာသာစကား",
    },
  },
};

export function mergeBootstrapMessages(
  locale: string,
  apiMessages: Record<string, unknown>
): Record<string, unknown> {
  const base = defaultMessagesByLocale[locale] ?? defaultMessagesByLocale.en;
  const login_page = {
    ...base.login_page,
    ...(typeof apiMessages.login_page === "object" && apiMessages.login_page !== null
      ? (apiMessages.login_page as Record<string, string>)
      : {}),
  };
  const LocaleSwitcher = {
    ...base.LocaleSwitcher,
    ...(typeof apiMessages.LocaleSwitcher === "object" && apiMessages.LocaleSwitcher !== null
      ? (apiMessages.LocaleSwitcher as Record<string, string>)
      : {}),
  };
  return {
    ...apiMessages,
    login_page,
    LocaleSwitcher,
  };
}
