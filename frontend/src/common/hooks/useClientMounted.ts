"use client";

import { useEffect, useState } from "react";

/** True after the first client commit — safe to run effects that update React state. */
export function useClientMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}
