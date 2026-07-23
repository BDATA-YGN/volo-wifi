"use client";

import React from "react";
import { Card, Col, Row, Statistic } from "antd";
import { CheckCircleOutlined, ClusterOutlined, KeyOutlined } from "@ant-design/icons";

type Props = {
  total: number;
  activeCount: number;
};

const RadiusProfilesStats: React.FC<Props> = ({ total, activeCount }) => (
  <Row gutter={[12, 12]} className="mb-4">
    <Col xs={24} sm={12} md={8}>
      <Card size="small">
        <Statistic title="Total servers" value={total} prefix={<KeyOutlined />} />
      </Card>
    </Col>
    <Col xs={24} sm={12} md={8}>
      <Card size="small">
        <Statistic title="Active" value={activeCount} prefix={<CheckCircleOutlined />} />
      </Card>
    </Col>
    <Col xs={24} sm={12} md={8}>
      <Card size="small">
        <Statistic
          title="Inactive"
          value={Math.max(0, total - activeCount)}
          prefix={<ClusterOutlined />}
        />
      </Card>
    </Col>
  </Row>
);

export default RadiusProfilesStats;
