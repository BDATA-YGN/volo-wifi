"use client";

import React from "react";
import { Card, Col, Row, Statistic } from "antd";
import {
  CreditCardOutlined,
  DollarOutlined,
  RollbackOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import type { PaymentsMeta } from "../types";
import { formatMoney } from "../utils";

type Props = {
  meta?: PaymentsMeta;
  loading?: boolean;
};

const PaymentsStats: React.FC<Props> = ({ meta, loading }) => {
  const currency = meta?.currency ?? "MMK";
  const cashAmount = meta?.methodAmounts?.CASH ?? 0;
  const refundedCount = meta?.refundedCount ?? meta?.statusCounts?.REFUNDED ?? 0;

  return (
    <>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" styles={{ body: { padding: 16 } }}>
            <Statistic
              loading={loading}
              title="Matching payments"
              value={meta?.total ?? 0}
              prefix={<CreditCardOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" styles={{ body: { padding: 16 } }}>
            <Statistic
              loading={loading}
              title="Today's payments"
              value={meta?.todayCount ?? 0}
              prefix={<WalletOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" styles={{ body: { padding: 16 } }}>
            <Statistic
              loading={loading}
              title="Today's tender"
              value={formatMoney(meta?.todayAmount ?? 0, currency)}
              prefix={<DollarOutlined style={{ color: "#52c41a" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" styles={{ body: { padding: 16 } }}>
            <Statistic
              loading={loading}
              title="Cash collected"
              value={formatMoney(cashAmount, currency)}
              prefix={<DollarOutlined style={{ color: "#1677ff" }} />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="mt-4">
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" styles={{ body: { padding: 16 } }}>
            <Statistic
              loading={loading}
              title="Refunded payments"
              value={refundedCount}
              prefix={<RollbackOutlined style={{ color: "#faad14" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" styles={{ body: { padding: 16 } }}>
            <Statistic
              loading={loading}
              title="Refunded today"
              value={meta?.refundedTodayCount ?? 0}
              prefix={<RollbackOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" styles={{ body: { padding: 16 } }}>
            <Statistic
              loading={loading}
              title="Refunded today amount"
              value={formatMoney(meta?.refundedTodayAmount ?? 0, currency)}
              prefix={<DollarOutlined style={{ color: "#faad14" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" styles={{ body: { padding: 16 } }}>
            <Statistic
              loading={loading}
              title="Refunded this month"
              value={formatMoney(meta?.refundedMonthAmount ?? 0, currency)}
              prefix={<DollarOutlined style={{ color: "#d48806" }} />}
            />
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default PaymentsStats;
