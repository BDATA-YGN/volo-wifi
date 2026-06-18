"use client";

import React from "react";
import { Button, Dropdown, Table, Tag, Tooltip, Typography, theme } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CalendarOutlined,
  EditOutlined,
  MoreOutlined,
  PlusOutlined,
  RollbackOutlined,
} from "@ant-design/icons";
import type { TenantRateMatrixRow } from "../types";
import { TIER_CODE_COLORS } from "../constant";
import { formatDate, formatMoney } from "../../platform/utils";

const { Text } = Typography;

type Props = {
  data: TenantRateMatrixRow[];
  loading?: boolean;
  onSetOverride: (row: TenantRateMatrixRow) => void;
  onEditScheduled: (row: TenantRateMatrixRow) => void;
  onClearOverride: (row: TenantRateMatrixRow) => void;
};

const TenantRatesMatrixTable: React.FC<Props> = ({
  data,
  loading,
  onSetOverride,
  onEditScheduled,
  onClearOverride,
}) => {
  const { token } = theme.useToken();

  const columns: ColumnsType<TenantRateMatrixRow> = [
    {
      title: "Tier",
      key: "tier",
      width: 160,
      render: (_, row) => (
        <div>
          <Tag
            color={TIER_CODE_COLORS[row.stationSize.code] ?? "default"}
            style={{ fontFamily: "monospace" }}
          >
            {row.stationSize.code}
          </Tag>
          <div>
            <Text strong style={{ fontSize: 13 }}>
              {row.stationSize.name}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: "Platform rate",
      key: "platform",
      render: (_, row) =>
        row.platformRate ? (
          <Text type="secondary">{formatMoney(row.platformRate.unitPrice, row.platformRate.currency)}</Text>
        ) : (
          <Tag color="warning">Not set</Tag>
        ),
    },
    {
      title: "Tenant override",
      key: "override",
      render: (_, row) =>
        row.tenantOverride ? (
          <div>
            <Text strong>{formatMoney(row.tenantOverride.unitPrice, row.tenantOverride.currency)}</Text>
            {row.scheduledOverride ? (
              <div>
                <Tooltip title={formatDate(row.scheduledOverride.effectiveFrom)}>
                  <Tag icon={<CalendarOutlined />} color="processing" style={{ marginTop: 4 }}>
                    Scheduled
                  </Tag>
                </Tooltip>
              </div>
            ) : null}
          </div>
        ) : (
          <Tag icon={<RollbackOutlined />}>Platform default</Tag>
        ),
    },
    {
      title: "Effective rate",
      key: "effective",
      render: (_, row) =>
        row.effectiveRate ? (
          <div>
            <Text strong style={{ fontSize: 15, color: token.colorPrimary }}>
              {formatMoney(row.effectiveRate.unitPrice, row.effectiveRate.currency)}
            </Text>
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                per site / month
              </Text>
            </div>
          </div>
        ) : (
          <Tag color="error">No rate</Tag>
        ),
    },
    {
      title: "",
      key: "actions",
      width: 56,
      fixed: "right",
      render: (_, row) => (
        <Dropdown
          trigger={["click"]}
          menu={{
            items: [
              {
                key: "set",
                icon: <PlusOutlined />,
                label: row.tenantOverride ? "Schedule new override" : "Set override",
                onClick: () => onSetOverride(row),
              },
              ...(row.scheduledOverride
                ? [
                    {
                      key: "edit",
                      icon: <EditOutlined />,
                      label: "Edit scheduled override",
                      onClick: () => onEditScheduled(row),
                    },
                  ]
                : []),
              ...(row.tenantOverride
                ? [
                    { type: "divider" as const },
                    {
                      key: "clear",
                      icon: <RollbackOutlined />,
                      label: "Revert to platform default",
                      danger: true,
                      onClick: () => onClearOverride(row),
                    },
                  ]
                : []),
            ],
          }}
        >
          <Button type="text" size="small" icon={<MoreOutlined />} aria-label="Actions" />
        </Dropdown>
      ),
    },
  ];

  return (
    <Table<TenantRateMatrixRow>
      rowKey={(r) => r.stationSize.id}
      size="middle"
      loading={loading}
      columns={columns}
      dataSource={data}
      pagination={false}
      scroll={{ x: 880 }}
      style={{ borderRadius: token.borderRadiusLG }}
    />
  );
};

export default TenantRatesMatrixTable;
