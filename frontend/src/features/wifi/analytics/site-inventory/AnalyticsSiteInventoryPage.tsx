"use client";

import React, { useEffect, useMemo } from "react";
import Link from "next/link";
import { Alert, Button, Card, Col, Row, Tag, Typography, theme } from "antd";
import { Building2, X } from "lucide-react";
import dayjs from "dayjs";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import OrgSwitcher from "@/features/wifi/tenant/profile/components/OrgSwitcher";
import { useAnalyticsSiteInventory } from "./useAnalyticsSiteInventory";
import { STATION_STATUS_COLOR } from "./constant";
import { formatStatusLabel } from "./utils";
import type { StationStatus } from "./types";
import InventoryToolbar from "./components/InventoryToolbar";
import InventoryFilterBar from "./components/InventoryFilterBar";
import InventoryKpiCards from "./components/InventoryKpiCards";
import InventoryStatusChart from "./components/InventoryStatusChart";
import InventoryTierTable from "./components/InventoryTierTable";
import InventoryDeviceTypeTable from "./components/InventoryDeviceTypeTable";
import InventorySitesTable from "./components/InventorySitesTable";

const { Title, Paragraph, Text } = Typography;

const AnalyticsSiteInventoryPage: React.FC = () => {
  const { token } = theme.useToken();
  const [initDone, setInitDone] = React.useState(false);

  const {
    inventory,
    meta,
    loading,
    error,
    orgId,
    stationId,
    stationSizeId,
    status,
    formOptions,
    selectOrg,
    selectStation,
    selectStationSize,
    selectStatus,
    clearFilters,
    refresh,
    loadFormOptions,
  } = useAnalyticsSiteInventory();

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

  const memberships = meta?.memberships ?? formOptions.memberships;
  const stationSizes = formOptions.stationSizes;
  const stations = formOptions.stations;
  const showOrgSwitcher = memberships.length > 1;
  const needsOrg = Boolean(meta?.requiresOrgSelection) && !orgId;

  const scopedSiteCode = useMemo(() => {
    if (!stationId) return null;
    return (
      inventory?.sites.find((s) => s.stationId === stationId)?.code ??
      stations.find((s) => s.id === stationId)?.code ??
      null
    );
  }, [stationId, inventory?.sites, stations]);

  const scopedTier = useMemo(() => {
    if (!stationSizeId) return null;
    return stationSizes.find((t) => t.id === stationSizeId) ?? null;
  }, [stationSizeId, stationSizes]);

  const hasFilters = Boolean(stationId || stationSizeId || status);

  return (
    <div className="p-0">
      <CommonHeader icon={Building2} />

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
            Site status roll-up — fleet inventory across capacity tiers, NAS devices, and RADIUS
            readiness. Manage sites in <Link href="/wifi/sites">Sites</Link>, devices in{" "}
            <Link href="/wifi/network/nas-devices">NAS Devices</Link>, or usage trends in{" "}
            <Link href="/wifi/analytics/sites">Site Analytics</Link>.
          </Paragraph>
        </div>

        {error ? (
          <Alert
            type="error"
            showIcon
            className="mb-4"
            title="Failed to load site inventory"
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
              onChange={(id) => selectOrg(id)}
            />
          ) : null}

          {needsOrg ? (
            <Alert
              type="info"
              showIcon
              title="Select an organization"
              description="Choose a tenant to view site inventory."
            />
          ) : null}

          {inventory ? (
            <>
              <Card
                styles={{ body: { padding: 20 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <Title level={4} style={{ margin: 0 }}>
                      Site inventory
                    </Title>
                    <Paragraph type="secondary" style={{ marginBottom: 8, marginTop: 4 }}>
                      {inventory.org.name}
                      {inventory.generatedAt
                        ? ` · ${dayjs(inventory.generatedAt).format("D MMM YYYY, HH:mm")}`
                        : ""}
                    </Paragraph>
                    <div className="flex flex-wrap gap-2">
                      <Tag style={{ fontFamily: "monospace" }}>{inventory.org.code}</Tag>
                      <Tag color="blue">{inventory.summary.siteCount} sites</Tag>
                      <Tag color="success">{inventory.summary.activeCount} active</Tag>
                      <Tag color="purple">{inventory.summary.deviceCount} devices</Tag>
                      {scopedTier ? (
                        <Tag style={{ fontFamily: "monospace" }}>{scopedTier.code}</Tag>
                      ) : null}
                      {status ? (
                        <Tag color={STATION_STATUS_COLOR[status]}>
                          {formatStatusLabel(status)}
                        </Tag>
                      ) : null}
                      {scopedSiteCode ? (
                        <Tag style={{ fontFamily: "monospace" }}>{scopedSiteCode}</Tag>
                      ) : null}
                      {hasFilters ? (
                        <Button
                          type="link"
                          size="small"
                          icon={<X size={14} />}
                          onClick={clearFilters}
                          style={{ padding: 0, height: "auto" }}
                        >
                          Clear filters
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-right">
                    <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                      Fleet readiness
                    </Text>
                    <Title level={3} style={{ margin: 0 }}>
                      {inventory.summary.siteCount > 0
                        ? `${Math.round(
                            (inventory.sites.reduce((s, r) => s + r.readinessScore, 0) /
                              inventory.sites.length) *
                              10
                          ) / 10}%`
                        : "—"}
                    </Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      avg config score across {inventory.sites.length} sites
                    </Text>
                  </div>
                </div>
              </Card>

              <Card
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <InventoryToolbar
                  generatedAt={inventory.generatedAt}
                  loading={loading}
                  onRefresh={refresh}
                />
              </Card>

              <InventoryFilterBar
                stationSizes={stationSizes}
                stations={stations}
                stationSizeId={stationSizeId}
                stationId={stationId}
                status={status}
                loading={loading}
                onStationSizeChange={selectStationSize}
                onStationChange={selectStation}
                onStatusChange={selectStatus}
              />

              <InventoryKpiCards summary={inventory.summary} loading={loading} />

              <Row gutter={[16, 16]}>
                <Col xs={24} lg={10}>
                  <InventoryStatusChart rows={inventory.byStatus} loading={loading} />
                </Col>
                <Col xs={24} lg={8}>
                  <InventoryTierTable
                    rows={inventory.byTier}
                    loading={loading}
                    selectedTierId={stationSizeId}
                    onSelectTier={(id) => selectStationSize(id)}
                  />
                </Col>
                <Col xs={24} lg={6}>
                  <InventoryDeviceTypeTable
                    rows={inventory.byDeviceType}
                    loading={loading}
                  />
                </Col>
              </Row>

              <InventorySitesTable
                rows={inventory.sites}
                loading={loading}
                selectedStationId={stationId}
                onSelectStation={(id) => selectStation(id)}
              />
            </>
          ) : initDone && orgId && !loading && !needsOrg && !error ? (
            <Alert
              type="info"
              showIcon
              title="No sites"
              description="There are no WiFi sites matching the selected filters."
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsSiteInventoryPage;
