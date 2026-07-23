/**
 * Ant Design Tag colors for capacity / station size tiers.
 * Includes canonical codes (SMALL/MEDIUM/LARGE) and migrated legacy codes (PAC/ID/APC).
 */
export const TIER_CODE_COLORS: Record<string, string> = {
  SMALL: "blue",
  MEDIUM: "cyan",
  LARGE: "purple",
  XL: "geekblue",
  // Migrated volo-api-console size codes (AA org)
  PAC: "blue", // Small Site
  ID: "cyan", // Medium Site
  APC: "purple", // Large Site
};

/** Resolve a Tag color from size code and/or display name. */
export function resolveTierColor(code?: string | null, name?: string | null): string {
  const normalizedCode = (code ?? "").trim().toUpperCase();
  if (normalizedCode && TIER_CODE_COLORS[normalizedCode]) {
    return TIER_CODE_COLORS[normalizedCode];
  }

  const normalizedName = (name ?? "").trim().toLowerCase();
  if (/\bsmall\b/.test(normalizedName)) return "blue";
  if (/\bmedium\b|\bmid[\s-]?size\b|\bmid\b/.test(normalizedName)) return "cyan";
  if (/\bx-?large\b|\bxl\b/.test(normalizedName)) return "geekblue";
  if (/\blarge\b/.test(normalizedName)) return "purple";

  return "default";
}
