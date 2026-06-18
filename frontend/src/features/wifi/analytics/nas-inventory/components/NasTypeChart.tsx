"use client";

import React, { useMemo } from "react";
import { Card, Empty, Tooltip, Typography } from "antd";
import type { NasInventoryTypeRow } from "../types";
import { formatDeviceType } from "../utils";
import type { DeviceType } from "../types";

const { Text } = Typography;

const TYPE_BAR_COLOR: Record<string, string> = {
  ROUTER: "#1677ff",
  AP: "#13c2c2",
  CONTROLLER: "#722ed1",
  SWITCH: "#2f54eb",
};

type Props = {
  rows: NasInventoryTypeRow[];
  loading?: boolean;
};

const NasTypeChart: React.FC<Props> = ({ rows, loading }) => {
  const total = useMemo(() => rows.reduce((sum, r) => sum + r.count, 0), [rows]);
  const max = useMemo(() => Math.max(...rows.map((r) => r.count), 1), [rows]);

  return (
    <Card size="small" title="Device type mix" loading={loading} styles={{ body: { padding: 16 } }}>
      {rows.length === 0 ? (
        <Empty description="No devices in scope" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((row) => {
            const width = Math.max(8, (row.count / max) * 100);
            const share = total > 0 ? Math.round((row.count / total) * 100) : 0;
            return (
              <Tooltip
                key={row.type}
                title={`${formatDeviceType(row.type)}: ${row.count} (${share}%) · ${row.radiusClientCount} RADIUS`}
              >
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <Text style={{ fontSize: 13 }}>{formatDeviceType(row.type as DeviceType)}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {row.count} · {share}%
                    </Text>
                  </div>
                  <div
                    style={{
                      height: 10,
                      width: `${width}%`,
                      background: TYPE_BAR_COLOR[row.type] ?? "#8c8c8c",
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

export default NasTypeChart;
