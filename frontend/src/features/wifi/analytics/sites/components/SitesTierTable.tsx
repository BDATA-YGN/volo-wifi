"use client";

import React, { useMemo, useState } from "react";
import { Card, Table, Tag, Typography } from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import type { SiteTierRow } from "../types";
import { formatBytes, formatMoney } from "../utils";

const { Text } = Typography;

type Props = {
  rows: SiteTierRow[];
  currency: string;
  loading?: boolean;
  onSelectTier?: (stationSizeId: string) => void;
  selectedTierId?: string | null;
};

const SitesTierTable: React.FC<Props> = ({
  rows,
  currency,
  loading,
  onSelectTier,
  selectedTierId,
}) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  React.useEffect(() => {
    setPage(1);
  }, [rows]);

  const columns: ColumnsType<SiteTierRow> = useMemo(
    () => [
      {
        title: "Capacity tier",
        key: "tier",
        render: (_, row) => (
          <div>
            <Text strong>{row.name}</Text>
            <div>
              <Tag style={{ fontFamily: "monospace", marginTop: 4 }}>{row.code}</Tag>
            </div>
          </div>
        ),
      },
      {
        title: "Sites",
        key: "sites",
        width: 100,
        align: "right",
        render: (_, row) => (
          <span>
            {row.activeSiteCount}
            <Text type="secondary"> / {row.siteCount}</Text>
          </span>
        ),
        sorter: (a, b) => a.siteCount - b.siteCount,
      },
      {
        title: "Orders",
        dataIndex: "ordersCount",
        key: "ordersCount",
        width: 90,
        align: "right",
        sorter: (a, b) => a.ordersCount - b.ordersCount,
      },
      {
        title: "Revenue",
        key: "revenue",
        width: 120,
        align: "right",
        render: (_, row) => <Text strong>{formatMoney(row.revenue, currency)}</Text>,
        sorter: (a, b) => a.revenue - b.revenue,
        defaultSortOrder: "descend",
      },
      {
        title: "Sessions",
        dataIndex: "sessionsCount",
        key: "sessionsCount",
        width: 90,
        align: "right",
        sorter: (a, b) => a.sessionsCount - b.sessionsCount,
      },
      {
        title: "Data",
        key: "totalBytes",
        width: 90,
        align: "right",
        render: (_, row) => formatBytes(row.totalBytes),
        sorter: (a, b) => a.totalBytes - b.totalBytes,
      },
    ],
    [currency]
  );

  const pagination: TablePaginationConfig = {
    current: page,
    pageSize,
    total: rows.length,
    showSizeChanger: rows.length > 10,
    pageSizeOptions: [10, 20, 50],
    showTotal: (count, range) =>
      count === 0 ? "0 tiers" : `${range[0]}-${range[1]} of ${count} tiers`,
    onChange: (nextPage, nextSize) => {
      setPage(nextPage);
      setPageSize(nextSize);
    },
  };

  return (
    <Card size="small" title="Performance by tier" styles={{ body: { padding: 0 } }}>
      <Table<SiteTierRow>
        rowKey="stationSizeId"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={pagination}
        scroll={{ x: 560 }}
        onRow={(row) => ({
          onClick: onSelectTier ? () => onSelectTier(row.stationSizeId) : undefined,
          style: {
            cursor: onSelectTier ? "pointer" : undefined,
            background:
              selectedTierId === row.stationSizeId ? "rgba(22, 119, 255, 0.06)" : undefined,
          },
        })}
      />
    </Card>
  );
};

export default SitesTierTable;
