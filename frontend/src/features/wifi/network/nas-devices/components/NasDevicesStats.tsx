"use client";

import React from "react";
import { Card, Col, Row, Statistic } from "antd";
import {
  ApiOutlined,
  CloudServerOutlined,
  DisconnectOutlined,
  HddOutlined,
} from "@ant-design/icons";
import type { NasDevicesMeta } from "../types";

type Props = {
  meta?: NasDevicesMeta;
  loading?: boolean;
};

const NasDevicesStats: React.FC<Props> = ({ meta, loading }) => (
  <Row gutter={[16, 16]}>
    <Col xs={24} sm={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Total devices"
          value={meta?.total ?? 0}
          prefix={<HddOutlined />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="RADIUS clients"
          value={meta?.radiusClientCount ?? 0}
          prefix={<ApiOutlined style={{ color: "#1677ff" }} />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Routers"
          value={meta?.typeCounts?.ROUTER ?? 0}
          prefix={<CloudServerOutlined />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Unassigned"
          value={meta?.unassignedCount ?? 0}
          prefix={<DisconnectOutlined />}
        />
      </Card>
    </Col>
  </Row>
);

export default NasDevicesStats;
