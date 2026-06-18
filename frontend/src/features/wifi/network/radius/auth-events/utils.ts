import type { AuthEventOutcome } from "./types";

export function formatMac(mac: string | null | undefined): string {
  if (!mac) return "—";
  const clean = mac.replace(/[^a-fA-F0-9]/g, "");
  if (clean.length !== 12) return mac;
  return clean.match(/.{1,2}/g)?.join(":").toUpperCase() ?? mac;
}

export function formatOutcomeLabel(outcome: AuthEventOutcome): string {
  if (outcome === "ACCEPT") return "Accept";
  if (outcome === "REJECT") return "Reject";
  return "Unknown";
}
