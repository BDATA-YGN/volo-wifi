"use client";

import React, { useMemo, useState } from "react";
import { Card, Empty, theme } from "antd";
import { WifiMutedText } from "@/features/wifi/shared/components/WifiMutedText";
import dayjs from "dayjs";
import type { TrendGranularity, VoucherRunDailyPoint } from "../types";

type Props = {
  points: VoucherRunDailyPoint[];
  granularity?: TrendGranularity;
  loading?: boolean;
};

const COLORS = {
  issued: "#722ed1",
  activated: "#13c2c2",
  runs: "#1677ff",
};

const VIEW_W = 1000;
const VIEW_H = 200;
const PAD_TOP = 12;
const PAD_BOTTOM = 8;
const PLOT_H = VIEW_H - PAD_TOP - PAD_BOTTOM;

function formatTrendLabel(date: string, grain: TrendGranularity) {
  return grain === "hourly" ? dayjs(date).format("HH:00") : dayjs(date).format("D/M");
}

function formatTrendTooltip(date: string, grain: TrendGranularity) {
  return grain === "hourly" ? dayjs(date).format("D MMM, HH:00") : dayjs(date).format("D MMM YYYY");
}

function toCoords(values: number[], max: number) {
  const n = values.length;
  const span = Math.max(n - 1, 1);
  return values.map((value, i) => {
    const x = n === 1 ? VIEW_W / 2 : (i / span) * VIEW_W;
    const ratio = max > 0 ? value / max : 0;
    const y = PAD_TOP + PLOT_H - ratio * PLOT_H;
    return { x, y };
  });
}

function toPolyline(coords: { x: number; y: number }[]) {
  return coords.map((p) => `${p.x},${p.y}`).join(" ");
}

const LegendLine: React.FC<{ color: string; label: string; dashed?: boolean }> = ({
  color,
  label,
  dashed,
}) => (
  <div className="flex items-center gap-2">
    <span
      className="inline-block rounded-sm"
      style={{
        width: 16,
        height: 2,
        background: dashed ? "transparent" : color,
        borderTop: dashed ? `2px dashed ${color}` : undefined,
      }}
    />
    <WifiMutedText style={{ fontSize: 12 }}>{label}</WifiMutedText>
  </div>
);

const RunsTrendChart: React.FC<Props> = ({ points, granularity = "daily", loading }) => {
  const { token } = theme.useToken();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const grain = granularity;
  const showEveryNth =
    grain === "hourly" ? 2 : points.length > 14 ? Math.ceil(points.length / 10) : 1;

  const { voucherLine, activatedLine, runLine, voucherMax, runMax } = useMemo(() => {
    const issued = points.map((p) => p.vouchersIssued);
    const activated = points.map((p) => p.vouchersActivated);
    const runs = points.map((p) => p.batchesCreated);
    const nextVoucherMax = Math.max(...issued, ...activated, 1);
    const nextRunMax = Math.max(...runs, 1);

    return {
      voucherLine: toCoords(issued, nextVoucherMax),
      activatedLine: toCoords(activated, nextVoucherMax),
      runLine: toCoords(runs, nextRunMax),
      voucherMax: nextVoucherMax,
      runMax: nextRunMax,
    };
  }, [points]);

  const hoverPoint = hoverIndex != null ? points[hoverIndex] : null;
  const hoverX = hoverIndex != null ? voucherLine[hoverIndex]?.x : null;

  return (
    <Card
      size="small"
      title={grain === "hourly" ? "Hourly issuance & activation" : "Issuance & activation trend"}
      loading={loading}
      styles={{ body: { padding: 16 } }}
    >
      {points.length === 0 ? (
        <Empty description="No voucher runs in this period" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-4">
              <LegendLine color={COLORS.issued} label="Issued" />
              <LegendLine color={COLORS.activated} label="Activated" />
              <LegendLine color={COLORS.runs} label="Runs" dashed />
            </div>
            <WifiMutedText style={{ fontSize: 11 }}>
              Runs use their own scale so batch counts are not flattened by issued volume
            </WifiMutedText>
          </div>

          <div className="relative" onMouseLeave={() => setHoverIndex(null)}>
            {hoverPoint && hoverX != null ? (
              <div
                className="pointer-events-none absolute z-10 rounded-md px-2.5 py-1.5 text-xs shadow-md"
                style={{
                  left: `${(hoverX / VIEW_W) * 100}%`,
                  top: 8,
                  transform: hoverX > VIEW_W * 0.7 ? "translateX(-100%)" : "translateX(8px)",
                  background: token.colorBgElevated,
                  border: `1px solid ${token.colorBorderSecondary}`,
                  color: token.colorText,
                  whiteSpace: "nowrap",
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  {formatTrendTooltip(hoverPoint.date, grain)}
                </div>
                <div>Runs: {hoverPoint.batchesCreated.toLocaleString()}</div>
                <div>Issued: {hoverPoint.vouchersIssued.toLocaleString()}</div>
                <div>Activated: {hoverPoint.vouchersActivated.toLocaleString()}</div>
              </div>
            ) : null}

            <svg
              viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
              preserveAspectRatio="none"
              style={{ width: "100%", height: 200, display: "block" }}
            >
              {[0.25, 0.5, 0.75, 1].map((t) => {
                const y = PAD_TOP + PLOT_H * (1 - t);
                return (
                  <line
                    key={t}
                    x1={0}
                    x2={VIEW_W}
                    y1={y}
                    y2={y}
                    stroke={token.colorBorderSecondary}
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}

              {hoverX != null ? (
                <line
                  x1={hoverX}
                  x2={hoverX}
                  y1={PAD_TOP}
                  y2={PAD_TOP + PLOT_H}
                  stroke={token.colorTextQuaternary}
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              ) : null}

              <polyline
                fill="none"
                stroke={COLORS.runs}
                strokeWidth={1.75}
                strokeDasharray="6 4"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                points={toPolyline(runLine)}
              />
              <polyline
                fill="none"
                stroke={COLORS.issued}
                strokeWidth={2.25}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                points={toPolyline(voucherLine)}
              />
              <polyline
                fill="none"
                stroke={COLORS.activated}
                strokeWidth={2.25}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                points={toPolyline(activatedLine)}
              />

              {hoverIndex != null ? (
                <>
                  {(
                    [
                      [voucherLine, COLORS.issued],
                      [activatedLine, COLORS.activated],
                      [runLine, COLORS.runs],
                    ] as const
                  ).map(([line, color], i) => (
                    <circle
                      key={i}
                      cx={line[hoverIndex].x}
                      cy={line[hoverIndex].y}
                      r={4}
                      fill={color}
                      stroke={token.colorBgContainer}
                      strokeWidth={1.5}
                    />
                  ))}
                </>
              ) : null}

              {points.map((_, index) => (
                <rect
                  key={index}
                  x={
                    index === 0
                      ? 0
                      : (voucherLine[index].x + voucherLine[index - 1].x) / 2
                  }
                  y={0}
                  width={
                    index === 0
                      ? (voucherLine[1]?.x ?? VIEW_W) / 2
                      : index === points.length - 1
                        ? VIEW_W - (voucherLine[index].x + voucherLine[index - 1].x) / 2
                        : (voucherLine[index + 1].x - voucherLine[index - 1].x) / 2
                  }
                  height={VIEW_H}
                  fill="transparent"
                  onMouseEnter={() => setHoverIndex(index)}
                />
              ))}
            </svg>

            <div className="pointer-events-none absolute inset-y-0 left-0 flex flex-col justify-between py-3">
              <WifiMutedText style={{ fontSize: 10 }}>{voucherMax.toLocaleString()}</WifiMutedText>
              <WifiMutedText style={{ fontSize: 10 }}>0</WifiMutedText>
            </div>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex flex-col items-end justify-between py-3">
              <WifiMutedText style={{ fontSize: 10, color: COLORS.runs }}>
                {runMax.toLocaleString()}
              </WifiMutedText>
              <WifiMutedText style={{ fontSize: 10, color: COLORS.runs }}>0</WifiMutedText>
            </div>
          </div>

          <div className="mt-1 flex">
            {points.map((point, index) => (
              <div key={point.date} className="flex-1 overflow-visible text-center">
                {index % showEveryNth === 0 ? (
                  <WifiMutedText
                    style={{
                      fontSize: 10,
                      display: "inline-block",
                      transform: "rotate(-45deg)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatTrendLabel(point.date, grain)}
                  </WifiMutedText>
                ) : null}
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
};

export default RunsTrendChart;
