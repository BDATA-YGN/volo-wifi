"use client";

import React, { useMemo } from "react";
import { Card, Table, Tag, Typography } from "antd";
import { WifiMutedText } from "@/features/wifi/shared/components/WifiMutedText";
import type { ColumnsType } from "antd/es/table";
import type { CredentialPeriodCounts, CredentialSiteRow } from "../types";
import { formatCount } from "../utils";

const { Text } = Typography;

type Props = {
  rows: CredentialSiteRow[];
  loading?: boolean;
  onSelectSite: (site: CredentialSiteRow) => void;
};

const STATUS_COLUMNS: {
  key: keyof CredentialPeriodCounts;
  title: string;
  color?: string;
}[] = [
  { key: "sold", title: "Sold", color: "blue" },
  { key: "activated", title: "Activated", color: "success" },
  { key: "expired", title: "Expired" },
  { key: "revoked", title: "Revoked", color: "error" },
  { key: "consumed", title: "Consumed" },
  { key: "archived", title: "Archived", color: "purple" },
];

function countCell(value: number, color?: string) {
  if (value <= 0) return <Text type="secondary">0</Text>;
  if (!color) return formatCount(value);
  return <Tag color={color}>{formatCount(value)}</Tag>;
}

const TokensSiteTable: React.FC<Props> = ({ rows, loading, onSelectSite }) => {
  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          sold: acc.sold + row.sold,
          activated: acc.activated + row.activated,
          expired: acc.expired + row.expired,
          revoked: acc.revoked + row.revoked,
          consumed: acc.consumed + row.consumed,
          archived: acc.archived + row.archived,
        }),
        {
          sold: 0,
          activated: 0,
          expired: 0,
          revoked: 0,
          consumed: 0,
          archived: 0,
        },
      ),
    [rows],
  );

  const columns: ColumnsType<CredentialSiteRow> = [
    {
      title: "Site",
      key: "name",
      fixed: "left",
      width: 240,
      sorter: (a, b) => a.name.localeCompare(b.name),
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
    ...STATUS_COLUMNS.map((col) => ({
      title: col.title,
      dataIndex: col.key,
      key: col.key,
      width: 110,
      align: "right" as const,
      sorter: (a: CredentialSiteRow, b: CredentialSiteRow) => a[col.key] - b[col.key],
      defaultSortOrder: col.key === "sold" ? ("descend" as const) : undefined,
      render: (n: number) => countCell(n, col.color),
    })),
  ];

  return (
    <Card
      size="small"
      title="By site"
      extra={
        <WifiMutedText style={{ fontSize: 12 }}>
          {formatCount(rows.length)} sites · click a site for plan status
        </WifiMutedText>
      }
      styles={{ body: { padding: 0 } }}
    >
      <Table<CredentialSiteRow>
        size="small"
        rowKey={(row) => row.stationId ?? "unassigned"}
        loading={loading}
        dataSource={rows}
        columns={columns}
        pagination={false}
        sticky
        scroll={{ x: 960 }}
        onRow={(row) => ({
          onClick: () => onSelectSite(row),
          style: { cursor: "pointer" },
        })}
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}>
                <Text strong>Total</Text>
              </Table.Summary.Cell>
              {STATUS_COLUMNS.map((col, index) => (
                <Table.Summary.Cell key={col.key} index={index + 1} align="right">
                  <Text strong>{formatCount(totals[col.key])}</Text>
                </Table.Summary.Cell>
              ))}
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />
    </Card>
  );
};

export default TokensSiteTable;
export { STATUS_COLUMNS, countCell };
