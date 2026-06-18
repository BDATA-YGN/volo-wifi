"use client";

import React from "react";
import { Card, Col, Row, Statistic } from "antd";
import {
  BookOutlined,
  ShopOutlined,
  TagOutlined,
  UnorderedListOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import type { RetailPricingMeta } from "../types";

type Props = {
  meta?: RetailPricingMeta;
  loading?: boolean;
};

const RetailPricingStats: React.FC<Props> = ({ meta, loading }) => (
  <Row gutter={[16, 16]}>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Price books"
          value={meta?.total ?? 0}
          prefix={<BookOutlined />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Default book"
          value={meta?.defaultCount ?? 0}
          prefix={<HomeOutlined style={{ color: "#faad14" }} />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={4}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Reseller"
          value={meta?.resellerBooks ?? 0}
          prefix={<ShopOutlined style={{ color: "#1677ff" }} />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={4}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Site"
          value={meta?.siteBooks ?? 0}
          prefix={<UnorderedListOutlined style={{ color: "#722ed1" }} />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={4}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Active prices"
          value={meta?.activePrices ?? 0}
          prefix={<TagOutlined style={{ color: "#52c41a" }} />}
        />
      </Card>
    </Col>
  </Row>
);

export default RetailPricingStats;
