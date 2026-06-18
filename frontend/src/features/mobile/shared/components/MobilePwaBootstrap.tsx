"use client";

import { useEffect } from "react";
import { registerMobileServiceWorker } from "../pwa/registerServiceWorker";
import type { MobileActorType } from "../types";

/** Registers the scoped service worker on every mobile route (including login). */
export default function MobilePwaBootstrap({ actor }: { actor: MobileActorType }) {
  useEffect(() => {
    void registerMobileServiceWorker(actor);
  }, [actor]);

  return null;
}
