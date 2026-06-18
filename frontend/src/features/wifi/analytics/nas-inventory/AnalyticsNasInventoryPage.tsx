"use client";

import React, { useEffect, useMemo } from "react";
import Link from "next/link";
import { Alert, Button, Card, Col, Row, Tag, Typography, theme } from "antd";
import { Server, X } from "lucide-react";
import dayjs from "dayjs";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import OrgSwitcher from "@/features/wifi/tenant/profile/components/OrgSwitcher";
import { useAnalyticsNasInventory } from "./useAnalyticsNasInventory";
import { formatDeviceType } from "./utils";
import NasToolbar from "./components/NasToolbar";
import NasFilterBar from "./components/NasFilterBar";
import NasKpiCards from "./components/NasKpiCards";
import NasTypeChart from "./components/NasTypeChart";
import NasVendorTable from "./components/NasVendorTable";
import NasSiteTable from "./components/NasSiteTable";
import NasDevicesTable from "./components/NasDevicesTable";

const { Title, Paragraph, Text } = Typography;

const AnalyticsNasInventoryPage: React.FC = () => {
  const { token } = theme.useToken();
  const [initDone, setInitDone] = React.useState(false);

  const {
    inventory,
    meta,
    loading,
    error,
    orgId,
    stationId,
    deviceType,
    isRadiusClient,
    unassignedOnly,
    formOptions,
    selectOrg,
    selectStation,
    selectDeviceType,
    selectRadiusClient,
    selectUnassignedOnly,
    clearFilters,
    refresh,
    loadFormOptions,
  } = useAnalyticsNasInventory();

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
  const stations = formOptions.stations;
  const showOrgSwitcher = memberships.length > 1;
  const needsOrg = Boolean(meta?.requiresOrgSelection) && !orgId;

  const scopedSiteCode = useMemo(() => {
    if (!stationId) return null;
    return stations.find((s) => s.id === stationId)?.code ?? null;
  }, [stationId, stations]);

  const hasFilters = Boolean(
    stationId || deviceType || isRadiusClient !== undefined || unassignedOnly
  );

  const handleSelectSite = (id: string | null) => {
    if (id === null) {
      selectUnassignedOnly(true);
    } else {
      selectStation(id);
    }
  };

  return (
    <div className="p-0">
      <CommonHeader icon={Server} />

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
            NAS device fleet report — routers, access points, and RADIUS clients across your sites.
            Manage hardware in <Link href="/wifi/network/nas-devices">NAS Devices</Link> or review
            site roll-up in{" "}
            <Link href="/wifi/analytics/site-inventory">Site Inventory</Link>.
          </Paragraph>
        </div>

        {error ? (
          <Alert
            type="error"
            showIcon
            className="mb-4"
            title="Failed to load NAS inventory"
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
              description="Choose a tenant to view NAS device inventory."
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
                      Device fleet
                    </Title>
                    <Paragraph type="secondary" style={{ marginBottom: 8, marginTop: 4 }}>
                      {inventory.org.name}
                      {inventory.generatedAt
                        ? ` · ${dayjs(inventory.generatedAt).format("D MMM YYYY, HH:mm")}`
                        : ""}
                    </Paragraph>
                    <div className="flex flex-wrap gap-2">
                      <Tag style={{ fontFamily: "monospace" }}>{inventory.org.code}</Tag>
                      <Tag color="blue">{inventory.summary.deviceCount} devices</Tag>
                      <Tag color="cyan">{inventory.summary.radiusClientCount} RADIUS</Tag>
                      {inventory.summary.unassignedCount > 0 ? (
                        <Tag color="warning">{inventory.summary.unassignedCount} unassigned</Tag>
                      ) : null}
                      {scopedSiteCode ? (
                        <Tag style={{ fontFamily: "monospace" }}>{scopedSiteCode}</Tag>
                      ) : null}
                      {unassignedOnly ? <Tag color="warning">Unassigned only</Tag> : null}
                      {deviceType ? (
                        <Tag>{formatDeviceType(deviceType)}</Tag>
                      ) : null}
                      {isRadiusClient === true ? <Tag color="blue">RADIUS clients</Tag> : null}
                      {isRadiusClient === false ? <Tag>Non-RADIUS</Tag> : null}
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
                      {inventory.summary.avgReadinessScore}%
                    </Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      avg config completeness score
                    </Text>
                  </div>
                </div>
              </Card>

              <Card
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <NasToolbar
                  generatedAt={inventory.generatedAt}
                  loading={loading}
                  onRefresh={refresh}
                />
              </Card>

              <NasFilterBar
                stations={stations}
                stationId={stationId}
                deviceType={deviceType}
                isRadiusClient={isRadiusClient}
                unassignedOnly={unassignedOnly}
                loading={loading}
                onStationChange={selectStation}
                onDeviceTypeChange={selectDeviceType}
                onRadiusClientChange={selectRadiusClient}
                onUnassignedOnlyChange={selectUnassignedOnly}
              />

              <NasKpiCards summary={inventory.summary} loading={loading} />

              <Row gutter={[16, 16]}>
                <Col xs={24} lg={8}>
                  <NasTypeChart rows={inventory.byType} loading={loading} />
                </Col>
                <Col xs={24} lg={8}>
                  <NasVendorTable rows={inventory.byVendor} loading={loading} />
                </Col>
                <Col xs={24} lg={8}>
                  <NasSiteTable
                    rows={inventory.bySite}
                    loading={loading}
                    selectedStationId={unassignedOnly ? null : stationId}
                    onSelectSite={handleSelectSite}
                  />
                </Col>
              </Row>

              <NasDevicesTable rows={inventory.devices} loading={loading} />
            </>
          ) : initDone && orgId && !loading && !needsOrg && !error ? (
            <Alert
              type="info"
              showIcon
              title="No devices"
              description="There are no NAS devices matching the selected filters."
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsNasInventoryPage;
