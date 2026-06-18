import type { ContentTypeFilter } from "./types";

export const CONTENT_TYPE_FILTERS: { value: ContentTypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "NOTICE", label: "Notices" },
  { value: "GUIDE", label: "Guides" },
  { value: "POLICY", label: "Policies" },
];

export const CONTENT_TYPE_LABEL: Record<string, string> = {
  NOTICE: "Notice",
  GUIDE: "Guide",
  POLICY: "Policy",
};
