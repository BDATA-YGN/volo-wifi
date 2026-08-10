"use client";

import type { CSSProperties, ReactNode } from "react";
import { Typography } from "antd";
import { voucherCodeFont } from "../voucher-code-font";
import styles from "./VoucherCodeText.module.css";

export { voucherCodeFont } from "../voucher-code-font";

export const voucherCodeFontClassName = `${voucherCodeFont.className} ${styles.voucherCode}`;

export const VOUCHER_CODE_FONT_STACK =
  'var(--font-voucher-code), "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

export const voucherCodeTextStyle: CSSProperties = {
  fontFamily: VOUCHER_CODE_FONT_STACK,
  fontVariantNumeric: "slashed-zero",
  fontFeatureSettings: '"zero" 1',
  letterSpacing: "0.08em",
  fontSynthesis: "none",
};

function renderCodeChars(value: string): ReactNode[] {
  return Array.from(value).map((ch, index) => {
    if (ch === "0") {
      return (
        <span key={`${index}-0`} className={styles.zero}>
          0
        </span>
      );
    }
    return (
      <span key={`${index}-${ch}`} className={styles.char}>
        {ch}
      </span>
    );
  });
}

type Props = {
  /** Full or masked token / code string */
  value: string;
  className?: string;
  style?: CSSProperties;
  title?: string;
  /** Block layout (sale card / detail hero). Default inline. */
  block?: boolean;
  /** Show Ant Design copy control. */
  copyable?: boolean;
  /** Text copied when different from display (e.g. full token while UI is masked). */
  copyText?: string;
};

export function VoucherCodeText({
  value,
  className,
  style,
  title,
  block = false,
  copyable = false,
  copyText,
}: Props) {
  const classNames = [
    voucherCodeFont.className,
    styles.voucherCode,
    block ? styles.voucherCodeBlock : styles.voucherCodeInline,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const code = (
    <span className={classNames} style={style} title={title ?? value}>
      {renderCodeChars(value)}
    </span>
  );

  if (!copyable) return code;

  return (
    <span className={styles.copyWrap}>
      {code}
      <Typography.Text
        copyable={{
          text: copyText ?? value,
          tooltips: ["Copy code", "Copied"],
        }}
      />
    </span>
  );
}

export default VoucherCodeText;
