"use client";

import React from "react";
import { Card, Col, Row, Statistic } from "antd";
import {
  ApiOutlined,
  ClockCircleOutlined,
  DisconnectOutlined,
  WifiOutlined,
} from "@ant-design/icons";
import type { LiveSessionsMeta } from "../types";
import { formatBytes } from "../utils";

type Props = {
  meta?: LiveSessionsMeta;
  loading?: boolean;
};

const LiveSessionsStats: React.FC<Props> = ({ meta, loading }) => (
  <Row gutter={[16, 16]}>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Active sessions"
          value={meta?.activeCount ?? 0}
          prefix={<WifiOutlined style={{ color: "#52c41a" }} />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Interim updates"
          value={meta?.interimCount ?? 0}
          prefix={<ApiOutlined style={{ color: "#1677ff" }} />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Stopped today"
          value={meta?.stoppedToday ?? 0}
          prefix={<DisconnectOutlined />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Active data volume"
          value={formatBytes(meta?.activeTotalBytes)}
          prefix={<ClockCircleOutlined style={{ color: "#722ed1" }} />}
          styles={{ content: { fontSize: 20 } }}
        />
      </Card>
    </Col>
  </Row>
);

export default LiveSessionsStats;
