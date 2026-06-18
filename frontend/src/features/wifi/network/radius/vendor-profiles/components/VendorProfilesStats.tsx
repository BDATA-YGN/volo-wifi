"use client";

import React from "react";
import { Card, Col, Row, Statistic } from "antd";
import { ApiOutlined, ClusterOutlined, LinkOutlined } from "@ant-design/icons";
import type { VendorProfilesMeta } from "../types";

type Props = {
  meta?: VendorProfilesMeta;
  loading?: boolean;
};

const VendorProfilesStats: React.FC<Props> = ({ meta, loading }) => (
  <Row gutter={[16, 16]}>
    <Col xs={24} sm={8}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Vendor profiles"
          value={meta?.total ?? 0}
          prefix={<ClusterOutlined />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={8}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Attribute links"
          value={meta?.totalAttributeLinks ?? 0}
          prefix={<LinkOutlined style={{ color: "#1677ff" }} />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={8}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Vendors"
          value={Object.keys(meta?.vendorCounts ?? {}).length}
          prefix={<ApiOutlined />}
        />
      </Card>
    </Col>
  </Row>
);

export default VendorProfilesStats;
