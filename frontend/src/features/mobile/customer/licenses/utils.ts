import dayjs from "dayjs";
import { formatCurrency, formatCurrencyCompact } from "@/common/utils/formatCurrency";
import {
  cadenceLabel,
  effectiveIntervalMonths,
  starlinkTypeLabel,
} from "@/features/mobile/shared/plan-utils";
import {
  KIT_STATUS_LABEL,
  LICENSE_CLASS_LABEL,
  LICENSE_STATUS_LABEL,
} from "./constants";
import type { MobileLicense } from "./types";

export function formatLicenseAmount(
  amount: number | null | undefined,
  currency?: string,
  compact = false,
): string {
  return compact ? formatCurrencyCompact(amount, currency) : formatCurrency(amount, currency);
}

export function licenseStatusLabel(status: string): string {
  return LICENSE_STATUS_LABEL[status] ?? status;
}

export function licenseClassLabel(licenseClass: string): string {
  return LICENSE_CLASS_LABEL[licenseClass] ?? licenseClass;
}

export function kitStatusLabel(status: string): string {
  return KIT_STATUS_LABEL[status] ?? status.replace(/_/g, " ");
}

export function formatLicenseDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("D MMM YYYY") : null;
}

export function licenseStatusTone(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "statusActive";
    case "SUSPENDED":
      return "statusSuspended";
    case "TERMINATED":
      return "statusTerminated";
    default:
      return "statusDefault";
  }
}

export function isPaidThroughExpired(paidThroughAt: string | null | undefined): boolean {
  if (!paidThroughAt) return false;
  return dayjs(paidThroughAt).isBefore(dayjs(), "day");
}

export function isPaidThroughSoon(paidThroughAt: string | null | undefined): boolean {
  if (!paidThroughAt || isPaidThroughExpired(paidThroughAt)) return false;
  return dayjs(paidThroughAt).diff(dayjs(), "day") <= 7;
}

export function planBillingLabel(plan: MobileLicense["plan"]): string | null {
  if (!plan) return null;
  const cadence = cadenceLabel(plan.billingCadence);
  if (plan.billingCadence === "CUSTOM") {
    const months = effectiveIntervalMonths(plan.billingCadence, plan.intervalMonths);
    return `${cadence} · every ${months} mo`;
  }
  return cadence;
}

export function planPeriodFee(plan: MobileLicense["plan"]): number | null {
  if (!plan) return null;
  const months = effectiveIntervalMonths(plan.billingCadence, plan.intervalMonths);
  return plan.monthlyFee * months;
}

export function kitLocationLabel(kit: MobileLicense["kit"]): string | null {
  if (!kit) return null;
  const parts = [kit.township, kit.addressLine1].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

export function kitMapsUrl(kit: MobileLicense["kit"]): string | null {
  if (!kit?.latitude || !kit?.longitude) return null;
  return `https://www.google.com/maps?q=${kit.latitude},${kit.longitude}`;
}

export function deviceTypeLabel(type: string | null | undefined): string {
  if (!type) return "—";
  return starlinkTypeLabel(type);
}

export function summarizeLicenses(licenses: MobileLicense[]) {
  return {
    total: licenses.length,
    activeCount: licenses.filter((l) => l.status === "ACTIVE").length,
    suspendedCount: licenses.filter((l) => l.status === "SUSPENDED").length,
    withDeviceCount: licenses.filter((l) => l.kit != null).length,
  };
}

export function licenseNeedsAttention(license: MobileLicense): boolean {
  return (
    license.status === "SUSPENDED" ||
    isPaidThroughExpired(license.paidThroughAt) ||
    isPaidThroughSoon(license.paidThroughAt)
  );
}

export function isLicenseCertificatable(status: string): boolean {
  return status === "ACTIVE" || status === "SUSPENDED";
}

export async function downloadDataUrlPng(
  dataUrl: string,
  filename: string,
): Promise<{ ok: boolean; message?: string }> {
  const { downloadDataUrl } = await import("@/features/mobile/shared/pwa/mobileDownload");
  const safeName = filename.endsWith(".png") ? filename : `${filename}.png`;
  return downloadDataUrl(dataUrl, safeName);
}

export function certificateQrFilename(licenseCode: string): string {
  const safe = licenseCode.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-|-$/g, "");
  return `${safe || "license"}-certificate-qr.png`;
}
