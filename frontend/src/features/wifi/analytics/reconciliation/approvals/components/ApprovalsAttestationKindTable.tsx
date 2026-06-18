"use client";

import React from "react";
import { Card, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { ApprovalAttestationKindRow } from "../types";
import { ATTESTATION_KIND_LABEL } from "../constant";

type Props = {
  rows: ApprovalAttestationKindRow[];
  loading?: boolean;
};

const ApprovalsAttestationKindTable: React.FC<Props> = ({ rows, loading }) => {
  const columns: ColumnsType<ApprovalAttestationKindRow> = [
    {
      title: "Kind",
      dataIndex: "kind",
      key: "kind",
      render: (kind: string) => (
        <Tag color={kind === "STATION" ? "cyan" : "blue"}>
          {ATTESTATION_KIND_LABEL[kind] ?? kind}
        </Tag>
      ),
    },
    {
      title: "Signed",
      dataIndex: "signedCount",
      key: "signedCount",
      width: 80,
      align: "right",
    },
    {
      title: "Pending",
      dataIndex: "pendingCount",
      key: "pendingCount",
      width: 80,
      align: "right",
      render: (count: number) => (count > 0 ? <Tag color="warning">{count}</Tag> : count),
    },
  ];

  return (
    <Card size="small" title="Attestation kinds" styles={{ body: { padding: 0 } }}>
      <Table<ApprovalAttestationKindRow>
        size="small"
        rowKey="kind"
        loading={loading}
        dataSource={rows}
        columns={columns}
        pagination={false}
      />
    </Card>
  );
};

export default ApprovalsAttestationKindTable;
