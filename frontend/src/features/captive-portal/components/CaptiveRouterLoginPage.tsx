"use client";

import { useEffect, useMemo, useState } from "react";
import CaptiveShell from "./CaptiveShell";
import NasRedirectForm from "./NasRedirectForm";
import { CAPTIVE_ROUTER_CREDENTIAL_KEY, CAPTIVE_ROUTER_PASSWORD_KEY } from "../constants";
import { hasNasRedirectContext, loadStoredNasParams } from "../utils/nas-params";
import { buildRouterLoginAction, vendorDisplayName } from "../utils/router-redirect";
import { clearRouterHandoffStorage } from "../utils/router-handoff";
import { captiveAuthPath, captiveDashboardPath } from "../subdomain";
import styles from "../captive-portal.module.css";

function goToLogin(): void {
  clearRouterHandoffStorage();
  const authPath = captiveAuthPath(window.location.host);
  // Full navigation avoids Next soft-nav loops when a portal session still exists.
  window.location.replace(authPath);
}

export default function CaptiveRouterLoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  const handoff = useMemo(() => {
    if (typeof window === "undefined") return null;

    const nasParams = loadStoredNasParams();
    const credential = sessionStorage.getItem(CAPTIVE_ROUTER_CREDENTIAL_KEY);
    const nasPassword = sessionStorage.getItem(CAPTIVE_ROUTER_PASSWORD_KEY) ?? undefined;

    if (!nasParams || !credential || !hasNasRedirectContext(nasParams)) {
      return null;
    }

    const action = buildRouterLoginAction(nasParams, credential, { nasPassword });
    if (!action) return null;

    return { action };
  }, []);

  // Incomplete handoff → always return to login (never strand here).
  useEffect(() => {
    if (handoff) return;
    goToLogin();
  }, [handoff]);

  useEffect(() => {
    if (!handoff || started) return;

    const { action } = handoff;
    setStarted(true);

    if (action.form) {
      // GET/POST form auto-submits via NasRedirectForm (Ruijie WiFiDog / ePortal).
      clearRouterHandoffStorage();
      return;
    }

    const target = action.redirectUrl;
    if (!target) {
      setError("Router login URL not found — check NAS redirect parameters.");
      return;
    }

    clearRouterHandoffStorage();
    window.location.replace(target);
  }, [handoff, started]);

  if (!handoff) {
    return (
      <CaptiveShell subtitle="Router handoff">
        <div className={styles.card}>
          <p className={styles.muted}>
            Router connection context is missing — returning to the login page…
          </p>
          <button type="button" className={styles.submitBtn} onClick={goToLogin}>
            Back to login
          </button>
        </div>
      </CaptiveShell>
    );
  }

  const { action } = handoff;
  const vendorLabel = vendorDisplayName(action.vendor);
  const fallbackUrl = action.redirectUrl ?? action.form?.action ?? null;

  return (
    <CaptiveShell subtitle="Connecting to router…">
      <div className={styles.card}>
        <p className={styles.heroEyebrow}>{vendorLabel}</p>
        <h2 className={styles.heroTitle}>Sending credentials to router</h2>
        <p className={styles.muted} style={{ marginTop: "0.5rem" }}>
          Volo login succeeded. Completing {vendorLabel} gateway authentication via RADIUS…
        </p>

        {error ? <div className={styles.errorBanner} role="alert">{error}</div> : null}

        <div className={styles.loadingWrap} style={{ minHeight: "6rem" }}>
          <div className={styles.spinner} aria-label="Connecting to router" />
        </div>

        {action.form ? (
          <NasRedirectForm
            action={action.form.action}
            method={action.form.method}
            fields={action.form.fields}
          />
        ) : null}

        {fallbackUrl ? (
          <p className={styles.muted} style={{ marginTop: "1rem" }}>
            If you are not redirected automatically,{" "}
            <a href={fallbackUrl} onClick={() => clearRouterHandoffStorage()}>
              open this link
            </a>
            .
          </p>
        ) : null}

        <button
          type="button"
          className={styles.ghostBtn}
          style={{ marginTop: "1rem" }}
          onClick={() => {
            clearRouterHandoffStorage();
            window.location.replace(captiveDashboardPath(window.location.host));
          }}
        >
          Continue to dashboard
        </button>
      </div>
    </CaptiveShell>
  );
}
