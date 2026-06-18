"use client";

import React from "react";
import { Card, Col, Row, Statistic } from "antd";
import {
  DollarOutlined,
  PercentageOutlined,
  ShoppingCartOutlined,
  WifiOutlined,
} from "@ant-design/icons";
import { KpiDeltaText } from "@/features/wifi/shared/components/KpiDeltaText";
import type { InsightsSummary } from "../types";
import { formatBytes, formatMoney, percentChange } from "../utils";

type Props = {
  summary: InsightsSummary;
  previous: InsightsSummary;
  currency: string;
  loading?: boolean;
};

type KpiProps = {
  title: string;
  value: number | string;
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

const InsightsKpiCards: React.FC<Props> = ({ summary, previous, currency, loading }) => (
  <Row gutter={[16, 16]}>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Revenue"
        value={formatMoney(summary.revenue, currency)}
        delta={percentChange(summary.revenue, previous.revenue)}
        prefix={<DollarOutlined style={{ color: "#52c41a" }} />}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Orders"
        value={summary.ordersCount}
        delta={percentChange(summary.ordersCount, previous.ordersCount)}
        prefix={<ShoppingCartOutlined style={{ color: "#1677ff" }} />}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Commission"
        value={formatMoney(summary.commission, currency)}
        delta={percentChange(summary.commission, previous.commission)}
        prefix={<PercentageOutlined style={{ color: "#722ed1" }} />}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="WiFi sessions"
        value={summary.sessionsCount}
        delta={percentChange(summary.sessionsCount, previous.sessionsCount)}
        prefix={<WifiOutlined style={{ color: "#13c2c2" }} />}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Tokens sold"
        value={summary.itemsCount}
        delta={percentChange(summary.itemsCount, previous.itemsCount)}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Net revenue"
        value={formatMoney(summary.netRevenue, currency)}
        delta={percentChange(summary.netRevenue, previous.netRevenue)}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Unique tokens used"
        value={summary.uniqueCredentials}
        delta={percentChange(summary.uniqueCredentials, previous.uniqueCredentials)}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Data transferred"
        value={formatBytes(summary.totalBytes)}
        delta={percentChange(summary.totalBytes, previous.totalBytes)}
      />
    </Col>
  </Row>
);

export default InsightsKpiCards;
