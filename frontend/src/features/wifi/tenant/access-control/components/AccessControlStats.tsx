"use client";

import React from "react";
import { Card, Col, Row, Statistic } from "antd";
import { SafetyOutlined, TeamOutlined, UserSwitchOutlined } from "@ant-design/icons";
import type { AccessControlMeta } from "../types";

type Props = {
  meta?: AccessControlMeta;
  loading?: boolean;
};

const AccessControlStats: React.FC<Props> = ({ meta, loading }) => (
  <Row gutter={[16, 16]}>
    <Col xs={24} sm={8}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Team members"
          value={meta?.total ?? 0}
          prefix={<TeamOutlined style={{ color: "#1677ff" }} />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={8}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Active"
          value={meta?.activeCount ?? 0}
          prefix={<SafetyOutlined style={{ color: "#52c41a" }} />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={8}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Role assignments"
          value={meta?.roleAssignments ?? 0}
          prefix={<UserSwitchOutlined style={{ color: "#722ed1" }} />}
        />
      </Card>
    </Col>
  </Row>
);

export default AccessControlStats;
