"use client";

import React from "react";
import { Card, Col, Row, Statistic } from "antd";
import {
  CheckCircleOutlined,
  DollarOutlined,
  FileTextOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";
import type { OrdersMeta } from "../types";
import { formatMoney } from "../utils";

type Props = {
  meta?: OrdersMeta;
  loading?: boolean;
};

const OrdersStats: React.FC<Props> = ({ meta, loading }) => {
  const currency = meta?.currency ?? "MMK";
  const paidCount = meta?.statusCounts?.PAID ?? 0;

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} lg={6}>
        <Card size="small" styles={{ body: { padding: 16 } }}>
          <Statistic
            loading={loading}
            title="Matching orders"
            value={meta?.total ?? 0}
            prefix={<FileTextOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card size="small" styles={{ body: { padding: 16 } }}>
          <Statistic
            loading={loading}
            title="Paid orders"
            value={paidCount}
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

export default OrdersStats;
