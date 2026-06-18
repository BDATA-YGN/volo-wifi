"use client";

import React, { useMemo } from "react";
import { Card, Empty, Tooltip } from "antd";
import dayjs from "dayjs";
import { WifiMutedText } from "@/features/wifi/shared/components/WifiMutedText";
import type { InsightsDailyPoint } from "../types";
import { formatBytes, formatMoney } from "../utils";

type Props = {
  points: InsightsDailyPoint[];
  currency: string;
  loading?: boolean;
};

const InsightsTrendChart: React.FC<Props> = ({ points, currency, loading }) => {
  const maxRevenue = useMemo(
    () => Math.max(...points.map((p) => p.revenue), 1),
    [points]
  );
  const maxSessions = useMemo(
    () => Math.max(...points.map((p) => p.sessionsCount), 1),
    [points]
  );

  const showEveryNth = points.length > 14 ? Math.ceil(points.length / 10) : 1;

  return (
    <Card
      size="small"
      title="Daily trend"
      loading={loading}
      styles={{ body: { padding: 16 } }}
    >
      {points.length === 0 ? (
        <Empty description="No activity in this period" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-3 rounded-sm" style={{ background: "#1677ff" }} />
              <WifiMutedText style={{ fontSize: 12 }}>Revenue</WifiMutedText>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-3 rounded-sm" style={{ background: "#13c2c2" }} />
              <WifiMutedText style={{ fontSize: 12 }}>Sessions</WifiMutedText>
            </div>
          </div>
          <div
            className="flex items-end gap-px overflow-x-auto pb-6"
            style={{ minHeight: 160 }}
          >
            {points.map((point, index) => {
              const revenueHeight = Math.max(4, (point.revenue / maxRevenue) * 120);
              const sessionHeight = Math.max(4, (point.sessionsCount / maxSessions) * 120);
              const label = dayjs(point.date).format("D MMM");

              return (
                <Tooltip
                  key={point.date}
                  title={
                    <div style={{ fontSize: 12 }}>
                      <div>{label}</div>
                      <div>Revenue: {formatMoney(point.revenue, currency)}</div>
                      <div>Orders: {point.ordersCount}</div>
                      <div>Commission: {formatMoney(point.commission, currency)}</div>
                      <div>Sessions: {point.sessionsCount}</div>
                      <div>Data: {formatBytes(point.totalBytes)}</div>
                    </div>
                  }
                >
                  <div
                    className="flex flex-col items-center justify-end"
                    style={{ minWidth: points.length > 20 ? 18 : 28, flex: 1 }}
                  >
                    <div className="flex items-end gap-0.5" style={{ height: 124 }}>
                      <div
                        style={{
                          width: points.length > 20 ? 6 : 10,
                          height: revenueHeight,
                          background: "#1677ff",
                          borderRadius: 2,
                          opacity: 0.9,
                        }}
                      />
                      <div
                        style={{
                          width: points.length > 20 ? 6 : 10,
                          height: sessionHeight,
                          background: "#13c2c2",
                          borderRadius: 2,
                          opacity: 0.85,
                        }}
                      />
                    </div>
                    {index % showEveryNth === 0 ? (
                      <WifiMutedText
                        style={{
                          fontSize: 10,
                          marginTop: 6,
                          transform: "rotate(-45deg)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {dayjs(point.date).format("D/M")}
                      </WifiMutedText>
                    ) : (
                      <span style={{ height: 14 }} />
                    )}
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

export default InsightsTrendChart;
