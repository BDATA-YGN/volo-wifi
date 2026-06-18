"use client";

import React, { useMemo } from "react";
import { Card, Empty, Tooltip } from "antd";
import { WifiMutedText } from "@/features/wifi/shared/components/WifiMutedText";
import type { RevenueTrendPoint, TrendGranularity } from "../types";
import { formatMoney, formatTrendLabel } from "../utils";


type Props = {
  points: RevenueTrendPoint[];
  currency: string;
  granularity: TrendGranularity;
  loading?: boolean;
};

const RevenueTrendChart: React.FC<Props> = ({ points, currency, granularity, loading }) => {
  const maxRevenue = useMemo(() => Math.max(...points.map((p) => p.revenue), 1), [points]);
  const maxNet = useMemo(() => Math.max(...points.map((p) => p.netRevenue), 1), [points]);
  const showEveryNth = points.length > 14 ? Math.ceil(points.length / 10) : 1;

  return (
    <Card
      size="small"
      title="Revenue trend"
      loading={loading}
      styles={{ body: { padding: 16 } }}
    >
      {points.length === 0 ? (
        <Empty description="No revenue in this period" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-3 rounded-sm" style={{ background: "#52c41a" }} />
              <WifiMutedText style={{ fontSize: 12 }}>
                Gross revenue
              </WifiMutedText>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-3 rounded-sm" style={{ background: "#1677ff" }} />
              <WifiMutedText style={{ fontSize: 12 }}>
                Net revenue
              </WifiMutedText>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-3 rounded-sm" style={{ background: "#722ed1" }} />
              <WifiMutedText style={{ fontSize: 12 }}>
                Commission
              </WifiMutedText>
            </div>
          </div>
          <div className="flex items-end gap-px overflow-x-auto pb-6" style={{ minHeight: 180 }}>
            {points.map((point, index) => {
              const revenueHeight = Math.max(4, (point.revenue / maxRevenue) * 130);
              const netHeight = Math.max(4, (point.netRevenue / maxNet) * 130);
              const commissionHeight = Math.max(
                4,
                (point.commission / maxRevenue) * 130
              );
              const label = formatTrendLabel(point.periodKey, granularity);

              return (
                <Tooltip
                  key={point.periodKey}
                  title={
                    <div style={{ fontSize: 12 }}>
                      <div>{label}</div>
                      <div>Gross: {formatMoney(point.revenue, currency)}</div>
                      <div>Net: {formatMoney(point.netRevenue, currency)}</div>
                      <div>Commission: {formatMoney(point.commission, currency)}</div>
                      <div>Orders: {point.ordersCount}</div>
                      <div>Tokens: {point.itemsCount}</div>
                    </div>
                  }
                >
                  <div
                    className="flex flex-col items-center justify-end"
                    style={{ minWidth: points.length > 20 ? 20 : 32, flex: 1 }}
                  >
                    <div className="flex items-end gap-0.5" style={{ height: 134 }}>
                      <div
                        style={{
                          width: points.length > 20 ? 5 : 8,
                          height: revenueHeight,
                          background: "#52c41a",
                          borderRadius: 2,
                          opacity: 0.9,
                        }}
                      />
                      <div
                        style={{
                          width: points.length > 20 ? 5 : 8,
                          height: netHeight,
                          background: "#1677ff",
                          borderRadius: 2,
                          opacity: 0.85,
                        }}
                      />
                      <div
                        style={{
                          width: points.length > 20 ? 5 : 8,
                          height: commissionHeight,
                          background: "#722ed1",
                          borderRadius: 2,
                          opacity: 0.8,
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
                        {label}
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

export default RevenueTrendChart;
