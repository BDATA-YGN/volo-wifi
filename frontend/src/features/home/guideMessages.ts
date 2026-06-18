/** Local fallback when API translations are not yet restored. */
export type GuideMessagesTree = Record<string, unknown>;

export const guideMessagesByLocale: Record<string, GuideMessagesTree> = {
  en: {
    guideTitle: "StarLink SMS Guide",
    guideSubtitle: "Admin guide for registration, billing, field operations, finance, and reporting.",
    welcome:
      "This console manages StarLink customer registrations, license lifecycle, invoicing, collector visits, payment confirmation, expense approvals, mobile content, and management reports.",
    accessNote:
      "This home page is available to every signed-in user. Individual menus and actions depend on your assigned role and permissions.",
    modulesTitle: "Modules & features",
    workflowsTitle: "Core workflows",
    rulesTitle: "Business rules",
    rolesTitle: "Roles & access",
  },
  my: {
    guideTitle: "StarLink SMS Guide",
    guideSubtitle: "စာရင်းသွင်း၊ Billing၊ Field Operations၊ Finance နှင့် Reports အတွက် Admin လမ်းညွှန်။",
    welcome:
      "ဤ console သည် StarLink customer စာရင်းသွင်း၊ license lifecycle၊ invoicing၊ collector visits၊ payment confirmation၊ expense approvals၊ mobile content နှင့် management reports များကို စီမံခန့်ခွဲပါသည်။",
    accessNote:
      "ဤ Home page ကို sign-in ဝင်ထားသော user အားလုံး ကြည့်ရှုနိုင်ပါသည်။ Menu နှင့် action တစ်ခုချင်းစုက သင့် role နှင့် permission အပေါ် မူတည်ပါသည်။",
    modulesTitle: "Modules & features",
    workflowsTitle: "အဓိက workflows",
    rulesTitle: "Business rules",
    rolesTitle: "Roles & access",
  },
};

export function getGuideString(
  locale: string,
  apiHome: GuideMessagesTree | undefined,
  path: string,
): string {
  const parts = path.split(".");
  const read = (root: GuideMessagesTree | undefined): string | undefined => {
    let cursor: unknown = root;
    for (const part of parts) {
      if (!cursor || typeof cursor !== "object" || !(part in (cursor as object))) {
        return undefined;
      }
      cursor = (cursor as Record<string, unknown>)[part];
    }
    return typeof cursor === "string" ? cursor : undefined;
  };

  return (
    read(apiHome) ??
    read(guideMessagesByLocale[locale]) ??
    read(guideMessagesByLocale.en) ??
    path
  );
}
