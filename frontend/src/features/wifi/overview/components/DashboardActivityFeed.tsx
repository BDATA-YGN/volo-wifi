"use client";

import React from "react";
import { Card, Col, Row, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { OverviewPartnerSales, OverviewSessionHealth } from "../types";
import { formatMoney } from "../utils";

const { Text } = Typography;

type Props = {
  sessionHealth: OverviewSessionHealth[];
  partnerSales: OverviewPartnerSales[];
  currency: string;
  loading?: boolean;
};

const DashboardActivityFeed: React.FC<Props> = ({
  sessionHealth,
  partnerSales,
  currency,
  loading,
}) => {
  const healthColumns: ColumnsType<OverviewSessionHealth> = [
    {
      title: "Site",
      key: "name",
      render: (_, row) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>
            {row.name}
          </Text>
          <div>
            <Text code style={{ fontSize: 10 }}>
              {row.code}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: "Live",
      dataIndex: "liveSessions",
      key: "liveSessions",
      width: 72,
      align: "right",
      render: (n: number) => (n > 0 ? <Tag color="processing">{n}</Tag> : n),
    },
    {
      title: "Stalled",
      dataIndex: "stalledSessions",
      key: "stalledSessions",
      width: 80,
      align: "right",
      render: (n: number) => (n > 0 ? <Tag color="warning">{n}</Tag> : n),
    },
    {
      title: "Today",
      dataIndex: "todaySessions",
      key: "todaySessions",
      width: 72,
      align: "right",
    },
  ];

  const partnerColumns: ColumnsType<OverviewPartnerSales> = [
    {
      title: "Partner",
      key: "name",
      render: (_, row) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>
            {row.name}
          </Text>
          <div>
            <Text code style={{ fontSize: 10 }}>
              {row.code}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: "Orders",
      dataIndex: "orders",
      key: "orders",
      width: 80,
      align: "right",
    },
    {
      title: "Revenue",
      key: "revenue",
      width: 120,
      align: "right",
      render: (_, row) => formatMoney(row.revenue, currency),
    },
  ];

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={12}>
        <Card size="small" title="Session health by site" styles={{ body: { padding: 0 } }}>
          <Table<OverviewSessionHealth>
            size="small"
            rowKey="stationId"
            loading={loading}
            dataSource={sessionHealth}
            columns={healthColumns}
            pagination={false}
            locale={{ emptyText: "No session activity" }}
          />
        </Card>
      </Col>
      <Col xs={24} lg={12}>
        <Card size="small" title="Partner sales (today)" styles={{ body: { padding: 0 } }}>
          <Table<OverviewPartnerSales>
            size="small"
            rowKey="resellerId"
            loading={loading}
            dataSource={partnerSales}
            columns={partnerColumns}
            pagination={false}
            locale={{ emptyText: "No partner sales today" }}
          />
        </Card>
      </Col>
    </Row>
  );
};

export default DashboardActivityFeed;
