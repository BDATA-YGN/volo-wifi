"use client";

import React from "react";
import { Card, Col, Row, Statistic } from "antd";
import {
  CheckCircleOutlined,
  DollarOutlined,
  KeyOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";
import type { AccessTokensMeta } from "../types";
import { formatMoney } from "../utils";

type Props = {
  meta?: AccessTokensMeta;
  currency?: string;
  loading?: boolean;
};

const AccessTokensStats: React.FC<Props> = ({ meta, currency = "MMK", loading }) => {
  const counts = meta?.statusCounts ?? {};
  const soldOrActive = (counts.SOLD ?? 0) + (counts.ACTIVATED ?? 0);

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} lg={6}>
        <Card size="small" styles={{ body: { padding: 16 } }}>
          <Statistic
            loading={loading}
            title="Matching tokens"
            value={meta?.total ?? 0}
            prefix={<KeyOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card size="small" styles={{ body: { padding: 16 } }}>
          <Statistic
            loading={loading}
            title="Sold / active"
            value={soldOrActive}
            prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card size="small" styles={{ body: { padding: 16 } }}>
          <Statistic
            loading={loading}
            title="Today's sales"
            value={meta?.todayOrders ?? 0}
            prefix={<ShoppingCartOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card size="small" styles={{ body: { padding: 16 } }}>
          <Statistic
            loading={loading}
            title="Today's revenue"
            value={formatMoney(meta?.todayRevenue ?? 0, currency)}
            prefix={<DollarOutlined style={{ color: "#1677ff" }} />}
          />
        </Card>
      </Col>
    </Row>
  );
};

export default AccessTokensStats;
