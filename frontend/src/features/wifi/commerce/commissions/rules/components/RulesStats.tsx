"use client";

import React from "react";
import { Card, Col, Row, Statistic } from "antd";
import {
  CheckCircleOutlined,
  PercentageOutlined,
  SettingOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import type { RulesMeta } from "../types";

type Props = {
  meta?: RulesMeta;
  loading?: boolean;
};

const RulesStats: React.FC<Props> = ({ meta, loading }) => (
  <Row gutter={[16, 16]}>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Matching rules"
          value={meta?.total ?? 0}
          prefix={<SettingOutlined />}
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
          title="Percent rules"
          value={meta?.percentCount ?? 0}
          prefix={<PercentageOutlined style={{ color: "#1677ff" }} />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Fixed rules"
          value={meta?.fixedCount ?? 0}
          prefix={<WalletOutlined style={{ color: "#722ed1" }} />}
        />
      </Card>
    </Col>
  </Row>
);

export default RulesStats;
