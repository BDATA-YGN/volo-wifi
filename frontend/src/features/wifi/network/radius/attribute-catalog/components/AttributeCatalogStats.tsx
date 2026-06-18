"use client";

import React from "react";
import { Card, Col, Row, Statistic } from "antd";
import { BookOutlined, LinkOutlined, NumberOutlined } from "@ant-design/icons";
import type { AttributeCatalogMeta } from "../types";

type Props = {
  meta?: AttributeCatalogMeta;
  loading?: boolean;
};

const AttributeCatalogStats: React.FC<Props> = ({ meta, loading }) => (
  <Row gutter={[16, 16]}>
    <Col xs={24} sm={8}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Catalog attributes"
          value={meta?.total ?? 0}
          prefix={<BookOutlined />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={8}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Integer attributes"
          value={meta?.valueTypeCounts?.INTEGER ?? 0}
          prefix={<NumberOutlined style={{ color: "#1677ff" }} />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={8}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Vendor profile links"
          value={meta?.vendorProfileLinks ?? 0}
          prefix={<LinkOutlined />}
        />
      </Card>
    </Col>
  </Row>
);

export default AttributeCatalogStats;
