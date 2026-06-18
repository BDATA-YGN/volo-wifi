"use client";

import React from "react";
import { Card, Col, Row, Statistic } from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloudOutlined,
  MergeCellsOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import type { ServicePlansMeta } from "../types";

type Props = {
  meta?: ServicePlansMeta;
  loading?: boolean;
};

const ServicePlansStats: React.FC<Props> = ({ meta, loading }) => (
  <Row gutter={[16, 16]}>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Matching plans"
          value={meta?.total ?? 0}
          prefix={<UnorderedListOutlined />}
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
    <Col xs={24} sm={12} lg={4}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Time"
          value={meta?.timeOnlyCount ?? 0}
          prefix={<ClockCircleOutlined style={{ color: "#1677ff" }} />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={4}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Data"
          value={meta?.dataOnlyCount ?? 0}
          prefix={<CloudOutlined style={{ color: "#722ed1" }} />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={4}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Combo"
          value={meta?.comboCount ?? 0}
          prefix={<MergeCellsOutlined style={{ color: "#13c2c2" }} />}
        />
      </Card>
    </Col>
  </Row>
);

export default ServicePlansStats;
