"use client";

import { useEffect, useState } from "react";

/** Aligns with Ant Design `lg` (Sider `breakpoint="lg"`) and Tailwind `lg`. */
export const BREAKPOINT_LG = 992;

/** Aligns with Tailwind `md` and `MasterTable` mobile list switch. */
export const BREAKPOINT_MD = 768;

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);

    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/** Viewport width ≤ 768px */
export function useIsMobile(): boolean {
  return useMediaQuery(`(max-width: ${BREAKPOINT_MD}px)`);
}

/** Viewport width ≤ 992px (tablet / narrow desktop — sidebar drawer mode) */
export function useIsTabletDown(): boolean {
  return useMediaQuery(`(max-width: ${BREAKPOINT_LG}px)`);
}

export default useIsMobile;
