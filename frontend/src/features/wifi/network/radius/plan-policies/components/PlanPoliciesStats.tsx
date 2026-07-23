"use client";

import React from "react";
import { Card, Col, Row, Statistic } from "antd";
import { CheckCircleOutlined, SafetyOutlined, UnorderedListOutlined } from "@ant-design/icons";
import type { PlanPoliciesMeta } from "../types";

type Props = {
  meta?: PlanPoliciesMeta;
  loading?: boolean;
};

const PlanPoliciesStats: React.FC<Props> = ({ meta, loading }) => (
  <Row gutter={[16, 16]}>
    <Col xs={24} sm={8}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Policy groups"
          value={meta?.policyGroups ?? meta?.total ?? 0}
          prefix={<UnorderedListOutlined />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={8}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Plans with policies"
          value={meta?.plansWithPolicies ?? 0}
          prefix={<SafetyOutlined style={{ color: "#1677ff" }} />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={8}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Attribute rows"
          value={meta?.attributeRows ?? meta?.phaseCounts?.REPLY ?? 0}
          prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
        />
      </Card>
    </Col>
  </Row>
);

export default PlanPoliciesStats;
