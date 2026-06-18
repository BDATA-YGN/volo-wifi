"use client";

import React from "react";
import { Card, Progress, Space, Tag } from "antd";
import { WifiMutedText } from "@/features/wifi/shared/components/WifiMutedText";
import type { PaymentsMeta } from "../types";
import { METHOD_COLOR, METHOD_OPTIONS } from "../constant";
import { formatMethodLabel, formatMoney } from "../utils";

type Props = {
  meta?: PaymentsMeta;
};

const MethodBreakdownCard: React.FC<Props> = ({ meta }) => {
  const currency = meta?.currency ?? "MMK";
  const amounts = meta?.methodAmounts ?? {};
  const total = Object.values(amounts).reduce((sum, v) => sum + v, 0);

  if (total <= 0) return null;

  return (
    <Card size="small" title="Tender breakdown">
      <Space orientation="vertical" style={{ width: "100%" }} size="middle">
        {METHOD_OPTIONS.map((opt) => {
          const amount = amounts[opt.value] ?? 0;
          if (amount <= 0) return null;
          const pct = Math.round((amount / total) * 100);
          return (
            <div key={opt.value}>
              <div className="mb-1 flex items-center justify-between">
                <Tag color={METHOD_COLOR[opt.value]}>{formatMethodLabel(opt.value)}</Tag>
                <WifiMutedText style={{ fontSize: 12 }}>
                  {formatMoney(amount, currency)} · {meta?.methodCounts?.[opt.value] ?? 0} txns
                </WifiMutedText>
              </div>
              <Progress percent={pct} showInfo={false} size="small" />
            </div>
          );
        })}
      </Space>
    </Card>
  );
};

export default MethodBreakdownCard;
