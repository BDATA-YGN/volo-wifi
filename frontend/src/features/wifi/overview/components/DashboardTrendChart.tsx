"use client";

import React, { useMemo } from "react";
import { Card, Empty, Tooltip } from "antd";
import { WifiMutedText } from "@/features/wifi/shared/components/WifiMutedText";
import dayjs from "dayjs";
import type { OverviewTrendPoint } from "../types";
import { formatBytes, formatMoney } from "../utils";


type Props = {
  points: OverviewTrendPoint[];
  currency: string;
  loading?: boolean;
};

const DashboardTrendChart: React.FC<Props> = ({ points, currency, loading }) => {
  const maxSessions = useMemo(
    () => Math.max(...points.map((p) => p.sessions), 1),
    [points]
  );
  const maxRevenue = useMemo(() => Math.max(...points.map((p) => p.revenue), 1), [points]);

  return (
    <Card size="small" title="7-day activity" loading={loading} styles={{ body: { padding: 16 } }}>
      {points.length === 0 ? (
        <Empty description="No trend data yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-3 rounded-sm" style={{ background: "#1677ff" }} />
              <WifiMutedText style={{ fontSize: 12 }}>
                Sessions
              </WifiMutedText>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-3 rounded-sm" style={{ background: "#52c41a" }} />
              <WifiMutedText style={{ fontSize: 12 }}>
                Revenue
              </WifiMutedText>
            </div>
          </div>
          <div className="flex items-end gap-2 overflow-x-auto pb-2" style={{ minHeight: 120 }}>
            {points.map((point) => {
              const sessionHeight = Math.max(6, (point.sessions / maxSessions) * 90);
              const revenueHeight = Math.max(6, (point.revenue / maxRevenue) * 90);
              return (
                <Tooltip
                  key={point.date}
                  title={
                    <div style={{ fontSize: 12 }}>
                      <div>{dayjs(point.date).format("D MMM YYYY")}</div>
                      <div>Sessions: {point.sessions}</div>
                      <div>Orders: {point.orders}</div>
                      <div>Revenue: {formatMoney(point.revenue, currency)}</div>
                      <div>Traffic: {formatBytes(point.totalBytes)}</div>
                    </div>
                  }
                >
                  <div className="flex flex-col items-center" style={{ minWidth: 36, flex: 1 }}>
                    <div className="flex items-end gap-0.5" style={{ height: 96 }}>
                      <div
                        style={{
                          width: 8,
                          height: sessionHeight,
                          background: "#1677ff",
                          borderRadius: 2,
                        }}
                      />
                      <div
                        style={{
                          width: 6,
                          height: revenueHeight,
                          background: "#52c41a",
                          borderRadius: 2,
                        }}
                      />
                    </div>
                    <WifiMutedText style={{ fontSize: 10, marginTop: 6 }}>
                      {dayjs(point.date).format("D/M")}
                    </WifiMutedText>
                  </div>
                </Tooltip>
              );
            })}
          </div>
        </>
      )}
    </Card>
  );
};

export default DashboardTrendChart;
