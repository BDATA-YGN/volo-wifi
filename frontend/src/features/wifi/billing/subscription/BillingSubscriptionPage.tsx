"use client";

import React, { useEffect, useMemo, useState } from "react";
import { getApiErrorMessage } from "@/common/exceptions/handleApiError";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Alert, App, Button, Card, Col, Row, Typography, theme } from "antd";
import {
  ArrowRightOutlined,
  EditOutlined,
  FileTextOutlined,
  HistoryOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  WifiOutlined,
} from "@ant-design/icons";
import { WifiRelatedLinksLayout } from "@/features/wifi/shared";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import { useBillingSubscription } from "./useBillingSubscription";
import type { SubscriptionUpdateFormValues } from "./types";
import SubscriptionStats from "./components/SubscriptionStats";
import SubscriptionListTable from "./components/SubscriptionListTable";
import OrgPicker from "./components/OrgPicker";
import SubscriptionDetailCard from "./components/SubscriptionDetailCard";
import StationUsagePanel from "./components/StationUsagePanel";
import RecentHistoryPanel from "./components/RecentHistoryPanel";
import EditSubscriptionDrawer from "./components/EditSubscriptionDrawer";

const { Paragraph } = Typography;

const BillingSubscriptionPage: React.FC = () => {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const searchParams = useSearchParams();

  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(
    () => searchParams.get("orgId")
  );

  useEffect(() => {
    const orgId = searchParams.get("orgId");
    if (orgId) setSelectedOrgId(orgId);
  }, [searchParams]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const {
    subscriptions,
    listMeta,
    detail,
    loading,
    listLoading,
    detailLoading,
    error,
    refresh,
    updateSubscription,
  } = useBillingSubscription(selectedOrgId);

  const license = detail?.license ?? null;

  const relatedLinks = useMemo(
    () => [
      {
        href: selectedOrgId
          ? `/wifi/billing/subscription/sites?orgId=${selectedOrgId}`
          : "/wifi/billing/subscription/sites",
        label: "Licensed sites",
        icon: <WifiOutlined />,
      },
      {
        href: selectedOrgId
          ? `/wifi/billing/subscription/changelog?orgId=${selectedOrgId}`
          : "/wifi/billing/subscription/changelog",
        label: "Subscription changelog",
        icon: <HistoryOutlined />,
      },
      {
        href: "/wifi/billing/invoices",
        label: "Invoices",
        icon: <FileTextOutlined />,
      },
      {
        href: "/wifi/billing/tier-rates/tenant",
        label: "Tenant tier rates",
        icon: <ArrowRightOutlined />,
      },
    ],
    [selectedOrgId]
  );

  const handleUpdate = async (values: SubscriptionUpdateFormValues) => {
    if (!license) return;
    setSaving(true);
    try {
      await updateSubscription(license.id, values);
      message.success("Subscription updated");
      setDrawerOpen(false);
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, "Failed to update subscription"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-0">
      <CommonHeader icon={SafetyCertificateOutlined} />

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
            Manage tenant SaaS subscriptions — licensed site limits, billing cycle, and status.
            Usage is calculated from active WiFi sites against the subscription cap.
          </Paragraph>
        </div>

        {error ? (
          <Alert
            type="error"
            showIcon
            className="mb-4"
            message="Failed to load subscriptions"
            description={String(error)}
            action={
              <Button size="small" onClick={() => refresh()}>
                Retry
              </Button>
            }
          />
        ) : null}

        <WifiRelatedLinksLayout
          storageKey="billing-subscription"
          eyebrow="Subscription"
          title="Related billing"
          links={relatedLinks}
          hint="The subscription defines how many licensed sites a tenant may operate. Monthly invoices count active sites per capacity tier against this limit."
        >
          <div className="flex flex-col gap-4">
              <SubscriptionStats meta={listMeta} loading={listLoading} />

              <Card
                size="small"
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <OrgPicker
                  subscriptions={subscriptions}
                  value={selectedOrgId}
                  loading={listLoading}
                  onChange={setSelectedOrgId}
                />
              </Card>

              {!selectedOrgId ? (
                <Card
                  title="All tenant subscriptions"
                  extra={
                    <Button icon={<ReloadOutlined />} onClick={() => refresh()} loading={listLoading}>
                      Refresh
                    </Button>
                  }
                  styles={{ body: { padding: 20 } }}
                  style={{ borderRadius: token.borderRadiusLG }}
                >
                  <SubscriptionListTable
                    data={subscriptions}
                    loading={listLoading}
                    onSelect={setSelectedOrgId}
                  />
                  {subscriptions.length === 0 && !listLoading ? (
                    <div className="mt-4 text-center">
                      <Link href="/wifi/billing/tenant-registration">Register a tenant</Link> to
                      create the first subscription.
                    </div>
                  ) : null}
                </Card>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Button type="link" onClick={() => setSelectedOrgId(null)} style={{ padding: 0 }}>
                      ← All subscriptions
                    </Button>
                    <div className="flex flex-wrap gap-2">
                    <Button icon={<ReloadOutlined />} onClick={() => refresh()} loading={detailLoading}>
                      Refresh
                    </Button>
                    <Button
                      type="primary"
                      icon={<EditOutlined />}
                      onClick={() => setDrawerOpen(true)}
                      disabled={!license}
                    >
                      Edit subscription
                    </Button>
                    </div>
                  </div>

                  {license ? (
                    <SubscriptionDetailCard
                      license={license}
                      overrideCount={detail?.overrideCount}
                    />
                  ) : null}

                  <Row gutter={[16, 16]}>
                    <Col xs={24} lg={12}>
                      <Card
                        title="Licensed sites by tier"
                        styles={{ body: { padding: 16 } }}
                        style={{ borderRadius: token.borderRadiusLG }}
                      >
                        <StationUsagePanel
                          data={detail?.usageByTier ?? []}
                          loading={detailLoading}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} lg={12}>
                      <Card
                        title="Recent changes"
                        styles={{ body: { padding: 16 } }}
                        style={{ borderRadius: token.borderRadiusLG }}
                      >
                        <RecentHistoryPanel
                          entries={detail?.recentHistory ?? []}
                          orgId={selectedOrgId}
                        />
                      </Card>
                    </Col>
                  </Row>
                </>
              )}
          </div>
        </WifiRelatedLinksLayout>
      </div>

      <EditSubscriptionDrawer
        open={drawerOpen}
        saving={saving}
        license={license}
        onClose={() => !saving && setDrawerOpen(false)}
        onSubmit={handleUpdate}
      />
    </div>
  );
};

export default BillingSubscriptionPage;
