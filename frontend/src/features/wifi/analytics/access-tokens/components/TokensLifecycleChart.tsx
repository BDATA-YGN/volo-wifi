"use client";

import React, { useMemo } from "react";
import { Card, Empty, Tooltip, Typography } from "antd";
import dayjs from "dayjs";
import type { CredentialDailyPoint } from "../types";

const { Text } = Typography;

type Props = {
  points: CredentialDailyPoint[];
  loading?: boolean;
};

const TokensLifecycleChart: React.FC<Props> = ({ points, loading }) => {
  const maxValue = useMemo(() => {
    const peak = Math.max(
      ...points.map((p) => p.sold + p.activated + p.expired + p.revoked + p.archived),
      1
    );
    return peak;
  }, [points]);

  const showEveryNth = points.length > 14 ? Math.ceil(points.length / 10) : 1;

  return (
    <Card size="small" title="Lifecycle events" loading={loading} styles={{ body: { padding: 16 } }}>
      {points.length === 0 ? (
        <Empty description="No lifecycle events" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-3">
            {[
              { color: "#1677ff", label: "Sold" },
              { color: "#52c41a", label: "Activated" },
              { color: "#faad14", label: "Expired" },
              { color: "#ff4d4f", label: "Revoked" },
              { color: "#722ed1", label: "Archived" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span
                  className="inline-block h-2 w-3 rounded-sm"
                  style={{ background: item.color }}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {item.label}
                </Text>
              </div>
            ))}
          </div>
          <div className="flex items-end gap-px overflow-x-auto pb-6" style={{ minHeight: 160 }}>
            {points.map((point, index) => {
              const total =
                point.sold + point.activated + point.expired + point.revoked + point.archived;
              const scale = (v: number) => Math.max(2, (v / maxValue) * 120);
              const label = dayjs(point.date).format("D MMM");

              return (
                <Tooltip
                  key={point.date}
                  title={
                    <div style={{ fontSize: 12 }}>
                      <div>{label}</div>
                      <div>Sold: {point.sold}</div>
                      <div>Activated: {point.activated}</div>
                      <div>Expired: {point.expired}</div>
                      <div>Revoked: {point.revoked}</div>
                      <div>Archived: {point.archived}</div>
                    </div>
                  }
                >
                  <div
                    className="flex flex-col items-center justify-end"
                    style={{ minWidth: points.length > 20 ? 18 : 28, flex: 1 }}
                  >
                    <div className="flex items-end gap-0.5" style={{ height: 124 }}>
                      {total === 0 ? (
                        <div style={{ width: 8, height: 2, background: "#f0f0f0", borderRadius: 1 }} />
                      ) : (
                        <>
                          <div
                            style={{
                              width: 4,
                              height: scale(point.sold),
                              background: "#1677ff",
                              borderRadius: 1,
                            }}
                          />
                          <div
                            style={{
                              width: 4,
                              height: scale(point.activated),
                              background: "#52c41a",
                              borderRadius: 1,
                            }}
                          />
                          <div
                            style={{
                              width: 4,
                              height: scale(point.expired),
                              background: "#faad14",
                              borderRadius: 1,
                            }}
                          />
                          <div
                            style={{
                              width: 4,
                              height: scale(point.revoked),
                              background: "#ff4d4f",
                              borderRadius: 1,
                            }}
                          />
                          <div
                            style={{
                              width: 4,
                              height: scale(point.archived),
                              background: "#722ed1",
                              borderRadius: 1,
                            }}
                          />
                        </>
                      )}
                    </div>
                    {index % showEveryNth === 0 ? (
                      <Text
                        type="secondary"
                        style={{
                          fontSize: 10,
                          marginTop: 6,
                          transform: "rotate(-45deg)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {dayjs(point.date).format("D/M")}
                      </Text>
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

export default TokensLifecycleChart;
