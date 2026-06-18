"use client";

import React from "react";
import { Button, Card, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { EyeOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { PostingEventRow } from "../types";
import { formatMoney, truncateHash } from "../utils";

const { Text } = Typography;

type Props = {
  rows: PostingEventRow[];
  loading?: boolean;
  onViewSettlement: (settlementId: string) => void;
};

const PostingsTable: React.FC<Props> = ({ rows, loading, onViewSettlement }) => {
  const columns: ColumnsType<PostingEventRow> = [
    {
      title: "Posted",
      dataIndex: "postedAt",
      key: "postedAt",
      width: 150,
      render: (postedAt: string) => dayjs(postedAt).format("D MMM YYYY, HH:mm"),
    },
    {
      title: "Partner / Site",
      key: "context",
      render: (_, row) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {row.resellerCode} · {row.stationCode}
        </Text>
      ),
    },
    {
      title: "Amount",
      key: "systemTotal",
      width: 120,
      align: "right",
      render: (_, row) => formatMoney(row.systemTotal, row.systemCurrency),
    },
    {
      title: "Sealed",
      dataIndex: "sealed",
      key: "sealed",
      width: 80,
      render: (sealed: boolean) => (
        <Tag color={sealed ? "purple" : "default"}>{sealed ? "Sealed" : "Open"}</Tag>
      ),
    },
    {
      title: "Hash",
      dataIndex: "payloadHash",
      key: "payloadHash",
      render: (hash: string) => (
        <Text code style={{ fontSize: 11 }}>
          {truncateHash(hash, 16)}
        </Text>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 72,
      render: (_, row) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => onViewSettlement(row.settlementId)}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <Card size="small" title="Recent postings" styles={{ body: { padding: 0 } }}>
      <Table<PostingEventRow>
        size="small"
        rowKey="postingId"
        loading={loading}
        dataSource={rows.slice(0, 20)}
        columns={columns}
        pagination={false}
        locale={{ emptyText: "No sealed postings in this period" }}
      />
    </Card>
  );
};

export default PostingsTable;
