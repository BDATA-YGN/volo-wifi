"use client";

import React from "react";
import { Card, Col, Row, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { OverviewRecentOrder, OverviewRecentSession } from "../types";
import { formatWifiTime } from "@/features/wifi/shared/format";
import { formatBytes, formatMoney, formatSessionStatus } from "../utils";

const { Text } = Typography;

type Props = {
  sessions: OverviewRecentSession[];
  orders: OverviewRecentOrder[];
  currency: string;
  loading?: boolean;
};

const DashboardActivityFeed: React.FC<Props> = ({
  sessions,
  orders,
  currency,
  loading,
}) => {
  const sessionColumns: ColumnsType<OverviewRecentSession> = [
    {
      title: "User",
      dataIndex: "userName",
      key: "userName",
      ellipsis: true,
      render: (v: string | null) => v ?? "—",
    },
    {
      title: "Site",
      dataIndex: "stationCode",
      key: "stationCode",
      width: 80,
      render: (v: string | null) => v ?? "—",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 90,
      render: (status: string, row) => (
        <Tag color={row.isStalled ? "warning" : undefined}>
          {row.isStalled ? "Stalled" : formatSessionStatus(status)}
        </Tag>
      ),
    },
    {
      title: "Started",
      dataIndex: "startedAt",
      key: "startedAt",
      width: 80,
      render: (v: string) => formatWifiTime(v),
    },
    {
      title: "Traffic",
      key: "totalBytes",
      width: 80,
      align: "right",
      render: (_, row) => formatBytes(row.totalBytes),
    },
  ];

  const orderColumns: ColumnsType<OverviewRecentOrder> = [
    {
      title: "Order",
      dataIndex: "orderNo",
      key: "orderNo",
      render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text>,
    },
    {
      title: "Context",
      key: "context",
      render: (_, row) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {row.resellerCode ?? "—"} · {row.stationCode ?? "—"}
        </Text>
      ),
    },
    {
      title: "Total",
      key: "total",
      width: 100,
      align: "right",
      render: (_, row) => formatMoney(row.total, row.currency || currency),
    },
    {
      title: "Time",
      key: "soldAt",
      width: 70,
      render: (_, row) =>
        row.soldAt ? formatWifiTime(row.soldAt) : "—",
    },
  ];

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={12}>
        <Card size="small" title="Recent sessions (24h)" styles={{ body: { padding: 0 } }}>
          <Table<OverviewRecentSession>
            size="small"
            rowKey="sessionId"
            loading={loading}
            dataSource={sessions}
            columns={sessionColumns}
            pagination={false}
          />
        </Card>
      </Col>
      <Col xs={24} lg={12}>
        <Card size="small" title="Recent orders (24h)" styles={{ body: { padding: 0 } }}>
          <Table<OverviewRecentOrder>
            size="small"
            rowKey="orderId"
            loading={loading}
            dataSource={orders}
            columns={orderColumns}
            pagination={false}
          />
        </Card>
      </Col>
    </Row>
  );
};

export default DashboardActivityFeed;
