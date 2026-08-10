import { JetBrains_Mono } from "next/font/google";

/**
 * Shared access-token / voucher code typeface.
 * Apply `voucherCodeFont.variable` on <html> so --font-voucher-code loads app-wide.
 */
export const voucherCodeFont = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-voucher-code",
  display: "swap",
});
