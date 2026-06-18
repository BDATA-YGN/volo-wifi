"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Alert, Card, Typography, theme } from "antd";
import { Receipt } from "lucide-react";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import OrgSwitcher from "@/features/wifi/tenant/profile/components/OrgSwitcher";
import { useCommerceTransactionsOrders } from "./useCommerceTransactionsOrders";
import type { OrderRecord, SaleStatus } from "./types";
import OrdersStats from "./components/OrdersStats";
import OrdersToolbar from "./components/OrdersToolbar";
import OrdersTable from "./components/OrdersTable";
import OrderDetailDrawer from "./components/OrderDetailDrawer";
import { formatMoney } from "./utils";

const { Paragraph, Text } = Typography;

const CommerceTransactionsOrdersPage: React.FC = () => {
  const { token } = theme.useToken();
  const [search, setSearchLocal] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<OrderRecord | null>(null);
  const [initDone, setInitDone] = useState(false);

  const {
    list,
    meta,
    loading,
    error,
    params,
    orgId,
    resellerFilter,
    formOptions,
    setPagination,
    setSearch,
    patchParams,
    selectOrg,
    selectResellerFilter,
    refresh,
    loadFormOptions,
    loadOrder,
  } = useCommerceTransactionsOrders();

  useEffect(() => {
    void loadFormOptions().then(() => setInitDone(true));
  }, [loadFormOptions]);

  useEffect(() => {
    if (initDone && meta?.memberships?.length === 1 && !orgId) {
      selectOrg(meta.memberships[0].id);
    }
  }, [initDone, meta?.memberships, orgId, selectOrg]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search, setSearch]);

  const memberships = meta?.memberships ?? formOptions.memberships;
  const currency = meta?.currency ?? "MMK";
  const isPartner = meta?.mode === "partner";
  const showOrgSwitcher = !isPartner && memberships.length > 1;
  const needsOrg = Boolean(meta?.requiresOrgSelection) && !orgId;
  const contextReady = !needsOrg;

  const openDetail = (record: OrderRecord) => {
    setSelected(record);
    setDetailOpen(true);
  };

  return (
    <div className="p-0">
      <CommonHeader icon={Receipt} />

      <div
        style={{
          height: "var(--content-body-height)",
          overflowY: "auto",
          background: token.colorBgLayout,
          padding: 20,
        }}
      >
        <div className="mb-5 max-w-3xl">
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Sales order ledger — every token sale from{" "}
            <Link href="/wifi/commerce/access-tokens">Access Tokens</Link> creates a paid order
            with line items and payment records.
          </Paragraph>
        </div>

        {error ? (
          <Alert
            type="error"
            showIcon
            className="mb-4"
            message="Failed to load orders"
            description={String(error)}
          />
        ) : null}

        <div className="flex flex-col gap-4">
          {showOrgSwitcher ? (
            <OrgSwitcher
              memberships={memberships}
              value={orgId}
              required={needsOrg}
              loading={loading}
              onChange={selectOrg}
            />
          ) : null}

          {needsOrg ? (
            <Alert
              type="info"
              showIcon
              title="Select an organization"
              description="Choose a tenant to view its sales order ledger."
            />
          ) : null}

          {/* {isPartner ? (
            <Alert
              type="info"
              showIcon
              title="Partner view"
              description="Showing sales orders for your reseller account only."
            />
          ) : null} */}

          {contextReady ? (
            <>
              {meta?.monthRevenue != null && meta.monthRevenue > 0 ? (
                <Card size="small" styles={{ body: { padding: 16 } }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    This month
                  </Text>
                  <div>
                    <Text strong style={{ fontSize: 20 }}>
                      {formatMoney(meta.monthRevenue, currency)}
                    </Text>
                    <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                      paid revenue
                    </Text>
                  </div>
                </Card>
              ) : null}

              <OrdersStats meta={meta} loading={loading} />

              <Card
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <OrdersToolbar
                  search={search}
                  status={(params.status as SaleStatus) ?? null}
                  stationId={(params.stationId as string) ?? null}
                  resellerId={resellerFilter ?? null}
                  formOptions={formOptions}
                  showResellerFilter={!isPartner}
                  loading={loading}
                  onSearchChange={setSearchLocal}
                  onStatusChange={(status) =>
                    patchParams({ status: status ?? undefined, page: 1 })
                  }
                  onStationChange={(stationId) =>
                    patchParams({ stationId: stationId ?? undefined, page: 1 })
                  }
                  onResellerChange={(id) => selectResellerFilter(id ?? undefined)}
                  onRefresh={refresh}
                />
              </Card>

              <Card
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <OrdersTable
                  data={list}
                  loading={loading}
                  page={params.page ?? 1}
                  pageSize={params.limit ?? 20}
                  total={meta?.total ?? 0}
                  onPaginationChange={setPagination}
                  onView={openDetail}
                />
              </Card>
            </>
          ) : initDone && !loading && !needsOrg && !error ? (
            <Alert
              type="warning"
              showIcon
              message="No order context"
              description="Select an organization or link your account to a partner to view orders."
            />
          ) : null}
        </div>
      </div>

      <OrderDetailDrawer
        open={detailOpen}
        orderId={selected?.id ?? null}
        fallback={selected}
        onClose={() => {
          setDetailOpen(false);
          setSelected(null);
        }}
        loadOrder={loadOrder}
      />
    </div>
  );
};

export default CommerceTransactionsOrdersPage;
