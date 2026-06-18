"use client";

import React from "react";
import { Card, Col, Row, Statistic } from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import type { InvoicesMeta } from "../types";
import { formatMoney } from "../../tier-rates/platform/utils";

type Props = {
  meta?: InvoicesMeta;
  loading?: boolean;
  currency?: string;
};

const InvoicesStats: React.FC<Props> = ({ meta, loading, currency = "MMK" }) => (
  <Row gutter={[16, 16]}>
    <Col xs={24} sm={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Total invoices"
          value={meta?.total ?? 0}
          prefix={<FileTextOutlined />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Outstanding"
          value={
            meta?.outstandingTotal
              ? formatMoney(meta.outstandingTotal, currency)
              : formatMoney(0, currency)
          }
          prefix={<ClockCircleOutlined style={{ color: "#1677ff" }} />}
          styles={{ content: { fontSize: 18 } }}
        />
      </Card>
    </Col>
    <Col xs={24} sm={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Paid"
          value={meta?.statusCounts?.PAID ?? 0}
          prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Overdue"
          value={meta?.statusCounts?.OVERDUE ?? 0}
          prefix={
            <WarningOutlined
              style={{ color: (meta?.statusCounts?.OVERDUE ?? 0) > 0 ? "#ff4d4f" : undefined }}
            />
          }
        />
      </Card>
    </Col>
  </Row>
);

export default InvoicesStats;
