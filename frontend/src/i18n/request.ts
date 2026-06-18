import { getRequestConfig } from "next-intl/server";
import { getUserLocale } from "./locale";
import { cacheLife } from "next/cache";
import { mergeBootstrapMessages } from "./defaultMessages";
import { cacheTag } from "@/lib/cacheKeys";

export const getMessages = async (locale: string) => {
  'use cache'
  try {
    const apiUrl = process.env.API_URL;
    cacheLife("translation");
    const response = await fetch(`${apiUrl}/translations/${locale}`, {
      headers: {
        "Content-Type": "application/json",
      },
      // Don't send cookies for translations
      credentials: "omit",
      // Next.js fetch caching
      next: {
        tags: [cacheTag('translation')],
      }
    });

    if (!response.ok) {
      console.warn(`Translation fetch failed: ${response.status}`);
      return mergeBootstrapMessages(locale, {});
    }

    const data = await response.json();
    const raw = (data?.data?.messages as Record<string, unknown>) || {};
    return mergeBootstrapMessages(locale, raw);
  } catch (error) {
    console.error("Error fetching translations:", error);
    return mergeBootstrapMessages(locale, {});
  }
};

export const getAppSettings = async () => {
  'use cache'
  try {
    const apiUrl = process.env.API_URL;
    cacheLife("apps");
    const response = await fetch(`${apiUrl}/app-settings/public/app-shell`, {
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "omit",
      next: {
        tags: [cacheTag('app-settings')],
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch app settings: ${response.status}`);
    }

    const data = await response.json();
    return data?.data || {};
  } catch (error) {
    console.error("Error fetching app settings:", error);
    return {};
  }
};

export default getRequestConfig(async () => {
  const locale = await getUserLocale();
  return {
    locale,
    messages: (await getMessages(locale)) as any,
  };
});
