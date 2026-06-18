"use client";

import React from "react";
import { Card, Col, Row, Statistic } from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  HistoryOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import type { AuthEventsMeta } from "../types";

type Props = {
  meta?: AuthEventsMeta;
  loading?: boolean;
};

const AuthEventsStats: React.FC<Props> = ({ meta, loading }) => (
  <Row gutter={[16, 16]}>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Matching events"
          value={meta?.total ?? 0}
          prefix={<UnorderedListOutlined />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Accept today"
          value={meta?.acceptToday ?? 0}
          prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Reject today"
          value={meta?.rejectToday ?? 0}
          prefix={<CloseCircleOutlined style={{ color: "#ff4d4f" }} />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Last 24 hours"
          value={meta?.recentCount ?? 0}
          prefix={<HistoryOutlined style={{ color: "#1677ff" }} />}
        />
      </Card>
    </Col>
  </Row>
);

export default AuthEventsStats;
