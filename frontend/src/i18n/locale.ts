"use server";
import { cookies } from "next/headers";
import { Locale, defaultLocale, locales } from "./config";
import { storageKey } from "@/lib/cacheKeys";

const COOKIE_NAME = storageKey("NEXT_LOCALE");

export async function getUserLocale(): Promise<Locale> {
  const cookie = await cookies();
  const value = cookie.get(COOKIE_NAME)?.value;
  if (value && locales.includes(value as Locale)) {
    return value as Locale;
  }
  return defaultLocale;
}

export async function setUserLocale(locale: Locale) {
  const cookie = await cookies();
  cookie.set(COOKIE_NAME, locale);
}
