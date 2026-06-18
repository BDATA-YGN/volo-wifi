"use client";

import React, { useMemo } from "react";
import { Card, Empty, Tooltip } from "antd";
import { WifiMutedText } from "@/features/wifi/shared/components/WifiMutedText";
import dayjs from "dayjs";
import type { PlanDailyPoint } from "../types";
import { formatBytes, formatMoney } from "../utils";


type Props = {
  points: PlanDailyPoint[];
  currency: string;
  loading?: boolean;
  showActivePlans?: boolean;
};

const PlansTrendChart: React.FC<Props> = ({
  points,
  currency,
  loading,
  showActivePlans = true,
}) => {
  const maxRevenue = useMemo(() => Math.max(...points.map((p) => p.revenue), 1), [points]);
  const maxItems = useMemo(() => Math.max(...points.map((p) => p.itemsCount), 1), [points]);
  const maxActive = useMemo(() => Math.max(...points.map((p) => p.activePlans), 1), [points]);
  const showEveryNth = points.length > 14 ? Math.ceil(points.length / 10) : 1;

  return (
    <Card size="small" title="Daily trend" loading={loading} styles={{ body: { padding: 16 } }}>
      {points.length === 0 ? (
        <Empty description="No activity in this period" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-3 rounded-sm" style={{ background: "#1677ff" }} />
              <WifiMutedText style={{ fontSize: 12 }}>
                Revenue
              </WifiMutedText>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-3 rounded-sm" style={{ background: "#52c41a" }} />
              <WifiMutedText style={{ fontSize: 12 }}>
                Tokens sold
              </WifiMutedText>
            </div>
            {showActivePlans ? (
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2 w-3 rounded-sm"
                  style={{ background: "#722ed1" }}
                />
                <WifiMutedText style={{ fontSize: 12 }}>
                  Active plans
                </WifiMutedText>
              </div>
            ) : null}
          </div>
          <div className="flex items-end gap-px overflow-x-auto pb-6" style={{ minHeight: 160 }}>
            {points.map((point, index) => {
              const revenueHeight = Math.max(4, (point.revenue / maxRevenue) * 120);
              const itemsHeight = Math.max(4, (point.itemsCount / maxItems) * 120);
              const activeHeight = showActivePlans
                ? Math.max(4, (point.activePlans / maxActive) * 120)
                : 0;

              return (
                <Tooltip
                  key={point.date}
                  title={
                    <div style={{ fontSize: 12 }}>
                      <div>{dayjs(point.date).format("D MMM YYYY")}</div>
                      <div>Revenue: {formatMoney(point.revenue, currency)}</div>
                      <div>Orders: {point.ordersCount}</div>
                      <div>Tokens: {point.itemsCount}</div>
                      <div>Commission: {formatMoney(point.commission, currency)}</div>
                      <div>Sessions: {point.sessionsCount}</div>
                      <div>Data: {formatBytes(point.totalBytes)}</div>
                      {showActivePlans ? <div>Active plans: {point.activePlans}</div> : null}
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
                          width: points.length > 20 ? 5 : 8,
                          height: revenueHeight,
                          background: "#1677ff",
                          borderRadius: 2,
                          opacity: 0.9,
                        }}
                      />
                      <div
                        style={{
                          width: points.length > 20 ? 5 : 8,
                          height: itemsHeight,
                          background: "#52c41a",
                          borderRadius: 2,
                          opacity: 0.85,
                        }}
                      />
                      {showActivePlans ? (
                        <div
                          style={{
                            width: points.length > 20 ? 5 : 8,
                            height: activeHeight,
                            background: "#722ed1",
                            borderRadius: 2,
                            opacity: 0.8,
                          }}
                        />
                      ) : null}
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

export default PlansTrendChart;
