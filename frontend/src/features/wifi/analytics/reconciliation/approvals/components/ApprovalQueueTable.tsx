"use client";

import React from "react";
import { Button, Card, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { EyeOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { ApprovalQueueRow } from "../types";
import { NEXT_ACTION_COLOR, STATUS_COLOR } from "../constant";
import { formatMoney, formatStatusLabel, formatVariance } from "../utils";
import type { WorkflowStatus } from "../types";

const { Text } = Typography;

type Props = {
  rows: ApprovalQueueRow[];
  currency: string;
  loading?: boolean;
  onView: (row: ApprovalQueueRow) => void;
};

const ApprovalQueueTable: React.FC<Props> = ({ rows, currency, loading, onView }) => {
  const columns: ColumnsType<ApprovalQueueRow> = [
    {
      title: "Next action",
      dataIndex: "nextAction",
      key: "nextAction",
      width: 200,
      render: (action: string) => (
        <Tag color={NEXT_ACTION_COLOR[action] ?? "default"}>{action}</Tag>
      ),
    },
    {
      title: "Partner / Site",
      key: "context",
      render: (_, row) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>
            {row.resellerName}
          </Text>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {row.stationName}{" "}
              <Text code style={{ fontSize: 10 }}>
                {row.stationCode}
              </Text>
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: "Period",
      key: "period",
      width: 160,
      render: (_, row) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {dayjs(row.periodStart).format("D MMM")} – {dayjs(row.periodEnd).format("D MMM YYYY")}
        </Text>
      ),
    },
    {
      title: "System total",
      key: "systemTotal",
      width: 120,
      align: "right",
      render: (_, row) => formatMoney(row.systemTotal, row.systemCurrency || currency),
    },
    {
      title: "Variance",
      key: "variance",
      width: 100,
      align: "right",
      render: (_, row) => (
        <Text
          type={
            row.variance != null && Math.abs(row.variance) > 0.009 ? "warning" : "secondary"
          }
        >
          {formatVariance(row.variance, row.systemCurrency || currency)}
        </Text>
      ),
    },
    {
      title: "Checks",
      key: "checks",
      width: 140,
      render: (_, row) => (
        <Space size={4} wrap>
          <Tag color={row.stationAttested ? "success" : "default"} style={{ margin: 0 }}>
            Station
          </Tag>
          <Tag color={row.orgAttested ? "success" : "default"} style={{ margin: 0 }}>
            Org
          </Tag>
          {row.hasPosting ? (
            <Tag color="purple" style={{ margin: 0 }}>
              Posted
            </Tag>
          ) : null}
        </Space>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (status: string) => (
        <Tag color={STATUS_COLOR[status as WorkflowStatus] ?? "default"}>
          {formatStatusLabel(status)}
        </Tag>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 72,
      fixed: "right",
      render: (_, row) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => onView(row)}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <Card
      size="small"
      title="Approval queue"
      extra={
        <Text type="secondary" style={{ fontSize: 12 }}>
          Settlements awaiting station attestation, org approval, or posting
        </Text>
      }
      styles={{ body: { padding: 0 } }}
    >
      <Table<ApprovalQueueRow>
        size="small"
        rowKey="settlementId"
        loading={loading}
        dataSource={rows}
        columns={columns}
        scroll={{ x: 960 }}
        pagination={{ pageSize: 10, showSizeChanger: false, hideOnSinglePage: true }}
        locale={{ emptyText: "No settlements pending approval in this period" }}
      />
    </Card>
  );
};

export default ApprovalQueueTable;
