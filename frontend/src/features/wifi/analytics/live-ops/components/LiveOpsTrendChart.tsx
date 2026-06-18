"use client";

import React, { useMemo } from "react";
import { Card, Empty, Tooltip } from "antd";
import { WifiMutedText } from "@/features/wifi/shared/components/WifiMutedText";
import dayjs from "dayjs";
import type { LiveOpsHourlyPoint } from "../types";
import { formatBytes, formatMoney } from "../utils";


type Props = {
  points: LiveOpsHourlyPoint[];
  currency: string;
  loading?: boolean;
};

const LiveOpsTrendChart: React.FC<Props> = ({ points, currency, loading }) => {
  const maxSessions = useMemo(
    () => Math.max(...points.map((p) => p.sessionsStarted), 1),
    [points]
  );
  const maxOrders = useMemo(() => Math.max(...points.map((p) => p.ordersCount), 1), [points]);

  return (
    <Card size="small" title="Hourly activity" loading={loading} styles={{ body: { padding: 16 } }}>
      {points.length === 0 ? (
        <Empty description="No activity in this window" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-3 rounded-sm" style={{ background: "#1677ff" }} />
              <WifiMutedText style={{ fontSize: 12 }}>
                Sessions started
              </WifiMutedText>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-3 rounded-sm" style={{ background: "#722ed1" }} />
              <WifiMutedText style={{ fontSize: 12 }}>
                Orders
              </WifiMutedText>
            </div>
          </div>
          <div className="flex items-end gap-1 overflow-x-auto pb-6" style={{ minHeight: 140 }}>
            {points.map((point) => {
              const sessionHeight = Math.max(4, (point.sessionsStarted / maxSessions) * 100);
              const orderHeight = Math.max(4, (point.ordersCount / maxOrders) * 100);

              return (
                <Tooltip
                  key={point.hour}
                  title={
                    <div style={{ fontSize: 12 }}>
                      <div>{dayjs(point.hour).format("D MMM, HH:mm")}</div>
                      <div>Sessions: {point.sessionsStarted}</div>
                      <div>Orders: {point.ordersCount}</div>
                      <div>Revenue: {formatMoney(point.revenue, currency)}</div>
                      <div>Traffic: {formatBytes(point.totalBytes)}</div>
                    </div>
                  }
                >
                  <div
                    className="flex flex-col items-center justify-end"
                    style={{ minWidth: points.length > 20 ? 16 : 24, flex: 1 }}
                  >
                    <div className="flex items-end gap-0.5" style={{ height: 104 }}>
                      <div
                        style={{
                          width: points.length > 20 ? 5 : 8,
                          height: sessionHeight,
                          background: "#1677ff",
                          borderRadius: 2,
                        }}
                      />
                      <div
                        style={{
                          width: points.length > 20 ? 4 : 6,
                          height: orderHeight,
                          background: "#722ed1",
                          borderRadius: 2,
                        }}
                      />
                    </div>
                    <WifiMutedText style={{ fontSize: 9, marginTop: 6 }}>
                      {dayjs(point.hour).format("HH:mm")}
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

export default LiveOpsTrendChart;
