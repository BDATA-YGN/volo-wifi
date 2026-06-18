"use client";

import React from "react";
import { Card, Col, Row, Statistic, Typography } from "antd";
import {
  ApiOutlined,
  DisconnectOutlined,
  HddOutlined,
  LinkOutlined,
  SafetyCertificateOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import type { NasInventorySummary } from "../types";

const { Text } = Typography;

type Props = {
  summary: NasInventorySummary;
  loading?: boolean;
};

type KpiProps = {
  title: string;
  value: number | string;
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

const NasKpiCards: React.FC<Props> = ({ summary, loading }) => (
  <Row gutter={[16, 16]}>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Total devices"
        value={summary.deviceCount}
        prefix={<HddOutlined style={{ color: "#1677ff" }} />}
        subtitle={`${summary.assignedCount} assigned`}
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
        title="Unassigned"
        value={summary.unassignedCount}
        prefix={<DisconnectOutlined style={{ color: "#faad14" }} />}
        highlight={summary.unassignedCount > 0 ? "warning" : undefined}
        subtitle="No site linked"
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Avg readiness"
        value={`${summary.avgReadinessScore}%`}
        prefix={<SafetyCertificateOutlined style={{ color: "#52c41a" }} />}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="With IP"
        value={summary.withIpCount}
        prefix={<LinkOutlined style={{ color: "#722ed1" }} />}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="With MAC"
        value={summary.withMacCount}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="RADIUS gaps"
        value={summary.radiusMissingSecret + summary.radiusMissingNasId}
        prefix={<WarningOutlined style={{ color: "#ff4d4f" }} />}
        subtitle={`${summary.radiusMissingSecret} no secret · ${summary.radiusMissingNasId} no NAS ID`}
        highlight={
          summary.radiusMissingSecret + summary.radiusMissingNasId > 0 ? "danger" : undefined
        }
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="With serial"
        value={summary.withSerialCount}
      />
    </Col>
  </Row>
);

export default NasKpiCards;
