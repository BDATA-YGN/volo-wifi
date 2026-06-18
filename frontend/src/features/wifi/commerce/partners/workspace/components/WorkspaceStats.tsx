"use client";

import React from "react";
import { Card, Col, Row, Statistic } from "antd";
import {
  DollarOutlined,
  KeyOutlined,
  ShoppingCartOutlined,
  ShopOutlined,
} from "@ant-design/icons";
import type { WorkspaceDashboard } from "../types";
import { formatMoney } from "../utils";

type Props = {
  dashboard: WorkspaceDashboard;
  loading?: boolean;
};

const WorkspaceStats: React.FC<Props> = ({ dashboard, loading }) => {
  const { stats, org } = dashboard;

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} lg={6}>
        <Card size="small" styles={{ body: { padding: 16 } }}>
          <Statistic
            loading={loading}
            title="Today's orders"
            value={stats.ordersToday}
            prefix={<ShoppingCartOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card size="small" styles={{ body: { padding: 16 } }}>
          <Statistic
            loading={loading}
            title="Today's revenue"
            value={formatMoney(stats.revenueToday, org.currency)}
            prefix={<DollarOutlined style={{ color: "#52c41a" }} />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card size="small" styles={{ body: { padding: 16 } }}>
          <Statistic
            loading={loading}
            title="Active tokens"
            value={stats.credentialsActive}
            prefix={<KeyOutlined style={{ color: "#1677ff" }} />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card size="small" styles={{ body: { padding: 16 } }}>
          <Statistic
            loading={loading}
            title="Mapped sites"
            value={stats.stationCount}
            prefix={<ShopOutlined />}
          />
        </Card>
      </Col>
    </Row>
  );
};

export default WorkspaceStats;
