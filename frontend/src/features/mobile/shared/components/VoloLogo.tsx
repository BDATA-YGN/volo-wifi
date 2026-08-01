import clsx from "clsx";

import { BRAND_FAVICON, BRAND_LOGO, BRAND_LOGO_DARK } from "@/common/brand";

import styles from "./volo-logo.module.css";

export type VoloLogoVariant = "full" | "mark" | "wordmark";

interface VoloLogoProps {
  variant?: VoloLogoVariant;
  className?: string;
  /** Height in pixels; width scales from asset aspect ratio */
  height?: number;
  title?: string;
  /** White plate + color logo — readable on dark login screens */
  plate?: "default" | "white";
}

const VARIANT_CONFIG = {
  mark: { src: BRAND_FAVICON, aspect: 1, darkSrc: BRAND_FAVICON },
  full: { src: BRAND_LOGO, aspect: 1, darkSrc: BRAND_LOGO_DARK },
  wordmark: { src: BRAND_LOGO, aspect: 2.75, darkSrc: BRAND_LOGO_DARK },
} as const;

export default function VoloLogo({
  variant = "full",
  className,
  height = 40,
  title = "VOLO",
  plate = "default",
}: VoloLogoProps) {
  const config = VARIANT_CONFIG[variant];
  const width = Math.round(height * config.aspect);
  const plateClass = plate === "white" ? styles.logoPlate_white : undefined;

  if (variant === "wordmark") {
    return (
      <span
        className={clsx(styles.logoPlate, styles.logoPlate_wordmark, plateClass, className)}
        data-volo-logo-variant={variant}
        style={{ width, height }}
        role="img"
        aria-label={title}
      >
        <span className={styles.wordmarkWrap}>
          <img
            src={config.src}
            alt=""
            aria-hidden
            className={clsx(styles.wordmarkCrop, styles.logoLight)}
            width={width}
            height={height}
            draggable={false}
          />
          <img
            src={config.darkSrc}
            alt=""
            aria-hidden
            className={clsx(styles.wordmarkCrop, styles.logoDark)}
            width={width}
            height={height}
            draggable={false}
          />
        </span>
      </span>
    );
  }

  return (
    <span
      className={clsx(styles.logoPlate, styles[`logoPlate_${variant}`], plateClass, className)}
      data-volo-logo-variant={variant}
    >
      <img
        src={config.src}
        alt={title}
        className={clsx(styles.logoImg, styles.logoLight)}
        width={width}
        height={height}
        draggable={false}
      />
      {config.darkSrc !== config.src && (
        <img
          src={config.darkSrc}
          alt={title}
          className={clsx(styles.logoImg, styles.logoDark)}
          width={width}
          height={height}
          draggable={false}
        />
      )}
    </span>
  );
}
