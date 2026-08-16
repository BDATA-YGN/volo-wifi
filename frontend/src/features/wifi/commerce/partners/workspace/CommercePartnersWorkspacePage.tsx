"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Alert, Button, Card, Col, Row, Tag, Typography, theme } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { LayoutDashboard } from "lucide-react";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import OrgSwitcher from "@/features/wifi/tenant/profile/components/OrgSwitcher";
import { STATUS_COLOR } from "@/features/wifi/commerce/partners/constant";
import { formatStatusLabel } from "@/features/wifi/commerce/partners/utils";
import { useCommercePartnersWorkspace } from "./useCommercePartnersWorkspace";
import PartnerSwitcher from "./components/PartnerSwitcher";
import WorkspaceStats from "./components/WorkspaceStats";
import WorkspaceReadinessCard from "./components/WorkspaceReadinessCard";
import WorkspaceQuickActions from "./components/WorkspaceQuickActions";
import WorkspaceStationsCard from "./components/WorkspaceStationsCard";
import WorkspacePlansCard from "./components/WorkspacePlansCard";
import WorkspaceRecentOrders from "./components/WorkspaceRecentOrders";
import { formatMoney } from "./utils";

const { Title, Paragraph, Text } = Typography;

const CommercePartnersWorkspacePage: React.FC = () => {
  const { token } = theme.useToken();
  const [initDone, setInitDone] = useState(false);

  const {
    dashboard,
    meta,
    loading,
    error,
    orgId,
    resellerId,
    formOptions,
    selectOrg,
    selectReseller,
    refresh,
    loadFormOptions,
  } = useCommercePartnersWorkspace();

  useEffect(() => {
    void loadFormOptions().then(() => setInitDone(true));
  }, [loadFormOptions]);

  useEffect(() => {
    if (initDone && meta?.memberships?.length === 1 && !orgId) {
      selectOrg(meta.memberships[0].id);
    }
  }, [initDone, meta?.memberships, orgId, selectOrg]);

  useEffect(() => {
    if (meta?.orgId && !orgId) {
      selectOrg(meta.orgId);
    }
  }, [meta?.orgId, orgId, selectOrg]);

  useEffect(() => {
    if (meta?.resellerId && !resellerId) {
      selectReseller(meta.resellerId);
    }
  }, [meta?.resellerId, resellerId, selectReseller]);

  const memberships = meta?.memberships ?? formOptions.memberships;
  const resellers = meta?.resellers ?? formOptions.resellers;
  const showOrgSwitcher =
    (meta?.requiresOrgSelection || dashboard?.mode === "preview") && memberships.length > 1;
  const needsOrg = Boolean(meta?.requiresOrgSelection) && !orgId;
  const showPartnerSwitcher =
    dashboard?.mode === "preview" || Boolean(meta?.requiresResellerSelection);
  const needsPartner =
    Boolean(meta?.requiresResellerSelection) && !resellerId && Boolean(orgId);

  return (
    <div className="p-0">
      <CommonHeader icon={LayoutDashboard} />

      <div
        style={{
          height: "var(--content-body-height)",
          overflowY: "auto",
          background: token.colorBgLayout,
          padding: 20,
        }}
      >
        {error ? (
          <Alert
            type="error"
            showIcon
            className="mb-4"
            message="Failed to load workspace"
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
              description="Choose a tenant to open a partner workspace."
            />
          ) : null}

          {showPartnerSwitcher && orgId && resellers.length > 0 ? (
            <PartnerSwitcher
              resellers={resellers}
              value={resellerId ?? meta?.resellerId}
              required={needsPartner}
              loading={loading}
              onChange={selectReseller}
            />
          ) : null}

          {needsPartner ? (
            <Alert
              type="info"
              showIcon
              title="Select a partner"
              description={
                <span>
                  No partner is linked to your login. Pick one to preview, or create partners in{" "}
                  <Link href="/wifi/commerce/partners">Partner Directory</Link>.
                </span>
              }
            />
          ) : null}

          {orgId && resellers.length === 0 && !dashboard && !loading && initDone ? (
            <Alert
              type="warning"
              showIcon
              title="No partners configured"
              description={
                <span>
                  Create reseller accounts in{" "}
                  <Link href="/wifi/commerce/partners">Partner Directory</Link> before using the
                  workspace.
                </span>
              }
            />
          ) : null}

          {dashboard ? (
            <>
              <Card
                styles={{ body: { padding: 20 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <Title level={4} style={{ margin: 0 }}>
                      {dashboard.reseller.name}
                    </Title>
                    <Paragraph type="secondary" style={{ marginBottom: 8, marginTop: 4 }}>
                      {dashboard.org.name} · {dashboard.stats.planCount} sellable plan
                      {dashboard.stats.planCount === 1 ? "" : "s"}
                    </Paragraph>
                    <div className="flex flex-wrap gap-2">
                      <Tag style={{ fontFamily: "monospace" }}>{dashboard.reseller.code}</Tag>
                      <Tag color={STATUS_COLOR[dashboard.reseller.status]}>
                        {formatStatusLabel(dashboard.reseller.status)}
                      </Tag>
                      <Tag>{dashboard.org.currency}</Tag>
                    </div>
                  </div>
                  <div className="text-right">
                    <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                      This month
                    </Text>
                    <Title level={3} style={{ margin: 0 }}>
                      {formatMoney(dashboard.stats.revenueMonth, dashboard.org.currency)}
                    </Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {dashboard.stats.ordersMonth} order
                      {dashboard.stats.ordersMonth === 1 ? "" : "s"}
                    </Text>
                  </div>
                </div>
              </Card>

              <WorkspaceStats dashboard={dashboard} loading={loading} />

              <WorkspaceQuickActions readiness={dashboard.readiness} mode={dashboard.mode} />

              <Row gutter={[16, 16]}>
                <Col xs={24} lg={10}>
                  <WorkspaceReadinessCard dashboard={dashboard} mode={dashboard.mode} />
                </Col>
                <Col xs={24} lg={14}>
                  <WorkspaceRecentOrders
                    orders={dashboard.recentOrders}
                    currency={dashboard.org.currency}
                  />
                </Col>
              </Row>

              <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                  <WorkspaceStationsCard stations={dashboard.stations} />
                </Col>
                <Col xs={24} lg={12}>
                  <WorkspacePlansCard plans={dashboard.plans} />
                </Col>
              </Row>

              <div className="flex justify-end">
                <Button
                  type="text"
                  size="small"
                  icon={<ReloadOutlined />}
                  loading={loading}
                  onClick={() => refresh()}
                >
                  Refresh dashboard
                </Button>
              </div>
            </>
          ) : initDone && !loading && !needsOrg && !needsPartner && !error ? (
            <Alert
              type="warning"
              showIcon
              title="No partner workspace available"
              description="Your account is not linked to a reseller profile. Contact your tenant administrator or use admin preview with partner selection."
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default CommercePartnersWorkspacePage;
