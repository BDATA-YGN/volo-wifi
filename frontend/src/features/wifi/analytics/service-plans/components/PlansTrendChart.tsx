"use client";

import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Card, Empty, theme } from "antd";
import dayjs from "dayjs";
import { WifiMutedText } from "@/features/wifi/shared/components/WifiMutedText";
import type { PlanTrendSeries } from "../types";
import { formatMoney } from "../utils";

type Props = {
  series: PlanTrendSeries[];
  granularity: "hourly" | "daily";
  currency: string;
  loading?: boolean;
};

const COLORS = ["#1677ff", "#52c41a", "#722ed1", "#fa8c16", "#13c2c2", "#eb2f96"];

function formatHoverTitle(bucket: string, granularity: "hourly" | "daily", label: string) {
  const parsed = dayjs(bucket);
  if (!parsed.isValid()) return label;
  return granularity === "hourly" ? parsed.format("D MMM, HH:00") : parsed.format("D MMM");
}

const PlansTrendChart: React.FC<Props> = ({
  series,
  granularity,
  currency,
  loading,
}) => {
  const { token } = theme.useToken();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const activeSeries = useMemo(
    () =>
      [...series]
        .sort(
          (a, b) =>
            b.points.reduce((sum, p) => sum + p.itemsCount, 0) -
            a.points.reduce((sum, p) => sum + p.itemsCount, 0),
        )
        .slice(0, 6),
    [series],
  );

  const labels = useMemo(() => {
    const first = activeSeries[0];
    if (!first) return [];
    return first.points.map((p) => p.label);
  }, [activeSeries]);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const apply = () => {
      const next = Math.floor(el.getBoundingClientRect().width);
      if (next > 0) setWidth(next);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => observer.disconnect();
  }, [activeSeries.length, labels.length]);

  const tokenMax = useMemo(() => {
    const all = activeSeries.flatMap((s) => s.points.map((p) => p.itemsCount));
    return Math.max(...all, 1);
  }, [activeSeries]);

  const revenueMax = useMemo(() => {
    const all = activeSeries.flatMap((s) => s.points.map((p) => p.revenue));
    return Math.max(...all, 1);
  }, [activeSeries]);

  const height = 260;
  const top = 16;
  const bottom = 38;
  const left = 16;
  const right = 16;
  const chartW = Math.max(width - left - right, 1);
  const chartH = height - top - bottom;
  const stepX = labels.length > 1 ? chartW / (labels.length - 1) : 0;

  const xAt = (idx: number) =>
    labels.length === 1 ? left + chartW / 2 : left + idx * stepX;

  const yAt = (value: number, max: number) =>
    top + chartH - (value / Math.max(max, 1)) * chartH;

  const linePath = (values: number[], max: number) =>
    values
      .map((value, idx) => {
        const x = xAt(idx);
        const y = yAt(value, max);
        return `${idx === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");

  const hitRect = (idx: number) => {
    const x = xAt(idx);
    const prevX = idx === 0 ? left : (xAt(idx - 1) + x) / 2;
    const nextX = idx === labels.length - 1 ? left + chartW : (x + xAt(idx + 1)) / 2;
    return { x: prevX, width: Math.max(nextX - prevX, 1) };
  };

  const hoverPoint = hoverIndex != null ? activeSeries[0]?.points[hoverIndex] : null;
  const hoverX = hoverIndex != null ? xAt(hoverIndex) : null;

  return (
    <Card
      size="small"
      title={granularity === "hourly" ? "Hourly trend by plan" : "Daily trend by plan"}
      loading={loading}
      styles={{ body: { padding: 16 } }}
    >
      {activeSeries.length === 0 || labels.length === 0 ? (
        <Empty description="No activity in this period" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-4">
            {activeSeries.map((s, idx) => (
              <div key={s.planId} className="flex items-center gap-2">
                <span
                  className="inline-block h-2 w-3 rounded-sm"
                  style={{ background: COLORS[idx % COLORS.length] }}
                />
                <WifiMutedText style={{ fontSize: 12 }}>
                  {s.code}
                </WifiMutedText>
              </div>
            ))}
          </div>
          <div
            ref={wrapRef}
            className="relative"
            style={{ width: "100%" }}
            onMouseLeave={() => setHoverIndex(null)}
          >
            {hoverPoint && hoverX != null && width > 0 ? (
              <div
                className="pointer-events-none absolute z-10 rounded-md px-2.5 py-1.5 text-xs shadow-md"
                style={{
                  left: hoverX,
                  top: 8,
                  transform: hoverX > width * 0.62 ? "translateX(-100%)" : "translateX(8px)",
                  background: token.colorBgElevated,
                  border: `1px solid ${token.colorBorderSecondary}`,
                  color: token.colorText,
                  whiteSpace: "nowrap",
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  {formatHoverTitle(hoverPoint.bucket, granularity, hoverPoint.label)}
                </div>
                {activeSeries.map((s, idx) => {
                  const point = s.points[hoverIndex ?? 0];
                  return (
                    <div key={s.planId} style={{ marginTop: idx === 0 ? 0 : 4 }}>
                      <span style={{ color: COLORS[idx % COLORS.length], fontWeight: 600 }}>
                        {s.code}
                      </span>
                      {" · "}
                      {(point?.itemsCount ?? 0).toLocaleString()} tokens
                      {" · "}
                      {formatMoney(point?.revenue ?? 0, currency)}
                    </div>
                  );
                })}
              </div>
            ) : null}
            {width > 0 ? (
              <svg
                width={width}
                height={height}
                role="img"
                aria-label={granularity === "hourly" ? "Hourly trend by plan" : "Daily trend by plan"}
              >
                {labels.map((label, idx) => {
                  const x = xAt(idx);
                  const showLabel =
                    granularity !== "hourly" || idx % 2 === 0 || idx === labels.length - 1;
                  return (
                    <g key={`lbl-${label}-${idx}`}>
                      <line x1={x} y1={top} x2={x} y2={top + chartH} stroke="#263244" strokeWidth="0.7" />
                      {showLabel ? (
                        <text x={x} y={height - 12} fontSize="10" fill="#8b9bb3" textAnchor="middle">
                          {label}
                        </text>
                      ) : null}
                    </g>
                  );
                })}
                {hoverX != null ? (
                  <line
                    x1={hoverX}
                    x2={hoverX}
                    y1={top}
                    y2={top + chartH}
                    stroke={token.colorTextQuaternary}
                    strokeWidth={1.5}
                  />
                ) : null}
                {activeSeries.map((s, idx) => (
                  <path
                    key={`items-${s.planId}`}
                    d={linePath(s.points.map((p) => p.itemsCount), tokenMax)}
                    fill="none"
                    stroke={COLORS[idx % COLORS.length]}
                    strokeWidth={2.4}
                    strokeLinecap="round"
                  />
                ))}
                {activeSeries.map((s, idx) => (
                  <path
                    key={`rev-${s.planId}`}
                    d={linePath(s.points.map((p) => p.revenue), revenueMax)}
                    fill="none"
                    stroke={COLORS[idx % COLORS.length]}
                    strokeWidth={1.2}
                    strokeDasharray="4 3"
                    opacity={0.65}
                  />
                ))}
                {hoverIndex != null
                  ? activeSeries.map((s, idx) => {
                      const point = s.points[hoverIndex];
                      const color = COLORS[idx % COLORS.length];
                      return (
                        <g key={`dots-${s.planId}`}>
                          <circle
                            cx={xAt(hoverIndex)}
                            cy={yAt(point.itemsCount, tokenMax)}
                            r={4}
                            fill={color}
                            stroke={token.colorBgContainer}
                            strokeWidth={1.5}
                          />
                          <circle
                            cx={xAt(hoverIndex)}
                            cy={yAt(point.revenue, revenueMax)}
                            r={3}
                            fill={color}
                            stroke={token.colorBgContainer}
                            strokeWidth={1.2}
                            opacity={0.75}
                          />
                        </g>
                      );
                    })
                  : null}
                {labels.map((_, idx) => {
                  const hit = hitRect(idx);
                  return (
                    <rect
                      key={`hit-${idx}`}
                      x={hit.x}
                      y={0}
                      width={hit.width}
                      height={height}
                      fill="transparent"
                      onMouseEnter={() => setHoverIndex(idx)}
                    />
                  );
                })}
              </svg>
            ) : null}
          </div>
          <div className="mt-2">
            <WifiMutedText style={{ fontSize: 11 }}>
              Solid line = tokens sold, dashed line = revenue ({currency})
              {granularity === "hourly"
                ? ", hourly for the selected day."
                : ", from daily sales stats."}
            </WifiMutedText>
          </div>
        </>
      )}
    </Card>
  );
};

export default PlansTrendChart;
