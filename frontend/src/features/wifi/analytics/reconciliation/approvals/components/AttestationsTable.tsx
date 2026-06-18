"use client";

import React from "react";
import { Button, Card, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { EyeOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { AttestationEventRow } from "../types";
import { formatAttestationKind } from "../utils";

const { Text } = Typography;

type Props = {
  rows: AttestationEventRow[];
  loading?: boolean;
  onViewSettlement: (settlementId: string) => void;
};

const AttestationsTable: React.FC<Props> = ({ rows, loading, onViewSettlement }) => {
  const columns: ColumnsType<AttestationEventRow> = [
    {
      title: "Kind",
      dataIndex: "kind",
      key: "kind",
      width: 150,
      render: (kind: string) => (
        <Tag color={kind === "STATION" ? "cyan" : "blue"}>{formatAttestationKind(kind)}</Tag>
      ),
    },
    {
      title: "Signed",
      dataIndex: "signedAt",
      key: "signedAt",
      width: 140,
      render: (signedAt: string | null) =>
        signedAt ? (
          dayjs(signedAt).format("D MMM YYYY, HH:mm")
        ) : (
          <Tag color="warning">Pending</Tag>
        ),
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
      title: "Role",
      dataIndex: "roleName",
      key: "roleName",
      width: 120,
      render: (role: string | null) => role ?? "—",
    },
    {
      title: "Note",
      dataIndex: "note",
      key: "note",
      ellipsis: true,
      render: (note: string | null) => note ?? "—",
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
    <Card size="small" title="Recent attestations" styles={{ body: { padding: 0 } }}>
      <Table<AttestationEventRow>
        size="small"
        rowKey="attestationId"
        loading={loading}
        dataSource={rows.slice(0, 20)}
        columns={columns}
        pagination={false}
        locale={{ emptyText: "No attestation events in this period" }}
      />
    </Card>
  );
};

export default AttestationsTable;
