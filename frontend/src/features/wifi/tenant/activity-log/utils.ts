export function formatActionLabel(action: string): string {
  return action
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

export function formatEntityLabel(entity: string | null): string {
  if (!entity) return "—";
  return entity.replace(/([a-z])([A-Z])/g, "$1 $2");
}

export function summarizeMeta(meta: Record<string, unknown> | null): string | null {
  if (!meta || typeof meta !== "object") return null;
  const entries = Object.entries(meta).slice(0, 3);
  if (!entries.length) return null;
  return entries
    .map(([key, value]) => {
      const display =
        value === null || value === undefined
          ? "—"
          : typeof value === "object"
            ? JSON.stringify(value)
            : String(value);
      return `${key}: ${display}`;
    })
    .join(" · ");
}
