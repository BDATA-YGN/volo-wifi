"use client";

import React from "react";
import { Card, Col, Row, Statistic } from "antd";
import {
  CheckCircleOutlined,
  KeyOutlined,
  StopOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { KpiDeltaText } from "@/features/wifi/shared/components/KpiDeltaText";
import type { CredentialAnalyticsSummary } from "../types";
import { percentChange } from "../utils";

type Props = {
  summary: CredentialAnalyticsSummary;
  previous: CredentialAnalyticsSummary;
  loading?: boolean;
};

type KpiProps = {
  title: string;
  value: number;
  delta: number | null;
  prefix?: React.ReactNode;
  loading?: boolean;
};

const KpiCard: React.FC<KpiProps> = ({ title, value, delta, prefix, loading }) => (
  <Card size="small" styles={{ body: { padding: 16 } }}>
    <Statistic loading={loading} title={title} value={value} prefix={prefix} />
    <KpiDeltaText delta={delta} />
  </Card>
);

const TokensKpiCards: React.FC<Props> = ({ summary, previous, loading }) => (
  <Row gutter={[16, 16]}>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Inventory"
        value={summary.inventoryCount}
        delta={null}
        prefix={<KeyOutlined style={{ color: "#1677ff" }} />}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Active pipeline"
        value={summary.activeCount}
        delta={null}
        prefix={<SyncOutlined style={{ color: "#13c2c2" }} />}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Terminal"
        value={summary.terminalCount}
        delta={null}
        prefix={<StopOutlined style={{ color: "#8c8c8c" }} />}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Sold"
        value={summary.soldInPeriod}
        delta={percentChange(summary.soldInPeriod, previous.soldInPeriod)}
        prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Activated"
        value={summary.activatedInPeriod}
        delta={percentChange(summary.activatedInPeriod, previous.activatedInPeriod)}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Expired"
        value={summary.expiredInPeriod}
        delta={percentChange(summary.expiredInPeriod, previous.expiredInPeriod)}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Revoked"
        value={summary.revokedInPeriod}
        delta={percentChange(summary.revokedInPeriod, previous.revokedInPeriod)}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Archived"
        value={summary.archivedInPeriod}
        delta={percentChange(summary.archivedInPeriod, previous.archivedInPeriod)}
      />
    </Col>
  </Row>
);

export default TokensKpiCards;
