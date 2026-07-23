"use client";

import React from "react";
import { Card, Col, Row, Statistic, Typography } from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  ExclamationCircleOutlined,
  LockOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import type { CoverageSummary } from "../types";
import { formatGapDays } from "../utils";

const { Text } = Typography;

type Props = {
  summary: CoverageSummary;
  loading?: boolean;
};

const CoverageKpiCards: React.FC<Props> = ({ summary, loading }) => (
  <Row gutter={[16, 16]}>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Purge eligible"
          value={summary.purgeEligibleCount}
          prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
        />
        <Text type="secondary" style={{ fontSize: 12 }}>
          Fully sealed scopes
        </Text>
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Coverage gaps"
          value={summary.gapCount}
          prefix={<WarningOutlined style={{ color: "#faad14" }} />}
        />
        <Text type="secondary" style={{ fontSize: 12 }}>
          {summary.totalUncoveredPayments} uncovered payments
        </Text>
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Unsealed"
          value={summary.unsealedCount}
          prefix={<LockOutlined style={{ color: "#1677ff" }} />}
        />
        <Text type="secondary" style={{ fontSize: 12 }}>
          Missing posting seal
        </Text>
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="No coverage"
          value={summary.noCoverageCount}
          prefix={<ExclamationCircleOutlined style={{ color: "#ff4d4f" }} />}
        />
        <Text type="secondary" style={{ fontSize: 12 }}>
          Payment activity without record
        </Text>
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Scopes tracked"
          value={summary.scopeCount}
          prefix={<DatabaseOutlined style={{ color: "#722ed1" }} />}
        />
        <Text type="secondary" style={{ fontSize: 12 }}>
          {summary.activePaymentScopes} with payment activity
        </Text>
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Avg gap"
          value={formatGapDays(summary.avgGapDays)}
        />
        <Text type="secondary" style={{ fontSize: 12 }}>
          Among scopes with lag
        </Text>
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Sealed count"
          value={summary.sealedCount}
          prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Sealed horizon"
          value={
            summary.latestCoveredAt
              ? new Date(summary.latestCoveredAt).toLocaleDateString()
              : "—"
          }
          prefix={<ClockCircleOutlined style={{ color: "#8c8c8c" }} />}
        />
        <Text type="secondary" style={{ fontSize: 12 }}>
          Latest max covered paid at
        </Text>
      </Card>
    </Col>
  </Row>
);

export default CoverageKpiCards;
