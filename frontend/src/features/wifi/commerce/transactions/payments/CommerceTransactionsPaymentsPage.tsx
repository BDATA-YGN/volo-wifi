"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Alert, Card, Col, Row, Typography, theme } from "antd";
import { Banknote } from "lucide-react";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import OrgSwitcher from "@/features/wifi/tenant/profile/components/OrgSwitcher";
import { useCommerceTransactionsPayments } from "./useCommerceTransactionsPayments";
import type { PaymentMethod, PaymentRecord, SaleStatus } from "./types";
import PaymentsStats from "./components/PaymentsStats";
import PaymentsToolbar from "./components/PaymentsToolbar";
import PaymentsTable from "./components/PaymentsTable";
import PaymentDetailDrawer from "./components/PaymentDetailDrawer";
import MethodBreakdownCard from "./components/MethodBreakdownCard";
import { formatMoney } from "./utils";

const { Paragraph, Text } = Typography;

const CommerceTransactionsPaymentsPage: React.FC = () => {
  const { token } = theme.useToken();
  const [search, setSearchLocal] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<PaymentRecord | null>(null);
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
    loadPayment,
  } = useCommerceTransactionsPayments();

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

  const openDetail = (record: PaymentRecord) => {
    setSelected(record);
    setDetailOpen(true);
  };

  return (
    <div className="p-0">
      <CommonHeader icon={Banknote} />

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
            Payment tender ledger — cash and electronic payments recorded when partners complete
            sales via{" "}
            <Link href="/wifi/commerce/access-tokens">Access Tokens</Link>. View linked orders in{" "}
            <Link href="/wifi/commerce/transactions/orders">Orders</Link>.
          </Paragraph>
        </div>

        {error ? (
          <Alert
            type="error"
            showIcon
            className="mb-4"
            message="Failed to load payments"
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
              description="Choose a tenant to view its payment ledger."
            />
          ) : null}

          {isPartner ? (
            <Alert
              type="info"
              showIcon
              title="Partner view"
              description="Showing payment records for your reseller account only."
            />
          ) : null}

          {contextReady ? (
            <>
              {meta?.monthAmount != null && meta.monthAmount > 0 ? (
                <Card size="small" styles={{ body: { padding: 16 } }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    This month
                  </Text>
                  <div>
                    <Text strong style={{ fontSize: 20 }}>
                      {formatMoney(meta.monthAmount, currency)}
                    </Text>
                    <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                      total tender
                    </Text>
                  </div>
                </Card>
              ) : null}

              <PaymentsStats meta={meta} loading={loading} />

              <Row gutter={[16, 16]}>
                <Col xs={24} lg={16}>
                  <Card
                    styles={{ body: { padding: 16 } }}
                    style={{ borderRadius: token.borderRadiusLG }}
                  >
                    <PaymentsToolbar
                      search={search}
                      method={(params.method as PaymentMethod) ?? null}
                      orderStatus={(params.orderStatus as SaleStatus) ?? null}
                      stationId={(params.stationId as string) ?? null}
                      resellerId={resellerFilter ?? null}
                      formOptions={formOptions}
                      showResellerFilter={!isPartner}
                      loading={loading}
                      onSearchChange={setSearchLocal}
                      onMethodChange={(method) =>
                        patchParams({ method: method ?? undefined, page: 1 })
                      }
                      onOrderStatusChange={(orderStatus) =>
                        patchParams({ orderStatus: orderStatus ?? undefined, page: 1 })
                      }
                      onStationChange={(stationId) =>
                        patchParams({ stationId: stationId ?? undefined, page: 1 })
                      }
                      onResellerChange={(id) => selectResellerFilter(id ?? undefined)}
                      onRefresh={refresh}
                    />
                  </Card>
                </Col>
                <Col xs={24} lg={8}>
                  <MethodBreakdownCard meta={meta} />
                </Col>
              </Row>

              <Card
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <PaymentsTable
                  data={list}
                  currency={currency}
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
              message="No payment context"
              description="Select an organization or link your account to a partner to view payments."
            />
          ) : null}
        </div>
      </div>

      <PaymentDetailDrawer
        open={detailOpen}
        paymentId={selected?.id ?? null}
        currency={currency}
        fallback={selected}
        onClose={() => {
          setDetailOpen(false);
          setSelected(null);
        }}
        loadPayment={loadPayment}
      />
    </div>
  );
};

export default CommerceTransactionsPaymentsPage;
