export type AppSettingValueType = "STRING" | "NUMBER" | "BOOLEAN" | "JSON";

export type AppSettingControlType =
  | "TEXT"        // short single-line input
  | "TEXTAREA"    // plain multi-line textarea (no formatting)
  | "RICHTEXT"    // WYSIWYG (Jodit) → HTML; preview renders sanitized HTML
  | "MARKDOWN"    // legacy: plain textarea with preview — kept for backward compat
  | "NUMBER"
  | "BOOLEAN"
  | "JSON"
  | "LIST"
  | "IMAGE"
  | "IMAGE_LIST"
  | "SELECT";

export interface AppSettingAttributes {
  id: string;
  key: string;
  value: string;
  defaultValue?: string | null;
  valueType: AppSettingValueType;
  controlType?: AppSettingControlType | null;
  /** JSON string — array of { label, value } for SELECT controlType. */
  options?: string | null;
  category?: string | null;
  sortOrder?: number;
  labelEn?: string | null;
  labelMy?: string | null;
  description?: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Categories shown as tabs on the App Settings page.
 * Aligned with seed data in `backend/src/prisma/data/appSettings.ts`.
 */
export const APP_SETTING_CATEGORIES = [
  { key: "app",       labelEn: "App / UI",   labelMy: "App / UI" },
  { key: "wifi",      labelEn: "WiFi / Billing", labelMy: "WiFi / Billing" },
  { key: "legal",     labelEn: "Legal",      labelMy: "Legal" },
  { key: "support",   labelEn: "Support",    labelMy: "Support" },
  { key: "ops",       labelEn: "Operations", labelMy: "Operations" },
  { key: "developer", labelEn: "Developer",  labelMy: "Developer" },
] as const;

export type AppSettingCategory = (typeof APP_SETTING_CATEGORIES)[number]["key"];
