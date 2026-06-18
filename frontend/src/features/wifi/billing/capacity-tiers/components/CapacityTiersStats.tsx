"use client";

import React from "react";
import { Card, Col, Row, Statistic, theme } from "antd";
import { AppstoreOutlined, CheckCircleOutlined, WifiOutlined } from "@ant-design/icons";
import type { CapacityTierRecord, CapacityTiersMeta } from "../types";

type Props = {
  list: CapacityTierRecord[];
  meta?: CapacityTiersMeta;
  loading?: boolean;
};

const CapacityTiersStats: React.FC<Props> = ({ list, meta, loading }) => {
  const { token } = theme.useToken();
  const activeCount = meta?.activeCount ?? list.filter((t) => t.isActive).length;
  const total = meta?.total ?? list.length;
  const stationCount =
    meta?.stationCount ?? list.reduce((sum, t) => sum + (t._count?.stations ?? 0), 0);
  const withRates = list.filter((t) => (t._count?.globalLicensePrices ?? 0) > 0).length;

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} lg={6}>
        <Card size="small" styles={{ body: { padding: 16 } }} style={{ borderRadius: token.borderRadiusLG }}>
          <Statistic
            loading={loading}
            title="Capacity tiers"
            value={total}
            prefix={<AppstoreOutlined style={{ color: token.colorPrimary }} />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card size="small" styles={{ body: { padding: 16 } }} style={{ borderRadius: token.borderRadiusLG }}>
          <Statistic
            loading={loading}
            title="Active tiers"
            value={activeCount}
            prefix={<CheckCircleOutlined style={{ color: token.colorSuccess }} />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card size="small" styles={{ body: { padding: 16 } }} style={{ borderRadius: token.borderRadiusLG }}>
          <Statistic
            loading={loading}
            title="Licensed sites"
            value={stationCount}
            prefix={<WifiOutlined style={{ color: token.colorInfo }} />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card size="small" styles={{ body: { padding: 16 } }} style={{ borderRadius: token.borderRadiusLG }}>
          <Statistic
            loading={loading}
            title="Tiers with platform rates"
            value={withRates}
            suffix={total > 0 ? `/ ${total}` : undefined}
          />
        </Card>
      </Col>
    </Row>
  );
};

export default CapacityTiersStats;
