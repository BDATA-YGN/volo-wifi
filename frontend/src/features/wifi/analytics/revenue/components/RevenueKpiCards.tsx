"use client";

import React from "react";
import { Card, Col, Row, Statistic } from "antd";
import {
  DollarOutlined,
  PercentageOutlined,
  ShoppingCartOutlined,
  ShopOutlined,
} from "@ant-design/icons";
import { KpiDeltaText } from "@/features/wifi/shared/components/KpiDeltaText";
import { WifiMutedText } from "@/features/wifi/shared/components/WifiMutedText";
import type { RevenueAnalyticsSummary } from "../types";
import { formatCount, formatMoney, percentChange } from "../utils";

type Props = {
  summary: RevenueAnalyticsSummary;
  previous: RevenueAnalyticsSummary;
  currency: string;
  loading?: boolean;
};

type KpiProps = {
  title: string;
  value: number | string;
  delta: number | null;
  hint?: string;
  prefix?: React.ReactNode;
  loading?: boolean;
};

const KpiCard: React.FC<KpiProps> = ({ title, value, delta, hint, prefix, loading }) => (
  <Card size="small" styles={{ body: { padding: 16 } }}>
    <Statistic
      loading={loading}
      title={title}
      value={value}
      prefix={prefix}
      formatter={typeof value === "number" ? (v) => formatCount(Number(v)) : undefined}
    />
    {hint ? <WifiMutedText style={{ fontSize: 12 }}>{hint}</WifiMutedText> : null}
    <KpiDeltaText delta={delta} />
  </Card>
);

const RevenueKpiCards: React.FC<Props> = ({ summary, previous, currency, loading }) => (
  <Row gutter={[16, 16]}>
    <Col xs={24} sm={12} lg={8}>
      <KpiCard
        loading={loading}
        title="Gross revenue"
        value={formatMoney(summary.revenue, currency)}
        delta={percentChange(summary.revenue, previous.revenue)}
        prefix={<DollarOutlined style={{ color: "#52c41a" }} />}
      />
    </Col>
    <Col xs={24} sm={12} lg={8}>
      <KpiCard
        loading={loading}
        title="Net revenue"
        value={formatMoney(summary.netRevenue, currency)}
        delta={percentChange(summary.netRevenue, previous.netRevenue)}
      />
    </Col>
    <Col xs={24} sm={12} lg={8}>
      <KpiCard
        loading={loading}
        title="Commission"
        value={formatMoney(summary.commission, currency)}
        delta={percentChange(summary.commission, previous.commission)}
        prefix={<PercentageOutlined style={{ color: "#722ed1" }} />}
      />
    </Col>
    <Col xs={24} sm={12} lg={8}>
      <KpiCard
        loading={loading}
        title="Paid orders"
        value={summary.ordersCount}
        delta={percentChange(summary.ordersCount, previous.ordersCount)}
        prefix={<ShoppingCartOutlined style={{ color: "#1677ff" }} />}
      />
    </Col>
    <Col xs={24} sm={12} lg={8}>
      <KpiCard
        loading={loading}
        title="Tokens sold"
        value={summary.itemsCount}
        delta={percentChange(summary.itemsCount, previous.itemsCount)}
      />
    </Col>
    <Col xs={24} sm={12} lg={8}>
      <KpiCard
        loading={loading}
        title="Avg order value"
        value={formatMoney(summary.avgOrderValue, currency)}
        delta={percentChange(summary.avgOrderValue, previous.avgOrderValue)}
        hint={`${formatCount(summary.siteCount)} sites · ${formatCount(summary.tierCount)} tiers`}
        prefix={<ShopOutlined style={{ color: "#13c2c2" }} />}
      />
    </Col>
  </Row>
);

export default RevenueKpiCards;
