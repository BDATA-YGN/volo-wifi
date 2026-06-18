"use client";

import React from "react";
import { Card, Col, Row, Statistic } from "antd";
import {
  CheckCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import type { SitesMeta } from "../types";

type Props = {
  meta?: SitesMeta;
  loading?: boolean;
};

const SitesStats: React.FC<Props> = ({ meta, loading }) => (
  <Row gutter={[16, 16]}>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Matching sites"
          value={meta?.total ?? 0}
          prefix={<UnorderedListOutlined />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Active (billable)"
          value={meta?.activeCount ?? 0}
          prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Maintenance"
          value={meta?.maintenanceCount ?? 0}
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

export default SitesStats;
