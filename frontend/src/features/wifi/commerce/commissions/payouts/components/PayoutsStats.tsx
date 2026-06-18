"use client";

import React from "react";
import { Card, Col, Row, Statistic } from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import type { PayoutsMeta } from "../types";
import { formatMoney } from "../utils";

type Props = {
  meta?: PayoutsMeta;
  loading?: boolean;
};

const PayoutsStats: React.FC<Props> = ({ meta, loading }) => {
  const currency = meta?.currency ?? "MMK";

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} lg={6}>
        <Card size="small" styles={{ body: { padding: 16 } }}>
          <Statistic
            loading={loading}
            title="Matching payouts"
            value={meta?.total ?? 0}
            prefix={<WalletOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card size="small" styles={{ body: { padding: 16 } }}>
          <Statistic
            loading={loading}
            title="Pending review"
            value={meta?.pendingCount ?? 0}
            prefix={<ClockCircleOutlined style={{ color: "#faad14" }} />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card size="small" styles={{ body: { padding: 16 } }}>
          <Statistic
            loading={loading}
            title="Outstanding"
            value={meta?.outstandingAmount ?? 0}
            formatter={(v) => formatMoney(Number(v), currency)}
            prefix={<DollarOutlined style={{ color: "#1677ff" }} />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card size="small" styles={{ body: { padding: 16 } }}>
          <Statistic
            loading={loading}
            title="Paid to date"
            value={meta?.paidAmount ?? 0}
            formatter={(v) => formatMoney(Number(v), currency)}
            prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
          />
        </Card>
      </Col>
    </Row>
  );
};

export default PayoutsStats;
