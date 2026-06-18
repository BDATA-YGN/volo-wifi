"use client";

import React from "react";
import { Card, Col, Row, Statistic } from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  FileTextOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { KpiDeltaText } from "@/features/wifi/shared/components/KpiDeltaText";
import { WifiMutedText } from "@/features/wifi/shared/components/WifiMutedText";
import type { SettlementSummary } from "../types";
import { formatMoney, percentChange } from "../utils";

type Props = {
  summary: SettlementSummary;
  previous: SettlementSummary;
  currency: string;
  loading?: boolean;
};

type KpiProps = {
  title: string;
  value: number | string;
  delta: number | null;
  prefix?: React.ReactNode;
  loading?: boolean;
  subtitle?: string;
};

const KpiCard: React.FC<KpiProps> = ({ title, value, delta, prefix, loading, subtitle }) => (
  <Card size="small" styles={{ body: { padding: 16 } }}>
    <Statistic loading={loading} title={title} value={value} prefix={prefix} />
    {subtitle ? (
      <WifiMutedText style={{ fontSize: 12, display: "block", marginTop: 4 }}>
        {subtitle}
      </WifiMutedText>
    ) : null}
    {delta != null ? <KpiDeltaText delta={delta} /> : null}
  </Card>
);

const SettlementsKpiCards: React.FC<Props> = ({ summary, previous, currency, loading }) => (
  <Row gutter={[16, 16]}>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Settlements"
        value={summary.settlementCount}
        delta={percentChange(summary.settlementCount, previous.settlementCount)}
        prefix={<FileTextOutlined style={{ color: "#1677ff" }} />}
        subtitle={`${summary.openCount} open`}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="System total"
        value={formatMoney(summary.systemTotal, currency)}
        delta={percentChange(summary.systemTotal, previous.systemTotal)}
        prefix={<DollarOutlined style={{ color: "#52c41a" }} />}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Cash variance"
        value={formatMoney(summary.varianceTotal, currency)}
        delta={percentChange(summary.varianceTotal, previous.varianceTotal)}
        prefix={<WarningOutlined style={{ color: "#faad14" }} />}
        subtitle={`${summary.withVarianceCount} with mismatch`}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Posted"
        value={summary.postedCount}
        delta={percentChange(summary.postedCount, previous.postedCount)}
        prefix={<CheckCircleOutlined style={{ color: "#722ed1" }} />}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Declared total"
        value={formatMoney(summary.declaredTotal, currency)}
        delta={percentChange(summary.declaredTotal, previous.declaredTotal)}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Payments"
        value={summary.systemPaymentsCount}
        delta={percentChange(summary.systemPaymentsCount, previous.systemPaymentsCount)}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Orders"
        value={summary.systemOrdersCount}
        delta={percentChange(summary.systemOrdersCount, previous.systemOrdersCount)}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Rejected"
        value={summary.rejectedCount}
        delta={percentChange(summary.rejectedCount, previous.rejectedCount)}
        prefix={<ClockCircleOutlined style={{ color: "#ff4d4f" }} />}
      />
    </Col>
  </Row>
);

export default SettlementsKpiCards;
