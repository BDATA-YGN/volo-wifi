"use client";

import React from "react";
import { Typography, theme } from "antd";
import { ArrowDownOutlined, ArrowUpOutlined } from "@ant-design/icons";

const { Text } = Typography;

function formatDelta(delta: number | null): string {
  if (delta === null) return "new";
  if (delta === 0) return "0%";
  return `${delta > 0 ? "+" : ""}${delta}%`;
}

type Props = {
  delta: number | null;
  label?: string;
  style?: React.CSSProperties;
};

/** Period-over-period delta line for KPI cards — theme-safe in light and dark mode. */
export const KpiDeltaText: React.FC<Props> = ({
  delta,
  label = "vs prior period",
  style,
}) => {
  const { token } = theme.useToken();
  const isUp = delta !== null && delta > 0;
  const isDown = delta !== null && delta < 0;
  const color = isUp
    ? token.colorSuccess
    : isDown
      ? token.colorError
      : token.colorTextSecondary;

  return (
    <Text style={{ fontSize: 12, color, ...style }}>
      {isUp ? <ArrowUpOutlined /> : null}
      {isDown ? <ArrowDownOutlined /> : null}{" "}
      {formatDelta(delta)} {label}
    </Text>
  );
};

export default KpiDeltaText;
