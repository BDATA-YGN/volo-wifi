"use client";

import { Download, Share, X } from "lucide-react";
import type { MobileActorType } from "../types";
import { useMobilePwaInstall } from "../pwa/useMobilePwaInstall";
import styles from "./mobilePwa.module.css";

interface MobileInstallBannerProps {
  actor: MobileActorType;
}

export default function MobileInstallBanner({ actor }: MobileInstallBannerProps) {
  const {
    config,
    visible,
    installing,
    showIosGuide,
    showAndroidInstall,
    showBrowserHint,
    install,
    dismiss,
  } = useMobilePwaInstall(actor);

  if (!visible) return null;

  return (
    <div className={styles.installBanner} data-actor={actor} role="region" aria-label="Install app">
      <div className={styles.installBannerContent}>
        <div className={styles.installBannerIcon} aria-hidden>
          <Download size={18} />
        </div>
        <div className={styles.installBannerText}>
          <strong>{config.installTitle}</strong>
          <span>{config.installDescription}</span>
          {showIosGuide ? (
            <span className={styles.installIosHint}>
              <Share size={14} aria-hidden />
              Tap Share, then &quot;Add to Home Screen&quot;
            </span>
          ) : null}
          {showBrowserHint ? (
            <span className={styles.installIosHint}>
              Use your browser menu → Install app / Add to Home screen
            </span>
          ) : null}
        </div>
      </div>
      <div className={styles.installBannerActions}>
        {showAndroidInstall ? (
          <button
            type="button"
            className={styles.installBtn}
            disabled={installing}
            onClick={() => void install()}
          >
            {installing ? "Installing…" : "Install"}
          </button>
        ) : null}
        <button type="button" className={styles.installDismissBtn} onClick={dismiss} aria-label="Dismiss">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
