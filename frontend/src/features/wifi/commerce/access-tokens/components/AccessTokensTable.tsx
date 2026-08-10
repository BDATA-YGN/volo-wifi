"use client";

import React from "react";
import { Button, Empty, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { AccessTokenRecord } from "../types";
import { formatWifiDateTime, maskVoucherToken } from "@/features/wifi/shared/format";
import { VoucherCodeText } from "@/features/wifi/shared/components/VoucherCodeText";
import { STATUS_COLOR } from "../constant";
import { formatMoney, formatStatusLabel } from "../utils";
import { buildWifiTablePagination } from "@/features/wifi/shared/pagination";

const { Text } = Typography;

type Props = {
  data: AccessTokenRecord[];
  currency: string;
  loading?: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPaginationChange: (page: number, pageSize: number) => void;
  onView: (record: AccessTokenRecord) => void;
  onRevoke: (record: AccessTokenRecord) => void;
};

const AccessTokensTable: React.FC<Props> = ({
  data,
  currency,
  loading,
  page,
  pageSize,
  total,
  onPaginationChange,
  onView,
  onRevoke,
}) => {
  const columns: ColumnsType<AccessTokenRecord> = [
    {
      title: "Token",
      key: "token",
      render: (_, row) =>
        row.token ? (
          <VoucherCodeText
            value={maskVoucherToken(row.token)}
            copyable
            copyText={row.token}
            style={{ fontSize: 12, fontWeight: 600 }}
          />
        ) : (
          "—"
        ),
    },
    {
      title: "Plan",
      key: "plan",
      width: 180,
      ellipsis: true,
      render: (_, row) => (
        <div>
          <Tag>
            <VoucherCodeText value={row.plan.code} style={{ fontSize: 12 }} />
          </Tag>{" "}
          <Text style={{ fontSize: 12 }}>{row.plan.name}</Text>
        </div>
      ),
    },
    {
      title: "Site",
      key: "station",
      width: 150,
      ellipsis: true,
      render: (_, row) =>
        row.station ? (
          <Tag>
            <VoucherCodeText value={row.station.code} style={{ fontSize: 12 }} />
          </Tag>
        ) : (
          "—"
        ),
    },
    {
      title: "Partner",
      key: "reseller",
      width: 160,
      ellipsis: true,
      render: (_, row) =>
        row.reseller ? (
          <div>
            <Text style={{ fontSize: 12 }}>{row.reseller.name}</Text>
            <div>
              <Tag style={{ marginTop: 2 }}>
                <VoucherCodeText value={row.reseller.code} style={{ fontSize: 12 }} />
              </Tag>
            </div>
          </div>
        ) : (
          "—"
        ),
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 100,
      render: (status: AccessTokenRecord["status"]) => (
        <Tag color={STATUS_COLOR[status]}>{formatStatusLabel(status)}</Tag>
      ),
    },
    {
      title: "Sale",
      key: "sale",
      width: 110,
      align: "right",
      render: (_, row) =>
        row.sale ? formatMoney(row.sale.lineTotal, row.sale.order.currency || currency) : "—",
    },
    {
      title: "Sold",
      key: "soldAt",
      width: 150,
      render: (_, row) =>
        row.soldAt ? (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {formatWifiDateTime(row.soldAt)}
          </Text>
        ) : (
          "—"
        ),
    },
    {
      title: "First login",
      key: "firstLoginAt",
      width: 150,
      render: (_, row) =>
        row.firstLoginAt ? (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {formatWifiDateTime(row.firstLoginAt)}
          </Text>
        ) : (
          "—"
        ),
    },
    {
      title: "",
      key: "actions",
      width: 140,
      render: (_, row) => (
        <Space size="small" onClick={(e) => e.stopPropagation()}>
          <Button type="link" size="small" onClick={() => onView(row)}>
            View
          </Button>
          {row.actions?.canRevoke ? (
            <Button type="link" size="small" danger onClick={() => onRevoke(row)}>
              Revoke
            </Button>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <Table<AccessTokenRecord>
      rowKey="id"
      size="middle"
      loading={loading}
      columns={columns}
      dataSource={data}
      locale={{ emptyText: <Empty description="No access tokens issued yet" /> }}
      pagination={buildWifiTablePagination({
        page,
        pageSize,
        total,
        onChange: onPaginationChange,
        itemLabel: "token"
      })}
      onRow={(record) => ({
        onClick: () => onView(record),
        style: { cursor: "pointer" },
      })}
    />
  );
};

export default AccessTokensTable;
