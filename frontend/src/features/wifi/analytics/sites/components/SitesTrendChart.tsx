"use client";

import React, { useMemo, useState } from "react";
import { Card, Empty, theme } from "antd";
import { WifiMutedText } from "@/features/wifi/shared/components/WifiMutedText";
import dayjs from "dayjs";
import type { SiteDailyPoint } from "../types";
import { formatMoney } from "../utils";

type Props = {
  points: SiteDailyPoint[];
  currency: string;
  loading?: boolean;
  showActiveSites?: boolean;
};

const COLORS = {
  revenue: "#1677ff",
  tokens: "#13c2c2",
  active: "#722ed1",
};

const VIEW_W = 1000;
const VIEW_H = 176;
const PAD_TOP = 10;
const PAD_BOTTOM = 6;
const PLOT_H = VIEW_H - PAD_TOP - PAD_BOTTOM;

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

const LegendLine: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <div className="flex items-center gap-2">
    <span
      className="inline-block rounded-sm"
      style={{ width: 16, height: 2, background: color }}
    />
    <WifiMutedText style={{ fontSize: 12 }}>{label}</WifiMutedText>
  </div>
);

const SitesTrendChart: React.FC<Props> = ({
  points,
  currency,
  loading,
  showActiveSites = true,
}) => {
  const { token } = theme.useToken();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const showEveryNth = points.length > 14 ? Math.ceil(points.length / 10) : 1;

  const { revenueLine, tokenLine, activeLine } = useMemo(() => {
    const revenues = points.map((p) => p.revenue);
    const tokens = points.map((p) => p.itemsCount ?? 0);
    const actives = points.map((p) => p.activeSites);
    const maxRevenue = Math.max(...revenues, 1);
    const maxTokens = Math.max(...tokens, 1);
    const maxActive = Math.max(...actives, 1);

    return {
      revenueLine: toCoords(revenues, maxRevenue),
      tokenLine: toCoords(tokens, maxTokens),
      activeLine: toCoords(actives, maxActive),
    };
  }, [points]);

  const hoverPoint = hoverIndex != null ? points[hoverIndex] : null;
  const hoverX = hoverIndex != null ? revenueLine[hoverIndex]?.x : null;

  return (
    <Card size="small" title="Daily trend" loading={loading} styles={{ body: { padding: 16 } }}>
      {points.length === 0 ? (
        <Empty description="No activity in this period" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-4">
            <LegendLine color={COLORS.revenue} label="Revenue" />
            <LegendLine color={COLORS.tokens} label="Total tokens" />
            {showActiveSites ? <LegendLine color={COLORS.active} label="Active sites" /> : null}
          </div>

          <div
            className="relative"
            onMouseLeave={() => setHoverIndex(null)}
          >
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
                  {dayjs(hoverPoint.date).format("D MMM")}
                </div>
                <div>Revenue: {formatMoney(hoverPoint.revenue, currency)}</div>
                <div>Total tokens: {(hoverPoint.itemsCount ?? 0).toLocaleString()}</div>
                {showActiveSites ? <div>Active sites: {hoverPoint.activeSites}</div> : null}
              </div>
            ) : null}

            <svg
              viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
              preserveAspectRatio="none"
              style={{ width: "100%", height: 180, display: "block" }}
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

              {showActiveSites ? (
                <polyline
                  fill="none"
                  stroke={COLORS.active}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  points={toPolyline(activeLine)}
                />
              ) : null}
              <polyline
                fill="none"
                stroke={COLORS.tokens}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                points={toPolyline(tokenLine)}
              />
              <polyline
                fill="none"
                stroke={COLORS.revenue}
                strokeWidth={2.25}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                points={toPolyline(revenueLine)}
              />

              {hoverIndex != null ? (
                <>
                  <circle
                    cx={revenueLine[hoverIndex].x}
                    cy={revenueLine[hoverIndex].y}
                    r={4}
                    fill={COLORS.revenue}
                    stroke={token.colorBgContainer}
                    strokeWidth={1.5}
                  />
                  <circle
                    cx={tokenLine[hoverIndex].x}
                    cy={tokenLine[hoverIndex].y}
                    r={4}
                    fill={COLORS.tokens}
                    stroke={token.colorBgContainer}
                    strokeWidth={1.5}
                  />
                  {showActiveSites ? (
                    <circle
                      cx={activeLine[hoverIndex].x}
                      cy={activeLine[hoverIndex].y}
                      r={4}
                      fill={COLORS.active}
                      stroke={token.colorBgContainer}
                      strokeWidth={1.5}
                    />
                  ) : null}
                </>
              ) : null}

              {points.map((_, index) => (
                <rect
                  key={index}
                  x={
                    index === 0
                      ? 0
                      : (revenueLine[index].x + revenueLine[index - 1].x) / 2
                  }
                  y={0}
                  width={
                    index === 0
                      ? (revenueLine[1]?.x ?? VIEW_W) / 2
                      : index === points.length - 1
                        ? VIEW_W - (revenueLine[index].x + revenueLine[index - 1].x) / 2
                        : (revenueLine[index + 1].x - revenueLine[index - 1].x) / 2
                  }
                  height={VIEW_H}
                  fill="transparent"
                  onMouseEnter={() => setHoverIndex(index)}
                />
              ))}
            </svg>
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
                    {dayjs(point.date).format("D/M")}
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

export default SitesTrendChart;
