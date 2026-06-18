"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequest } from "ahooks";
import CaptiveShell from "./CaptiveShell";
import { captiveLogin, captiveGetSession } from "../api/client";
import type { CredentialLoginType } from "../api/types";
import {
  loadStoredNasParams,
  mergeNasParams,
  parseNasParamsFromSearch,
  storeNasParams,
} from "../utils/nas-params";
import { hasNasRedirectContext } from "../utils/router-redirect";
import { resolvePostLoginPath, storeRouterHandoff } from "../utils/router-handoff";
import styles from "../captive-portal.module.css";

type LoginMode = CredentialLoginType;

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
  const [form, setForm] = useState<FormState>({ token: "", username: "", password: "" });

  const nasParams = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    const fromUrl = parseNasParamsFromSearch(window.location.search);
    const stored = loadStoredNasParams();
    return mergeNasParams(fromUrl, stored);
  }, []);

  useEffect(() => {
    if (!nasParams) return;
    storeNasParams(nasParams);
    if (nasParams.error) {
      setNasError(nasParams.error);
    }
  }, [nasParams]);

  const { loading: checkingSession } = useRequest(
    async () => {
      const session = await captiveGetSession();
      if (!session) return;

      const storedNas = loadStoredNasParams();
      const nextPath = resolvePostLoginPath(window.location.host, storedNas);
      router.replace(nextPath);
    },
    { refreshDeps: [router] },
  );

  const { runAsync: submitLogin, loading } = useRequest(
    async () => {
      setError(null);
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

      storeRouterHandoff(
        credential,
        mode === "USER_PASSWORD" ? form.password : undefined,
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
      setError(err instanceof Error ? err.message : "ဝင်ရောက်မှု မအောင်မြင်ပါ");
    }
  };

  const routerHint =
    nasParams && hasNasRedirectContext(nasParams)
      ? "Router မှ redirect လုပ်ထားပါသည် — login ပြီးရင် gateway သို့ အလိုအလျောက် ပြန်ပို့ပါမည်။"
      : null;

  if (checkingSession) {
    return (
      <CaptiveShell subtitle="ချိတ်ဆက်နေပါသည်…">
        <div className={styles.loadingWrap}>
          <div className={styles.spinner} aria-label="Loading" />
        </div>
      </CaptiveShell>
    );
  }

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
