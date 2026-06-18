"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CaptiveShell from "./CaptiveShell";
import NasRedirectForm from "./NasRedirectForm";
import { CAPTIVE_ROUTES, CAPTIVE_ROUTER_CREDENTIAL_KEY, CAPTIVE_ROUTER_PASSWORD_KEY } from "../constants";
import { hasNasRedirectContext, loadStoredNasParams } from "../utils/nas-params";
import { buildRouterLoginAction, vendorDisplayName } from "../utils/router-redirect";
import { clearRouterHandoffStorage } from "../utils/router-handoff";
import { captiveDashboardPath } from "../subdomain";
import styles from "../captive-portal.module.css";

export default function CaptiveRouterLoginPage() {
  const router = useRouter();
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

  useEffect(() => {
    if (!handoff || started) return;

    const { action } = handoff;
    setStarted(true);

    if (action.form?.method === "POST") {
      clearRouterHandoffStorage();
      return;
    }

    const target = action.redirectUrl ?? action.form?.action;
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
            Router connection context is missing — return to the login page.
          </p>
          <button
            type="button"
            className={styles.submitBtn}
            onClick={() => router.replace(CAPTIVE_ROUTES.auth)}
          >
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

        {action.form?.method === "POST" ? (
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
            router.replace(captiveDashboardPath(window.location.host));
          }}
        >
          Continue to dashboard
        </button>
      </div>
    </CaptiveShell>
  );
}
