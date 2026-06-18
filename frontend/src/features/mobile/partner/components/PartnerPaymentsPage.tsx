"use client";

import { useEffect, useState } from "react";
import { Spin } from "antd";
import { useRequest } from "ahooks";
import * as PaymentsQuery from "@/features/wifi/commerce/transactions/payments/query";
import { formatMoney } from "@/features/wifi/commerce/partners/workspace/utils";
import type { PaymentRecord } from "@/features/wifi/commerce/transactions/payments/types";
import { usePartnerAuthRedirect } from "../hooks/usePartnerAuthRedirect";
import styles from "./partner.module.css";

function formatMethod(method: string): string {
  return method.split("_").join(" ");
}

export default function PartnerPaymentsPage() {
  const [initDone, setInitDone] = useState(false);
  const [orgId, setOrgId] = useState<string | undefined>();
  const [resellerId, setResellerId] = useState<string | undefined>();

  const { data, loading, error, refresh } = useRequest(
    () =>
      PaymentsQuery.list({
        page: 1,
        limit: 30,
        orgId,
        resellerId,
      }),
    { refreshDeps: [orgId, resellerId] },
  );

  usePartnerAuthRedirect(error);

  useEffect(() => {
    void PaymentsQuery.loadFormOptions()
      .then((res) => {
        const meta = res.meta as { orgId?: string; resellerId?: string } | undefined;
        if (meta?.orgId) setOrgId(meta.orgId);
        if (meta?.resellerId) setResellerId(meta.resellerId);
      })
      .finally(() => setInitDone(true));
  }, []);

  const payments = (data?.data ?? []) as PaymentRecord[];

  if (!initDone || (loading && payments.length === 0)) {
    return (
      <div className={styles.loadingWrap}>
        <Spin />
        <span>Loading payments…</span>
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

      {payments.length === 0 ? (
        <div className={styles.emptyWrap}>
          <p>No payments yet.</p>
          <button type="button" onClick={() => refresh()}>
            Refresh
          </button>
        </div>
      ) : (
        <div className={styles.listStack}>
          {payments.map((payment) => (
            <div key={payment.id} className={styles.listCard}>
              <div className={styles.listRow}>
                <div>
                  <p className={styles.listPrimary}>
                    {payment.order?.orderNo ?? payment.refNo ?? "Payment"}
                  </p>
                  <p className={styles.listSecondary}>
                    {formatMethod(payment.method)}
                    {payment.order?.station?.name ? ` · ${payment.order.station.name}` : ""}
                  </p>
                </div>
                <div className={styles.listMeta}>
                  {formatMoney(
                    payment.amount,
                    payment.order?.currency ?? "MMK",
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
