"use client";

import { useCallback, useEffect, useState } from "react";
import { MOBILE_PWA_CONFIG, pwaDismissStorageKey } from "./config";
import { registerMobileServiceWorker } from "./registerServiceWorker";
import type { MobileActorType } from "../types";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as Window & { MSStream?: unknown }).MSStream
  );
}

export function useMobilePwaInstall(actor: MobileActorType) {
  const config = MOBILE_PWA_CONFIG[actor];
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [showManualHint, setShowManualHint] = useState(false);

  useEffect(() => {
    setInstalled(isStandaloneDisplay());
    setDismissed(localStorage.getItem(pwaDismissStorageKey(actor)) === "1");
    void registerMobileServiceWorker(actor);

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setShowManualHint(false);
    };

    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      setShowManualHint(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    // If the browser never fires beforeinstallprompt, still surface how to install.
    const timer = window.setTimeout(() => {
      if (!isStandaloneDisplay() && !isIosDevice()) {
        setShowManualHint(true);
      }
    }, 2000);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [actor]);

  const dismiss = useCallback(() => {
    localStorage.setItem(pwaDismissStorageKey(actor), "1");
    setDismissed(true);
  }, [actor]);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      if (choice.outcome === "accepted") {
        setInstalled(true);
        return true;
      }
      return false;
    } finally {
      setInstalling(false);
    }
  }, [deferredPrompt]);

  const showIosGuide = isIosDevice() && !installed;
  const showAndroidInstall = Boolean(deferredPrompt) && !installed;
  const showBrowserHint = showManualHint && !showAndroidInstall && !showIosGuide && !installed;
  const visible = !installed && !dismissed && (showIosGuide || showAndroidInstall || showBrowserHint);

  return {
    config,
    visible,
    installed,
    installing,
    showIosGuide,
    showAndroidInstall,
    showBrowserHint,
    install,
    dismiss,
  };
}
