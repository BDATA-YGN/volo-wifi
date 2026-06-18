"use client";

import { useEffect, useState } from "react";
import { App, Drawer, Form, InputNumber, Select, Spin } from "antd";
import { useRequest } from "ahooks";
import { useCommerceAccessTokens } from "@/features/wifi/commerce/access-tokens/useCommerceAccessTokens";
import type {
  IssueTokenFormValues,
  IssueTokenResult,
  PaymentMethod,
} from "@/features/wifi/commerce/access-tokens/types";
import { formatStatusLabel } from "@/features/wifi/commerce/partners/utils";
import { usePartnerAuthRedirect } from "../hooks/usePartnerAuthRedirect";
import styles from "./partner.module.css";

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "MOBILE_MONEY", label: "Mobile money" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "CARD", label: "Card" },
  { value: "OTHER", label: "Other" },
];

export default function PartnerTokensPage() {
  const { message } = App.useApp();
  const [initDone, setInitDone] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [issuedTokens, setIssuedTokens] = useState<string[]>([]);
  const [form] = Form.useForm<IssueTokenFormValues>();

  const {
    list,
    meta,
    catalog,
    loading,
    error,
    orgId,
    resellerId,
    loadFormOptions,
    refresh,
    issueTokens,
  } = useCommerceAccessTokens();

  usePartnerAuthRedirect(error);

  useEffect(() => {
    void loadFormOptions().then(() => setInitDone(true));
  }, [loadFormOptions]);

  const activeCatalog = catalog ?? meta?.catalog;
  const canSell = Boolean(activeCatalog?.canSell);

  const { runAsync: handleIssue, loading: issuing } = useRequest(
    async (values: IssueTokenFormValues) => {
      const result = (await issueTokens(values)) as IssueTokenResult;
      const tokens = result.credentials.map((c) => c.token).filter(Boolean) as string[];
      setIssuedTokens(tokens);
      message.success(`Issued ${tokens.length} token${tokens.length === 1 ? "" : "s"}`);
      setDrawerOpen(false);
      form.resetFields();
      refresh();
    },
    { manual: true },
  );

  if (!initDone || (loading && list.length === 0)) {
    return (
      <div className={styles.loadingWrap}>
        <Spin />
        <span>Loading tokens…</span>
      </div>
    );
  }

  return (
    <div className={styles.partnerPage}>
      {error ? (
        <div className={styles.errorBanner} role="alert">
          {String(error)}
        </div>
      ) : null}

      {issuedTokens.length > 0 ? (
        <div className={styles.listCard}>
          <p className={styles.listPrimary}>Latest issued</p>
          {issuedTokens.map((token) => (
            <p key={token} className={styles.listSecondary} style={{ fontFamily: "monospace" }}>
              {token}
            </p>
          ))}
        </div>
      ) : null}

      {list.length === 0 ? (
        <div className={styles.emptyWrap}>
          <p>No access tokens yet.</p>
          {canSell ? <p>Tap Issue to sell your first token.</p> : null}
        </div>
      ) : (
        <div className={styles.listStack}>
          {list.map((row) => (
            <div key={row.id} className={styles.listCard}>
              <div className={styles.listRow}>
                <div>
                  <p className={styles.listPrimary} style={{ fontFamily: "monospace" }}>
                    {row.token ?? "—"}
                  </p>
                  <p className={styles.listSecondary}>
                    {row.plan?.name ?? "Plan"} · {formatStatusLabel(row.status)}
                  </p>
                </div>
                <span className={styles.badge}>{row.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {canSell ? (
        <button type="button" className={styles.fab} onClick={() => setDrawerOpen(true)}>
          Issue
        </button>
      ) : null}

      <Drawer
        title="Issue access tokens"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose
        height="auto"
        placement="bottom"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ quantity: 1, paymentMethod: "CASH", discount: 0 }}
          onFinish={(values) => handleIssue(values)}
          disabled={issuing || !orgId || !resellerId}
        >
          <Form.Item name="stationId" label="Site" rules={[{ required: true }]}>
            <Select
              placeholder="Select site"
              options={(activeCatalog?.stations ?? []).map((s) => ({
                value: s.id,
                label: `${s.code} — ${s.name}`,
              }))}
            />
          </Form.Item>
          <Form.Item name="planId" label="Plan" rules={[{ required: true }]}>
            <Select
              placeholder="Select plan"
              options={(activeCatalog?.plans ?? []).map((p) => ({
                value: p.id,
                label: p.hasPricing
                  ? `${p.name} (${p.unitPrice?.toLocaleString()} ${activeCatalog?.currency})`
                  : p.name,
              }))}
            />
          </Form.Item>
          <Form.Item name="quantity" label="Quantity" rules={[{ required: true }]}>
            <InputNumber min={1} max={50} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="paymentMethod" label="Payment" rules={[{ required: true }]}>
            <Select options={PAYMENT_METHODS} />
          </Form.Item>
          <Form.Item name="discount" label="Discount">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <button type="submit" className={styles.fab} style={{ position: "static", width: "100%" }}>
            {issuing ? "Issuing…" : "Confirm issue"}
          </button>
        </Form>
      </Drawer>
    </div>
  );
}
