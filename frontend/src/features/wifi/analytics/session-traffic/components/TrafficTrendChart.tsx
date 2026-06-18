"use client";

import React, { useMemo } from "react";
import { Card, Empty, Tooltip } from "antd";
import { WifiMutedText } from "@/features/wifi/shared/components/WifiMutedText";
import dayjs from "dayjs";
import type { SessionTrafficDailyPoint } from "../types";
import { formatBytes } from "../utils";


type Props = {
  points: SessionTrafficDailyPoint[];
  loading?: boolean;
};

const TrafficTrendChart: React.FC<Props> = ({ points, loading }) => {
  const maxSessions = useMemo(
    () => Math.max(...points.map((p) => p.sessionsCount), 1),
    [points]
  );
  const maxBytes = useMemo(() => Math.max(...points.map((p) => p.totalBytes), 1), [points]);
  const showEveryNth = points.length > 14 ? Math.ceil(points.length / 10) : 1;

  return (
    <Card size="small" title="Session & bandwidth trend" loading={loading} styles={{ body: { padding: 16 } }}>
      {points.length === 0 ? (
        <Empty description="No sessions in this period" image={Empty.PRESENTED_IMAGE_SIMPLE} />
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
              <span className="inline-block h-2 w-3 rounded-sm" style={{ background: "#13c2c2" }} />
              <WifiMutedText style={{ fontSize: 12 }}>
                Total data
              </WifiMutedText>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-1.5 w-3 rounded-sm" style={{ background: "#fa8c16" }} />
              <WifiMutedText style={{ fontSize: 12 }}>
                Upload
              </WifiMutedText>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-1.5 w-3 rounded-sm" style={{ background: "#722ed1" }} />
              <WifiMutedText style={{ fontSize: 12 }}>
                Download
              </WifiMutedText>
            </div>
          </div>
          <div className="flex items-end gap-px overflow-x-auto pb-6" style={{ minHeight: 160 }}>
            {points.map((point, index) => {
              const sessionHeight = Math.max(4, (point.sessionsCount / maxSessions) * 120);
              const bytesHeight = Math.max(4, (point.totalBytes / maxBytes) * 120);
              const uploadHeight = Math.max(
                2,
                point.totalBytes > 0 ? (point.totalInputBytes / point.totalBytes) * bytesHeight : 0
              );
              const downloadHeight = Math.max(2, bytesHeight - uploadHeight);
              const label = dayjs(point.date).format("D MMM");

              return (
                <Tooltip
                  key={point.date}
                  title={
                    <div style={{ fontSize: 12 }}>
                      <div>{label}</div>
                      <div>Sessions: {point.sessionsCount}</div>
                      <div>Unique users: {point.uniqueCredentials}</div>
                      <div>Total: {formatBytes(point.totalBytes)}</div>
                      <div>Download: {formatBytes(point.totalOutputBytes)}</div>
                      <div>Upload: {formatBytes(point.totalInputBytes)}</div>
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
                          height: sessionHeight,
                          background: "#1677ff",
                          borderRadius: 2,
                          opacity: 0.9,
                        }}
                      />
                      <div className="flex flex-col justify-end" style={{ height: bytesHeight }}>
                        <div
                          style={{
                            width: points.length > 20 ? 5 : 8,
                            height: downloadHeight,
                            background: "#722ed1",
                            borderRadius: "2px 2px 0 0",
                            opacity: 0.85,
                          }}
                        />
                        <div
                          style={{
                            width: points.length > 20 ? 5 : 8,
                            height: uploadHeight,
                            background: "#fa8c16",
                            borderRadius: "0 0 2px 2px",
                            opacity: 0.85,
                          }}
                        />
                      </div>
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

export default TrafficTrendChart;
