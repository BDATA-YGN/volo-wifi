"use client";

import { useEffect, useMemo, useState } from "react";
import { App, Drawer, Form, InputNumber, Select, Spin } from "antd";
import { useRequest } from "ahooks";
import { getApiErrorMessage } from "@/common/exceptions/handleApiError";
import { useCommerceAccessTokens } from "@/features/wifi/commerce/access-tokens/useCommerceAccessTokens";
import type {
  AccessTokenRecord,
  IssueTokenFormValues,
  IssueTokenResult,
  PaymentMethod,
} from "@/features/wifi/commerce/access-tokens/types";
import { calcLineTotal, formatMoney, formatStatusLabel } from "@/features/wifi/commerce/access-tokens/utils";
import { formatWifiDateTime } from "@/features/wifi/shared/format";
import { usePartnerAuthRedirect } from "../hooks/usePartnerAuthRedirect";
import PartnerTokenDetailDrawer from "./PartnerTokenDetailDrawer";
import styles from "./partner.module.css";

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "MOBILE_MONEY", label: "Mobile money" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "CARD", label: "Card" },
  { value: "OTHER", label: "Other" },
];

/** List mask: hide all but the last 2 characters. */
function maskSoldToken(token: string | null | undefined): string {
  if (!token) return "—";
  const t = token.trim();
  if (t.length <= 2) return t;
  return `${"*".repeat(t.length - 2)}${t.slice(-2)}`;
}

export default function PartnerTokensPage() {
  const { message } = App.useApp();
  const [initDone, setInitDone] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saleResult, setSaleResult] = useState<IssueTokenResult | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailFallback, setDetailFallback] = useState<AccessTokenRecord | null>(null);
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
    loadToken,
  } = useCommerceAccessTokens();

  usePartnerAuthRedirect(error);

  useEffect(() => {
    void loadFormOptions().then(() => setInitDone(true));
  }, [loadFormOptions]);

  const activeCatalog = catalog ?? meta?.catalog;
  const canSell = Boolean(activeCatalog?.canSell);
  const stations = activeCatalog?.stations ?? [];
  const currency = activeCatalog?.currency ?? "MMK";

  const stationId = Form.useWatch("stationId", form);
  const planId = Form.useWatch("planId", form);
  const quantity = Form.useWatch("quantity", form) ?? 1;
  const discount = Form.useWatch("discount", form) ?? 0;

  const sellablePlans = useMemo(() => {
    const plans = activeCatalog?.plans ?? [];
    if (!stationId) return [];
    return plans
      .filter((p) => {
        if (p.pricesByStation && Object.keys(p.pricesByStation).length > 0) {
          return p.pricesByStation[stationId] != null;
        }
        return p.hasPricing;
      })
      .map((p) => ({
        ...p,
        unitPrice: p.pricesByStation?.[stationId] ?? p.unitPrice ?? null,
        hasPricing: true as const,
      }));
  }, [activeCatalog?.plans, stationId]);

  const selectedPlan = sellablePlans.find((p) => p.id === planId);
  const lineTotal = calcLineTotal(selectedPlan?.unitPrice ?? null, quantity, discount);

  useEffect(() => {
    if (!drawerOpen || !activeCatalog) return;
    const priced = (activeCatalog.plans ?? []).filter((p) => p.hasPricing);
    const defaults: Partial<IssueTokenFormValues> = {
      quantity: 1,
      paymentMethod: "CASH",
      discount: 0,
    };
    if (stations.length === 1) {
      defaults.stationId = stations[0].id;
    }
    const siteId = defaults.stationId ?? form.getFieldValue("stationId");
    const plansForSite = (activeCatalog.plans ?? []).filter((p) => {
      if (!siteId) return p.hasPricing;
      if (p.pricesByStation && Object.keys(p.pricesByStation).length > 0) {
        return p.pricesByStation[siteId] != null;
      }
      return p.hasPricing;
    });
    if (plansForSite.length === 1) {
      defaults.planId = plansForSite[0].id;
    } else if (priced.length === 1 && !siteId) {
      defaults.planId = priced[0].id;
    }
    form.setFieldsValue(defaults);
  }, [drawerOpen, activeCatalog, stations, form]);

  useEffect(() => {
    if (!drawerOpen || !stationId) return;
    const currentPlan = form.getFieldValue("planId") as string | undefined;
    const stillValid = sellablePlans.some((p) => p.id === currentPlan);
    if (!stillValid) {
      form.setFieldValue("planId", sellablePlans.length === 1 ? sellablePlans[0].id : undefined);
    }
  }, [drawerOpen, stationId, sellablePlans, form]);

  const { runAsync: handleSell, loading: selling } = useRequest(
    async (values: IssueTokenFormValues) => {
      const result = (await issueTokens(values)) as IssueTokenResult;
      setSaleResult(result);
      setDrawerOpen(false);
      form.resetFields();
      refresh();
    },
    {
      manual: true,
      onError: (err) => {
        message.error(getApiErrorMessage(err, "Could not issue tokens. Please try again."));
      },
    }
  );

  if (!initDone || (loading && list.length === 0 && !saleResult)) {
    return (
      <div className={styles.loadingWrap}>
        <Spin />
        <span>Loading tokens…</span>
      </div>
    );
  }

  if (saleResult) {
    return (
      <PartnerSaleSuccess
        result={saleResult}
        onDone={() => setSaleResult(null)}
      />
    );
  }

  return (
    <div className={styles.partnerPage}>
      {error ? (
        <div className={styles.errorBanner} role="alert">
          {String(error)}
        </div>
      ) : null}

      {list.length === 0 ? (
        <div className={styles.emptyWrap}>
          <p>No access tokens yet.</p>
          {canSell ? <p>Tap Sell token to make your first sale.</p> : null}
        </div>
      ) : (
        <div className={styles.listStack}>
          {list.map((row) => (
            <TokenListCard
              key={row.id}
              row={row}
              onOpen={() => {
                setDetailFallback(row);
                setDetailId(row.id);
              }}
            />
          ))}
        </div>
      )}

      {canSell ? (
        <button type="button" className={styles.fab} onClick={() => setDrawerOpen(true)}>
          Sell token
        </button>
      ) : null}

      <PartnerTokenDetailDrawer
        open={Boolean(detailId)}
        tokenId={detailId}
        fallback={detailFallback}
        loadToken={loadToken}
        onClose={() => {
          setDetailId(null);
          setDetailFallback(null);
        }}
      />

      <Drawer
        title="Sell access token"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose
        size="auto"
        placement="bottom"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ quantity: 1, paymentMethod: "CASH", discount: 0 }}
          onFinish={(values) => void handleSell(values)}
          disabled={selling || !orgId || !resellerId}
        >
          <Form.Item name="stationId" label="Site" rules={[{ required: true, message: "Select a site" }]}>
            <Select
              placeholder="Select site"
              options={stations.map((s) => ({
                value: s.id,
                label: `${s.code} — ${s.name}`,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="planId"
            label="Plan"
            rules={[{ required: true, message: "Select a plan" }]}
            extra={
              !stationId
                ? "Select a site to see plans with retail pricing."
                : sellablePlans.length === 0
                  ? "No priced plans for this site. Check Retail Pricing (reseller → site → org default)."
                  : selectedPlan?.unitPrice != null
                    ? `Unit price: ${formatMoney(selectedPlan.unitPrice, currency)}`
                    : undefined
            }
          >
            <Select
              placeholder={stationId ? "Select plan" : "Select site first"}
              disabled={!stationId}
              options={sellablePlans.map((p) => ({
                value: p.id,
                label:
                  p.unitPrice != null
                    ? `${p.code} — ${p.name} (${formatMoney(p.unitPrice, currency)})`
                    : `${p.code} — ${p.name}`,
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

          {lineTotal != null ? (
            <div className={styles.saleTotalBox}>
              <p className={styles.saleTotalLabel}>Total</p>
              <p className={styles.saleTotalValue}>{formatMoney(lineTotal, currency)}</p>
            </div>
          ) : null}

          <button
            type="submit"
            className={styles.fab}
            style={{ position: "static", width: "100%", marginTop: "0.75rem" }}
            disabled={selling || sellablePlans.length === 0}
          >
            {selling ? "Selling…" : "Confirm sale"}
          </button>
        </Form>
      </Drawer>
    </div>
  );
}

function TokenListCard({ row, onOpen }: { row: AccessTokenRecord; onOpen: () => void }) {
  const soldAt = row.soldAt ?? row.sale?.order.soldAt ?? null;
  return (
    <button type="button" className={styles.listCardButton} onClick={onOpen}>
      <div className={styles.listRow}>
        <div>
          <p className={styles.listPrimary} style={{ fontFamily: "monospace", letterSpacing: "0.06em" }}>
            {maskSoldToken(row.token)}
          </p>
          <p className={styles.listSecondary}>
            {row.plan?.name ?? "Plan"}
            {row.station ? ` · ${row.station.code}` : ""}
          </p>
          <p className={styles.listSecondary}>
            {soldAt ? `Sold ${formatWifiDateTime(soldAt)}` : formatStatusLabel(row.status)}
          </p>
        </div>
        <span className={styles.badge}>{formatStatusLabel(row.status)}</span>
      </div>
    </button>
  );
}

function PartnerSaleSuccess({
  result,
  onDone,
}: {
  result: IssueTokenResult;
  onDone: () => void;
}) {
  const { message } = App.useApp();
  const credentials = result.credentials;
  const planName = credentials[0]?.plan?.name;
  const siteCode = credentials[0]?.station?.code;

  return (
    <div className={styles.successPage}>
      <div className={styles.successHeader}>
        <p className={styles.successEyebrow}>Sale complete</p>
        <h1 className={styles.successTitle}>
          {credentials.length === 1 ? "Access token ready" : `${credentials.length} access tokens ready`}
        </h1>
        <p className={styles.successMeta}>
          Order <span className={styles.mono}>{result.order.orderNo}</span>
          {" · "}
          {formatMoney(result.order.total, result.order.currency)}
        </p>
        {planName || siteCode ? (
          <p className={styles.successMeta}>
            {[planName, siteCode].filter(Boolean).join(" · ")}
          </p>
        ) : null}
        <p className={styles.successHint}>Customer can photograph each card below.</p>
      </div>

      <div className={styles.successStack}>
        {credentials.map((c, index) => (
          <article key={c.id} className={styles.tokenPhotoCard}>
            <p className={styles.tokenPhotoLabel}>
              Token {credentials.length > 1 ? `${index + 1} of ${credentials.length}` : ""}
            </p>
            <p className={styles.tokenPhotoCode}>{c.token ?? "—"}</p>
            <p className={styles.tokenPhotoDetail}>
              {c.plan?.name ?? "Plan"}
              {c.station ? ` · ${c.station.code}` : ""}
            </p>
            {c.soldAt ? (
              <p className={styles.tokenPhotoDetail}>Sold {formatWifiDateTime(c.soldAt)}</p>
            ) : null}
            {c.token ? (
              <button
                type="button"
                className={styles.tokenCopyBtn}
                onClick={() => {
                  void navigator.clipboard.writeText(c.token!).then(
                    () => message.success("Token copied"),
                    () => message.error("Could not copy")
                  );
                }}
              >
                Copy token
              </button>
            ) : null}
          </article>
        ))}
      </div>

      <button type="button" className={styles.successDoneBtn} onClick={onDone}>
        Done
      </button>
    </div>
  );
}
