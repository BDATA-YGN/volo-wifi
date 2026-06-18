"use client";

import React from "react";
import { Card, Col, Row, Statistic } from "antd";
import {
  CheckCircleOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import type { TenantsMeta } from "../types";

type Props = {
  meta?: TenantsMeta;
  loading?: boolean;
};

const TenantsStats: React.FC<Props> = ({ meta, loading }) => (
  <Row gutter={[16, 16]}>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Tenants"
          value={meta?.total ?? 0}
          prefix={<TeamOutlined style={{ color: "#1677ff" }} />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Active orgs"
          value={meta?.activeOrgCount ?? 0}
          prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="With subscription"
          value={meta?.withLicenseCount ?? 0}
          prefix={<SafetyCertificateOutlined style={{ color: "#722ed1" }} />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Near site limit"
          value={meta?.nearLimitCount ?? 0}
          prefix={<WarningOutlined style={{ color: "#faad14" }} />}
        />
      </Card>
    </Col>
  </Row>
);

export default TenantsStats;
