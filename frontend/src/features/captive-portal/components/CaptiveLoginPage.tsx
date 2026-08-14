"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequest } from "ahooks";
import CaptiveShell from "./CaptiveShell";
import { captiveLogin, CaptiveClientError } from "../api/client";
import type { CredentialLoginType } from "../api/types";
import {
  extractNasLocationDebug,
  resolveNasParamsForPage,
  storeNasParams,
} from "../utils/nas-params";
import { hasNasRedirectContext } from "../utils/router-redirect";
import { resolvePostLoginPath, storeRouterHandoff } from "../utils/router-handoff";
import styles from "../captive-portal.module.css";

type LoginMode = CredentialLoginType;

const SITE_MATCH_ERROR_CODES = new Set([
  "TOKEN_LOCATION_UNKNOWN",
  "TOKEN_LOCATION_AMBIGUOUS",
  "TOKEN_SITE_MISMATCH",
]);

interface FormState {
  token: string;
  username: string;
  password: string;
}

export default function CaptiveLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>("VOUCHER_TOKEN");
  const [error, setError] = useState<string | null>(null);
  const [nasError, setNasError] = useState<string | null>(null);
  const [siteMatchFailed, setSiteMatchFailed] = useState(false);
  const [form, setForm] = useState<FormState>({ token: "", username: "", password: "" });

  const { nasParams, gatewayError } = useMemo(() => {
    if (typeof window === "undefined") {
      return { nasParams: undefined, gatewayError: undefined };
    }
    const resolved = resolveNasParamsForPage(window.location.search);
    return { nasParams: resolved.active, gatewayError: resolved.gatewayError };
  }, []);

  const nasDebug = useMemo(() => extractNasLocationDebug(nasParams), [nasParams]);
  const nasHostname =
    typeof nasParams?.hostname === "string" && nasParams.hostname.trim()
      ? nasParams.hostname.trim()
      : undefined;

  useEffect(() => {
    if (nasParams && hasNasRedirectContext(nasParams)) {
      storeNasParams(nasParams);
    }
    if (gatewayError) {
      setNasError(gatewayError);
    }
  }, [nasParams, gatewayError]);

  // Do not auto-redirect from an existing portal cookie/session.
  // User must submit voucher or username/password before leaving this page.

  const { runAsync: submitLogin, loading } = useRequest(
    async () => {
      setError(null);
      setSiteMatchFailed(false);
      const credential =
        mode === "VOUCHER_TOKEN"
          ? form.token.trim().toUpperCase()
          : form.username.trim();

      if (mode === "VOUCHER_TOKEN" && !credential) {
        throw new Error("Voucher code ထည့်ပါ");
      }
      if (mode === "USER_PASSWORD" && (!form.username.trim() || !form.password)) {
        throw new Error("Username နှင့် password ထည့်ပါ");
      }

      await captiveLogin({
        type: mode,
        ...(mode === "VOUCHER_TOKEN"
          ? { token: credential }
          : { username: form.username.trim(), password: form.password }),
        ...(nasParams ? { nasParams } : {}),
      });

      if (nasParams) {
        storeNasParams(nasParams);
      }

      storeRouterHandoff(
        credential,
        // Spec: voucher NAS password = token; account uses form password.
        mode === "USER_PASSWORD" ? form.password : credential,
      );

      const nextPath = resolvePostLoginPath(window.location.host, nasParams ?? null);
      router.replace(nextPath);
    },
    { manual: true },
  );

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await submitLogin();
    } catch (err) {
      const code = err instanceof CaptiveClientError ? err.code : undefined;
      setSiteMatchFailed(Boolean(code && SITE_MATCH_ERROR_CODES.has(code)));
      setError(err instanceof Error ? err.message : "ဝင်ရောက်မှု မအောင်မြင်ပါ");
    }
  };

  const routerHint =
    nasParams && hasNasRedirectContext(nasParams)
      ? "Router မှ redirect လုပ်ထားပါသည် — login ပြီးရင် gateway သို့ အလိုအလျောက် ပြန်ပို့ပါမည်။"
      : null;

  return (
    <CaptiveShell subtitle="WiFi သုံးရန် ဝင်ပါ">
      <div className={styles.card}>
        <p className={styles.heroEyebrow}>Welcome</p>
        <h2 className={styles.heroTitle}>အင်တာနက် ချိတ်ဆက်ရန်</h2>
        <p className={styles.muted} style={{ marginTop: "0.5rem", marginBottom: "1rem" }}>
          Voucher code သို့မဟုတ် အကောင့် ဖြင့် ဝင်ပြီး အင်တာနက် အသုံးပြုနိုင်ပါသည်။
        </p>

        {routerHint ? <div className={styles.infoBanner}>{routerHint}</div> : null}
        {nasError ? <div className={styles.infoBanner}>{nasError}</div> : null}
        {error ? <div className={styles.errorBanner} role="alert">{error}</div> : null}
        {nasDebug || siteMatchFailed ? (
          <div
            className={`${styles.nasDebug} ${siteMatchFailed ? styles.nasDebugError : ""}`}
            role="status"
          >
            <p className={styles.nasDebugTitle}>
              {siteMatchFailed ? "ဆိုင် ရှာမတွေ့ပါ — NAS အချက်အလက်" : "Router NAS"}
            </p>
            {siteMatchFailed ? (
              <p className={styles.nasDebugHint}>
                Site lock uses NAS-Identifier or NAS MAC only. NAS IP is not used. Compare
                NAS-Identifier with Site Directory (MikroTik: /system identity).
              </p>
            ) : null}
            <dl className={styles.nasDebugList}>
              <div>
                <dt>NAS-Identifier</dt>
                <dd>{nasDebug?.nasId ?? "—"}</dd>
              </div>
              <div>
                <dt>NAS MAC</dt>
                <dd>
                  {nasDebug?.nasMac ??
                    (siteMatchFailed ? "not sent (MikroTik Hotspot has no NAS MAC variable)" : "—")}
                </dd>
              </div>
              <div>
                <dt>NAS IP</dt>
                <dd>{nasDebug?.nasIp ?? "—"}</dd>
              </div>
              {nasHostname && nasHostname !== nasDebug?.nasIp ? (
                <div>
                  <dt>hostname</dt>
                  <dd>{nasHostname}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        ) : null}

        <div className={styles.tabs} role="tablist" aria-label="Login method">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "VOUCHER_TOKEN"}
            className={`${styles.tab} ${mode === "VOUCHER_TOKEN" ? styles.tabActive : ""}`}
            onClick={() => setMode("VOUCHER_TOKEN")}
          >
            Voucher
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "USER_PASSWORD"}
            className={`${styles.tab} ${mode === "USER_PASSWORD" ? styles.tabActive : ""}`}
            onClick={() => setMode("USER_PASSWORD")}
          >
            Account
          </button>
        </div>

        <form onSubmit={onSubmit}>
          {mode === "VOUCHER_TOKEN" ? (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="captive-token">
                Voucher code
              </label>
              <input
                id="captive-token"
                className={styles.inputMono}
                value={form.token}
                onChange={(e) => setForm((prev) => ({ ...prev, token: e.target.value }))}
                placeholder="ABCD1234"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                inputMode="text"
                disabled={loading}
              />
            </div>
          ) : (
            <>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="captive-username">
                  Username
                </label>
                <input
                  id="captive-username"
                  className={styles.input}
                  value={form.username}
                  onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                  placeholder="username"
                  autoComplete="username"
                  disabled={loading}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="captive-password">
                  Password
                </label>
                <input
                  id="captive-password"
                  className={styles.input}
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={loading}
                />
              </div>
            </>
          )}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? "ဝင်နေပါသည်…" : "ချိတ်ဆက်မည်"}
          </button>
        </form>
      </div>
    </CaptiveShell>
  );
}
