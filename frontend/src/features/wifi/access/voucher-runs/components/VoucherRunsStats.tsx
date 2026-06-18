"use client";

import React from "react";
import { Card, Col, Row, Statistic } from "antd";
import {
  GiftOutlined,
  InboxOutlined,
  NumberOutlined,
  TagsOutlined,
} from "@ant-design/icons";
import type { VoucherRunsMeta } from "../types";

type Props = {
  meta?: VoucherRunsMeta;
  loading?: boolean;
};

const VoucherRunsStats: React.FC<Props> = ({ meta, loading }) => (
  <Row gutter={[16, 16]}>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Runs"
          value={meta?.runCount ?? 0}
          prefix={<NumberOutlined />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Vouchers issued"
          value={meta?.totalVouchers ?? 0}
          prefix={<TagsOutlined style={{ color: "#1677ff" }} />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Still available"
          value={meta?.remainingVouchers ?? 0}
          prefix={<InboxOutlined style={{ color: "#52c41a" }} />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Matching runs"
          value={meta?.total ?? 0}
          prefix={<GiftOutlined style={{ color: "#722ed1" }} />}
        />
      </Card>
    </Col>
  </Row>
);

export default VoucherRunsStats;
