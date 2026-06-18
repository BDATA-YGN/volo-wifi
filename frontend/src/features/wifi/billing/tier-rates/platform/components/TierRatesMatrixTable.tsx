"use client";

import React from "react";
import { Button, Dropdown, Table, Tag, Tooltip, Typography, theme } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CalendarOutlined,
  EditOutlined,
  MoreOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import type { TierRateMatrixRow } from "../types";
import { TIER_CODE_COLORS } from "../constant";
import { formatDate, formatMoney } from "../utils";

const { Text } = Typography;

type Props = {
  data: TierRateMatrixRow[];
  loading?: boolean;
  onSetRate: (row: TierRateMatrixRow) => void;
  onEditScheduled: (row: TierRateMatrixRow) => void;
  onDeactivateCurrent: (row: TierRateMatrixRow) => void;
};

const TierRatesMatrixTable: React.FC<Props> = ({
  data,
  loading,
  onSetRate,
  onEditScheduled,
  onDeactivateCurrent,
}) => {
  const { token } = theme.useToken();

  const columns: ColumnsType<TierRateMatrixRow> = [
    {
      title: "Tier",
      key: "tier",
      render: (_, row) => (
        <div>
          <Tag color={TIER_CODE_COLORS[row.stationSize.code] ?? "default"} style={{ fontFamily: "monospace" }}>
            {row.stationSize.code}
          </Tag>
          <div>
            <Text strong>{row.stationSize.name}</Text>
          </div>
        </div>
      ),
    },
    {
      title: "Current monthly rate",
      key: "current",
      render: (_, row) =>
        row.currentRate ? (
          <div>
            <Text strong style={{ fontSize: 15 }}>
              {formatMoney(row.currentRate.unitPrice, row.currentRate.currency)}
            </Text>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                per site / month
              </Text>
            </div>
          </div>
        ) : (
          <Tag color="warning">Not configured</Tag>
        ),
    },
    {
      title: "Effective from",
      key: "effectiveFrom",
      width: 140,
      render: (_, row) => (
        <Text type="secondary">{formatDate(row.currentRate?.effectiveFrom)}</Text>
      ),
    },
    {
      title: "Scheduled",
      key: "scheduled",
      width: 160,
      render: (_, row) =>
        row.scheduledRate ? (
          <Tooltip title={`${formatMoney(row.scheduledRate.unitPrice, row.scheduledRate.currency)} from ${formatDate(row.scheduledRate.effectiveFrom)}`}>
            <Tag icon={<CalendarOutlined />} color="processing">
              {formatDate(row.scheduledRate.effectiveFrom)}
            </Tag>
          </Tooltip>
        ) : (
          <Text type="secondary">—</Text>
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
                label: row.currentRate ? "Schedule new rate" : "Set rate",
                onClick: () => onSetRate(row),
              },
              ...(row.scheduledRate
                ? [
                    {
                      key: "edit-scheduled",
                      icon: <EditOutlined />,
                      label: "Edit scheduled rate",
                      onClick: () => onEditScheduled(row),
                    },
                  ]
                : []),
              ...(row.currentRate
                ? [
                    { type: "divider" as const },
                    {
                      key: "deactivate",
                      label: "Deactivate current rate",
                      danger: true,
                      onClick: () => onDeactivateCurrent(row),
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
    <Table<TierRateMatrixRow>
      rowKey={(r) => r.stationSize.id}
      size="middle"
      loading={loading}
      columns={columns}
      dataSource={data}
      pagination={false}
      scroll={{ x: 720 }}
      style={{ borderRadius: token.borderRadiusLG }}
      locale={{
        emptyText: (
          <div style={{ padding: "32px 0" }}>
            <Text type="secondary">
              No active capacity tiers.{" "}
              <a href="/wifi/billing/capacity-tiers">Configure capacity tiers</a> first.
            </Text>
          </div>
        ),
      }}
    />
  );
};

export default TierRatesMatrixTable;
