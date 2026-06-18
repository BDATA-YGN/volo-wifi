"use client";

import React from "react";
import { Card, Col, Row, Statistic } from "antd";
import {
  CheckCircleOutlined,
  TeamOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import type { SubscriptionMeta } from "../types";

type Props = {
  meta?: SubscriptionMeta;
  loading?: boolean;
};

const SubscriptionStats: React.FC<Props> = ({ meta, loading }) => (
  <Row gutter={[16, 16]}>
    <Col xs={24} sm={8}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Total subscriptions"
          value={meta?.total ?? 0}
          prefix={<TeamOutlined />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={8}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Active"
          value={meta?.activeCount ?? 0}
          prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={8}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Near site limit (≥85%)"
          value={meta?.nearLimitCount ?? 0}
          prefix={<WarningOutlined style={{ color: meta?.nearLimitCount ? "#faad14" : undefined }} />}
        />
      </Card>
    </Col>
  </Row>
);

export default SubscriptionStats;
