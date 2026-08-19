import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";
import type { DiagnoseSeverity } from "./types";

export const COMMERCE_TOKEN_DIAGNOSE_API = buildWifiApiRoutes("/wifi/commerce/token-diagnose");

export const SEVERITY_ALERT: Record<DiagnoseSeverity, "success" | "info" | "warning" | "error"> = {
  ok: "success",
  info: "info",
  warning: "warning",
  error: "error",
};
