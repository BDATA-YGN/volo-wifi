import dayjs from "dayjs";

export function excerptBody(body: string, maxLength = 140): string {
  const normalized = body.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trimEnd()}…`;
}

export function formatContentDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("D MMM YYYY") : null;
}
