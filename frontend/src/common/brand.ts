import type { Metadata } from "next";

/** Square V mark — favicon, app icons, compact header mark */
export const BRAND_FAVICON = "/assets/fav.svg";

/** Full VOLO logo (mark + wordmark) — light surfaces */
export const BRAND_LOGO = "/assets/volo-logo.svg";

/** Full VOLO logo on dark surfaces (black canvas) */
export const BRAND_LOGO_DARK = "/assets/volo%20logo.png";

export const BRAND_METADATA_ICONS: NonNullable<Metadata["icons"]> = {
  icon: [{ url: BRAND_FAVICON, type: "image/svg+xml" }],
  shortcut: [{ url: BRAND_FAVICON, type: "image/svg+xml" }],
  apple: [{ url: BRAND_FAVICON, type: "image/svg+xml" }],
};

export const BRAND_PWA_ICON = {
  src: BRAND_FAVICON,
  sizes: "any",
  type: "image/svg+xml",
} as const;
