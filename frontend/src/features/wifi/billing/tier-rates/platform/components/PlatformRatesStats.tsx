"use client";

import React from "react";
import { Card, Col, Row, Statistic } from "antd";
import {
  CalendarOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import type { PlatformRatesMeta } from "../types";

type Props = {
  meta?: PlatformRatesMeta;
  loading?: boolean;
};

const PlatformRatesStats: React.FC<Props> = ({ meta, loading }) => (
  <Row gutter={[16, 16]}>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Active tiers"
          value={meta?.tierCount ?? 0}
          prefix={<DollarOutlined />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Tiers with current rate"
          value={meta?.coveredCount ?? 0}
          suffix={meta?.tierCount ? `/ ${meta.tierCount}` : undefined}
          prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Missing rates"
          value={meta?.missingCount ?? 0}
          prefix={<WarningOutlined style={{ color: meta?.missingCount ? "#faad14" : undefined }} />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Scheduled changes"
          value={meta?.scheduledCount ?? 0}
          prefix={<CalendarOutlined />}
        />
      </Card>
    </Col>
  </Row>
);

export default PlatformRatesStats;
