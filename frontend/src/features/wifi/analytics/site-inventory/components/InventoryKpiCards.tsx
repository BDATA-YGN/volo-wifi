"use client";

import React from "react";
import { Card, Col, Row, Statistic, Typography } from "antd";
import {
  AlertOutlined,
  ApiOutlined,
  CheckCircleOutlined,
  EnvironmentOutlined,
  HddOutlined,
  ToolOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import type { SiteInventorySummary } from "../types";

const { Text } = Typography;

type Props = {
  summary: SiteInventorySummary;
  loading?: boolean;
};

type KpiProps = {
  title: string;
  value: number;
  prefix?: React.ReactNode;
  loading?: boolean;
  subtitle?: string;
  highlight?: "warning" | "danger";
};

const KpiCard: React.FC<KpiProps> = ({
  title,
  value,
  prefix,
  loading,
  subtitle,
  highlight,
}) => (
  <Card size="small" styles={{ body: { padding: 16 } }}>
    <Statistic loading={loading} title={title} value={value} prefix={prefix} />
    {subtitle ? (
      <Text
        type={highlight === "danger" ? "danger" : highlight === "warning" ? "warning" : "secondary"}
        style={{ fontSize: 12, display: "block", marginTop: 4 }}
      >
        {subtitle}
      </Text>
    ) : null}
  </Card>
);

const InventoryKpiCards: React.FC<Props> = ({ summary, loading }) => (
  <Row gutter={[16, 16]}>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Sites"
        value={summary.siteCount}
        prefix={<EnvironmentOutlined style={{ color: "#1677ff" }} />}
        subtitle={`${summary.activeCount} active`}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Active"
        value={summary.activeCount}
        prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Maintenance"
        value={summary.maintenanceCount}
        prefix={<ToolOutlined style={{ color: "#faad14" }} />}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Disabled"
        value={summary.disabledCount}
        prefix={<AlertOutlined style={{ color: "#8c8c8c" }} />}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Devices"
        value={summary.deviceCount}
        prefix={<HddOutlined style={{ color: "#722ed1" }} />}
        subtitle={
          summary.unassignedDeviceCount > 0
            ? `${summary.unassignedDeviceCount} unassigned`
            : undefined
        }
        highlight={summary.unassignedDeviceCount > 0 ? "warning" : undefined}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="RADIUS clients"
        value={summary.radiusClientCount}
        prefix={<ApiOutlined style={{ color: "#13c2c2" }} />}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="No devices"
        value={summary.sitesWithoutDevices}
        prefix={<WarningOutlined style={{ color: "#ff4d4f" }} />}
        subtitle="Sites missing NAS hardware"
        highlight={summary.sitesWithoutDevices > 0 ? "danger" : undefined}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Config gaps"
        value={summary.sitesWithoutRadiusIp + summary.sitesWithoutVendorProfile}
        prefix={<WarningOutlined style={{ color: "#fa8c16" }} />}
        subtitle={`${summary.sitesWithoutRadiusIp} no RADIUS IP · ${summary.sitesWithoutVendorProfile} no vendor profile`}
        highlight={
          summary.sitesWithoutRadiusIp + summary.sitesWithoutVendorProfile > 0
            ? "warning"
            : undefined
        }
      />
    </Col>
  </Row>
);

export default InventoryKpiCards;
