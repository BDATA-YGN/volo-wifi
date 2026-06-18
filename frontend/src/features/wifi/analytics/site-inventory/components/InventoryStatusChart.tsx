"use client";

import React, { useMemo } from "react";
import { Card, Empty, Tooltip, Typography } from "antd";
import type { SiteInventoryStatusRow } from "../types";
import { formatStatusLabel } from "../utils";
import type { StationStatus } from "../types";

const { Text } = Typography;

const STATUS_BAR_COLOR: Record<string, string> = {
  ACTIVE: "#52c41a",
  MAINTENANCE: "#faad14",
  DISABLED: "#8c8c8c",
};

type Props = {
  rows: SiteInventoryStatusRow[];
  loading?: boolean;
};

const InventoryStatusChart: React.FC<Props> = ({ rows, loading }) => {
  const total = useMemo(() => rows.reduce((sum, r) => sum + r.count, 0), [rows]);
  const max = useMemo(() => Math.max(...rows.map((r) => r.count), 1), [rows]);

  return (
    <Card size="small" title="Site status distribution" loading={loading} styles={{ body: { padding: 16 } }}>
      {rows.length === 0 ? (
        <Empty description="No sites in scope" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((row) => {
            const width = Math.max(8, (row.count / max) * 100);
            const share = total > 0 ? Math.round((row.count / total) * 100) : 0;
            return (
              <Tooltip
                key={row.status}
                title={`${formatStatusLabel(row.status as StationStatus)}: ${row.count} (${share}%)`}
              >
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <Text style={{ fontSize: 13 }}>
                      {formatStatusLabel(row.status as StationStatus)}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {row.count} · {share}%
                    </Text>
                  </div>
                  <div
                    style={{
                      height: 10,
                      width: `${width}%`,
                      background: STATUS_BAR_COLOR[row.status] ?? "#1677ff",
                      borderRadius: 4,
                      minWidth: 8,
                    }}
                  />
                </div>
              </Tooltip>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default InventoryStatusChart;
