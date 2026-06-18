import Cookies from "js-cookie";
import { MOBILE_COOKIES } from "./constants";
import type { MobileActorType } from "./types";

const COOKIE_OPTS = { path: "/", sameSite: "lax" as const };

export function setMobileActorCookie(actorType: MobileActorType, maxAgeSeconds = 60 * 60 * 24 * 7) {
  Cookies.set(MOBILE_COOKIES.ACTOR_TYPE, actorType, { ...COOKIE_OPTS, expires: maxAgeSeconds / 86400 });
}

export function clearMobileActorCookie() {
  Cookies.remove(MOBILE_COOKIES.ACTOR_TYPE, COOKIE_OPTS);
}

export function getMobileActorCookie(): MobileActorType | undefined {
  const value = Cookies.get(MOBILE_COOKIES.ACTOR_TYPE);
  if (value === "collector" || value === "customer") return value;
  return undefined;
}
