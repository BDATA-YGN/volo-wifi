import { JetBrains_Mono } from "next/font/google";

/**
 * Load JetBrains Mono once in the root layout (server).
 * Do not import this module from client components — Turbopack fails with
 * "next/font/google queries have exactly one entry".
 * Clients should use CSS `var(--font-voucher-code)` / VoucherCodeText.
 */
export const voucherCodeFont = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-voucher-code",
  display: "swap",
});
