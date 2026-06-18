"use client";

import React, { useMemo } from "react";
import { Card, Empty, Tooltip } from "antd";
import { WifiMutedText } from "@/features/wifi/shared/components/WifiMutedText";
import dayjs from "dayjs";
import type { VoucherRunDailyPoint } from "../types";


type Props = {
  points: VoucherRunDailyPoint[];
  loading?: boolean;
};

const RunsTrendChart: React.FC<Props> = ({ points, loading }) => {
  const maxIssued = useMemo(
    () => Math.max(...points.map((p) => p.vouchersIssued), 1),
    [points]
  );
  const maxActivated = useMemo(
    () => Math.max(...points.map((p) => p.vouchersActivated), 1),
    [points]
  );
  const showEveryNth = points.length > 14 ? Math.ceil(points.length / 10) : 1;

  return (
    <Card size="small" title="Issuance & activation trend" loading={loading} styles={{ body: { padding: 16 } }}>
      {points.length === 0 ? (
        <Empty description="No voucher runs in this period" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-3 rounded-sm" style={{ background: "#722ed1" }} />
              <WifiMutedText style={{ fontSize: 12 }}>
                Issued
              </WifiMutedText>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-3 rounded-sm" style={{ background: "#13c2c2" }} />
              <WifiMutedText style={{ fontSize: 12 }}>
                Activated
              </WifiMutedText>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-3 rounded-sm" style={{ background: "#1677ff" }} />
              <WifiMutedText style={{ fontSize: 12 }}>
                Runs
              </WifiMutedText>
            </div>
          </div>
          <div className="flex items-end gap-px overflow-x-auto pb-6" style={{ minHeight: 160 }}>
            {points.map((point, index) => {
              const issuedHeight = Math.max(4, (point.vouchersIssued / maxIssued) * 120);
              const activatedHeight = Math.max(
                4,
                (point.vouchersActivated / maxActivated) * 120
              );
              const batchHeight = Math.max(4, point.batchesCreated > 0 ? 24 : 4);
              const label = dayjs(point.date).format("D MMM");

              return (
                <Tooltip
                  key={point.date}
                  title={
                    <div style={{ fontSize: 12 }}>
                      <div>{label}</div>
                      <div>Runs: {point.batchesCreated}</div>
                      <div>Issued: {point.vouchersIssued}</div>
                      <div>Activated: {point.vouchersActivated}</div>
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
                          height: issuedHeight,
                          background: "#722ed1",
                          borderRadius: 2,
                          opacity: 0.9,
                        }}
                      />
                      <div
                        style={{
                          width: points.length > 20 ? 5 : 8,
                          height: activatedHeight,
                          background: "#13c2c2",
                          borderRadius: 2,
                          opacity: 0.85,
                        }}
                      />
                      <div
                        style={{
                          width: points.length > 20 ? 4 : 6,
                          height: batchHeight,
                          background: "#1677ff",
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

export default RunsTrendChart;
