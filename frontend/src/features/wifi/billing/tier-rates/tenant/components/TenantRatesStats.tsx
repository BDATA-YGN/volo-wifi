"use client";

import React from "react";
import { Card, Col, Row, Statistic } from "antd";
import {
  BankOutlined,
  CheckCircleOutlined,
  SwapOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import type { TenantRatesMeta } from "../types";

type Props = {
  meta?: TenantRatesMeta;
  orgCount?: number;
  orgsWithOverrides?: number;
  loading?: boolean;
  orgSelected?: boolean;
};

const TenantRatesStats: React.FC<Props> = ({
  meta,
  orgCount,
  orgsWithOverrides,
  loading,
  orgSelected,
}) => {
  if (!orgSelected) {
    return (
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <Card size="small" styles={{ body: { padding: 16 } }}>
            <Statistic
              loading={loading}
              title="Registered tenants"
              value={orgCount ?? meta?.orgCount ?? 0}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card size="small" styles={{ body: { padding: 16 } }}>
            <Statistic
              loading={loading}
              title="With custom tier rates"
              value={orgsWithOverrides ?? 0}
              prefix={<SwapOutlined />}
            />
          </Card>
        </Col>
      </Row>
    );
  }

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} lg={6}>
        <Card size="small" styles={{ body: { padding: 16 } }}>
          <Statistic loading={loading} title="Capacity tiers" value={meta?.tierCount ?? 0} />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card size="small" styles={{ body: { padding: 16 } }}>
          <Statistic
            loading={loading}
            title="Custom overrides"
            value={meta?.overrideCount ?? 0}
            prefix={<SwapOutlined style={{ color: "#1677ff" }} />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card size="small" styles={{ body: { padding: 16 } }}>
          <Statistic
            loading={loading}
            title="Using platform default"
            value={meta?.platformDefaultCount ?? 0}
            prefix={<BankOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card size="small" styles={{ body: { padding: 16 } }}>
          <Statistic
            loading={loading}
            title="Scheduled changes"
            value={meta?.scheduledCount ?? 0}
            prefix={<CheckCircleOutlined />}
          />
        </Card>
      </Col>
    </Row>
  );
};

export default TenantRatesStats;
