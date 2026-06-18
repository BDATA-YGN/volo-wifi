"use client";

import React from "react";
import { Card, Col, Row, Statistic } from "antd";
import {
  CheckCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import type { PartnersMeta } from "../types";

type Props = {
  meta?: PartnersMeta;
  loading?: boolean;
};

const PartnersStats: React.FC<Props> = ({ meta, loading }) => (
  <Row gutter={[16, 16]}>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Matching partners"
          value={meta?.total ?? 0}
          prefix={<TeamOutlined />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Active"
          value={meta?.activeCount ?? 0}
          prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Suspended"
          value={meta?.suspendedCount ?? 0}
          prefix={<PauseCircleOutlined style={{ color: "#faad14" }} />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Disabled"
          value={meta?.disabledCount ?? 0}
          prefix={<StopOutlined />}
        />
      </Card>
    </Col>
  </Row>
);

export default PartnersStats;
