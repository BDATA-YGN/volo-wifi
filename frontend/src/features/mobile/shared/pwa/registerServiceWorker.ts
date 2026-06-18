import { MOBILE_PWA_CONFIG } from "./config";
import type { MobileActorType } from "../types";

export async function registerMobileServiceWorker(actor: MobileActorType): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const { serviceWorkerPath, scope } = MOBILE_PWA_CONFIG[actor];

  try {
    const existing = await navigator.serviceWorker.getRegistration(scope);
    if (existing?.active?.scriptURL.includes(serviceWorkerPath)) return;

    await navigator.serviceWorker.register(serviceWorkerPath, { scope, updateViaCache: "none" });
  } catch (error) {
    console.warn(`[PWA] Service worker registration failed (${actor})`, error);
  }
}
