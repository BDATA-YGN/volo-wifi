export type MobileStatusTone =
  | "info"
  | "success"
  | "caution"
  | "warning"
  | "danger"
  | "highlight"
  | "neutral";

export interface MobileStatusMeta {
  tone: MobileStatusTone;
  label: string;
}
