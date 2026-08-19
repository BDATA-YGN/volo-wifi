"use client";

import React from "react";
import { Card, Col, Row, Statistic } from "antd";
import { WifiMutedText } from "@/features/wifi/shared/components/WifiMutedText";
import {
  DollarOutlined,
  ShoppingCartOutlined,
  ThunderboltOutlined,
  UserOutlined,
  WarningOutlined,
  WifiOutlined,
} from "@ant-design/icons";
import type { LiveOpsSummary } from "../types";
import { formatBytes, formatMoney } from "../utils";

type Props = {
  summary: LiveOpsSummary;
  currency: string;
  loading?: boolean;
};

const LiveOpsKpiCards: React.FC<Props> = ({ summary, currency, loading }) => (
  <Row gutter={[16, 16]}>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Active sessions"
          value={summary.activeSessions}
          prefix={<WifiOutlined style={{ color: "#1677ff" }} />}
        />
        <WifiMutedText style={{ fontSize: 12 }}>
          {formatBytes(summary.activeBytes)} in flight
        </WifiMutedText>
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Stalled"
          value={summary.stalledSessions}
          prefix={<WarningOutlined style={{ color: "#faad14" }} />}
        />
        <WifiMutedText style={{ fontSize: 12 }}>
          No interim update 30m+
        </WifiMutedText>
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Sessions started"
          value={summary.sessionsStarted}
          prefix={<ThunderboltOutlined style={{ color: "#13c2c2" }} />}
        />
        <WifiMutedText style={{ fontSize: 12 }}>
          {summary.uniqueCredentials} unique credentials
        </WifiMutedText>
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Orders"
          value={summary.ordersCount}
          prefix={<ShoppingCartOutlined style={{ color: "#722ed1" }} />}
        />
        <WifiMutedText style={{ fontSize: 12 }}>
          {summary.paymentsCount} payments
        </WifiMutedText>
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Revenue"
          value={formatMoney(summary.revenue, currency)}
          prefix={<DollarOutlined style={{ color: "#52c41a" }} />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic loading={loading} title="Day orders (stats)" value={summary.todayOrders} />
        <WifiMutedText style={{ fontSize: 12 }}>
          {formatMoney(summary.todayRevenue, currency)} revenue
        </WifiMutedText>
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic loading={loading} title="Day sessions (stats)" value={summary.todaySessions} />
        <WifiMutedText style={{ fontSize: 12 }}>
          {formatBytes(summary.todayBytes)}
        </WifiMutedText>
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Stopped"
          value={summary.sessionsStopped}
          prefix={<UserOutlined style={{ color: "#8c8c8c" }} />}
        />
      </Card>
    </Col>
  </Row>
);

export default LiveOpsKpiCards;
