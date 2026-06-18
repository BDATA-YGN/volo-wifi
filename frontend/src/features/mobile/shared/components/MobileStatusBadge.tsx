import clsx from "clsx";
import type { MobileStatusMeta, MobileStatusTone } from "../mobileStatusTones";
import styles from "./mobileStatus.module.css";

const TONE_CLASS: Record<MobileStatusTone, string> = {
  info: styles.toneInfo,
  success: styles.toneSuccess,
  caution: styles.toneCaution,
  warning: styles.toneWarning,
  danger: styles.toneDanger,
  highlight: styles.toneHighlight,
  neutral: styles.toneNeutral,
};

interface MobileStatusBadgeProps {
  meta: MobileStatusMeta;
  className?: string;
}

export default function MobileStatusBadge({ meta, className }: MobileStatusBadgeProps) {
  return (
    <span className={clsx(styles.badge, TONE_CLASS[meta.tone], className)}>
      {meta.label}
    </span>
  );
}
