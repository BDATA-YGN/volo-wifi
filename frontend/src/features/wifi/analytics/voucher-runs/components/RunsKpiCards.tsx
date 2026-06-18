"use client";

import React from "react";
import { Card, Col, Row, Statistic } from "antd";
import {
  CheckCircleOutlined,
  GiftOutlined,
  PercentageOutlined,
  StopOutlined,
  TagsOutlined,
} from "@ant-design/icons";
import { KpiDeltaText } from "@/features/wifi/shared/components/KpiDeltaText";
import type { VoucherRunSummary } from "../types";
import { percentChange } from "../utils";

type Props = {
  summary: VoucherRunSummary;
  previous: VoucherRunSummary;
  loading?: boolean;
};

type KpiProps = {
  title: string;
  value: number | string;
  delta: number | null;
  prefix?: React.ReactNode;
  loading?: boolean;
  suffix?: string;
};

const KpiCard: React.FC<KpiProps> = ({ title, value, delta, prefix, loading, suffix }) => (
  <Card size="small" styles={{ body: { padding: 16 } }}>
    <Statistic
      loading={loading}
      title={title}
      value={value}
      prefix={prefix}
      suffix={suffix}
    />
    {delta != null ? <KpiDeltaText delta={delta} /> : null}
  </Card>
);

const RunsKpiCards: React.FC<Props> = ({ summary, previous, loading }) => (
  <Row gutter={[16, 16]}>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Voucher runs"
        value={summary.batchCount}
        delta={percentChange(summary.batchCount, previous.batchCount)}
        prefix={<TagsOutlined style={{ color: "#1677ff" }} />}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Vouchers issued"
        value={summary.totalIssued}
        delta={percentChange(summary.totalIssued, previous.totalIssued)}
        prefix={<GiftOutlined style={{ color: "#722ed1" }} />}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Utilization"
        value={summary.utilizationPercent}
        delta={percentChange(summary.utilizationPercent, previous.utilizationPercent)}
        prefix={<PercentageOutlined style={{ color: "#52c41a" }} />}
        suffix="%"
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Remaining"
        value={summary.totalRemaining}
        delta={percentChange(summary.totalRemaining, previous.totalRemaining)}
        prefix={<StopOutlined style={{ color: "#8c8c8c" }} />}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Redeemed"
        value={summary.totalRedeemed}
        delta={percentChange(summary.totalRedeemed, previous.totalRedeemed)}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Activated"
        value={summary.activatedInPeriod}
        delta={percentChange(summary.activatedInPeriod, previous.activatedInPeriod)}
        prefix={<CheckCircleOutlined style={{ color: "#13c2c2" }} />}
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
  </Row>
);

export default RunsKpiCards;
