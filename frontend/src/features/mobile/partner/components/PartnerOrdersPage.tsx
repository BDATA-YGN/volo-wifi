"use client";

import { useEffect, useState } from "react";
import { Spin } from "antd";
import { useRequest } from "ahooks";
import * as OrdersQuery from "@/features/wifi/commerce/transactions/orders/query";
import { formatMoney } from "@/features/wifi/commerce/partners/workspace/utils";
import { formatStatusLabel } from "@/features/wifi/commerce/partners/utils";
import type { OrderRecord } from "@/features/wifi/commerce/transactions/orders/types";
import styles from "./partner.module.css";
import { usePartnerAuthRedirect } from "../hooks/usePartnerAuthRedirect";

export default function PartnerOrdersPage() {
  const [initDone, setInitDone] = useState(false);
  const [orgId, setOrgId] = useState<string | undefined>();
  const [resellerId, setResellerId] = useState<string | undefined>();

  const { data, loading, error, refresh } = useRequest(
    () =>
      OrdersQuery.list({
        page: 1,
        limit: 30,
        orgId,
        resellerId,
      }),
    { refreshDeps: [orgId, resellerId] },
  );

  usePartnerAuthRedirect(error);

  useEffect(() => {
    void OrdersQuery.loadFormOptions()
      .then((res) => {
        const meta = res.meta as { orgId?: string; resellerId?: string } | undefined;
        if (meta?.orgId) setOrgId(meta.orgId);
        if (meta?.resellerId) setResellerId(meta.resellerId);
      })
      .finally(() => setInitDone(true));
  }, []);

  const orders = (data?.data ?? []) as OrderRecord[];

  if (!initDone || (loading && orders.length === 0)) {
    return (
      <div className={styles.loadingWrap}>
        <Spin />
        <span>Loading orders…</span>
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

      {orders.length === 0 ? (
        <div className={styles.emptyWrap}>
          <p>No orders yet.</p>
          <button type="button" onClick={() => refresh()}>
            Refresh
          </button>
        </div>
      ) : (
        <div className={styles.listStack}>
          {orders.map((order) => (
            <div key={order.id} className={styles.listCard}>
              <div className={styles.listRow}>
                <div>
                  <p className={styles.listPrimary}>{order.orderNo}</p>
                  <p className={styles.listSecondary}>
                    {order.station?.name ?? "—"} · {formatStatusLabel(order.status)}
                  </p>
                </div>
                <div className={styles.listMeta}>
                  {formatMoney(order.total, order.currency)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
