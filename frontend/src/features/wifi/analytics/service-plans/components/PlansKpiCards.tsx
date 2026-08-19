"use client";

import React from "react";
import { Card, Col, Row, Statistic } from "antd";
import {
  AppstoreOutlined,
  DollarOutlined,
  PercentageOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";
import { KpiDeltaText } from "@/features/wifi/shared/components/KpiDeltaText";
import type { PlanAnalyticsSummary } from "../types";
import { formatMoney, percentChange } from "../utils";

type Props = {
  summary: PlanAnalyticsSummary;
  previous: PlanAnalyticsSummary;
  currency: string;
  loading?: boolean;
  singlePlan?: boolean;
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

const PlansKpiCards: React.FC<Props> = ({
  summary,
  previous,
  currency,
  loading,
  singlePlan = false,
}) => (
  <Row gutter={[16, 16]}>
    {!singlePlan ? (
      <>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            loading={loading}
            title="Plans in scope"
            value={summary.planCount}
            delta={percentChange(summary.planCount, previous.planCount)}
            prefix={<AppstoreOutlined style={{ color: "#1677ff" }} />}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            loading={loading}
            title="Active plans"
            value={summary.activePlanCount}
            delta={percentChange(summary.activePlanCount, previous.activePlanCount)}
          />
        </Col>
      </>
    ) : null}
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
        title="Tokens sold"
        value={summary.itemsCount}
        delta={percentChange(summary.itemsCount, previous.itemsCount)}
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
  </Row>
);

export default PlansKpiCards;
