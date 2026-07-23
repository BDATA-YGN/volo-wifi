"use client";

import React from "react";
import { Card, Descriptions, Tag, Typography } from "antd";
import type { PolicyPlan } from "../types";
import { formatQuotaLabel, formatValidity } from "@/features/wifi/catalog/service-plans/utils";
import type { ServicePlanRecord, UnitTime } from "@/features/wifi/catalog/service-plans/types";

const { Text } = Typography;

type Props = {
  plan: PolicyPlan;
};

function timeToSeconds(amount: number | null | undefined, unit: string | null | undefined): number | null {
  if (amount == null || amount <= 0) return null;
  switch (unit) {
    case "MINUTE":
      return amount * 60;
    case "HOUR":
      return amount * 3600;
    case "DAY":
      return amount * 86400;
    case "MONTH":
      return amount * 30 * 86400;
    default:
      return amount;
  }
}

const PlanPolicyPlanSummary: React.FC<Props> = ({ plan }) => {
  const quotaPlan = {
    quotaType: (plan.quotaType as ServicePlanRecord["quotaType"]) ?? "TIME_ONLY",
    timeAmount: plan.timeAmount ?? null,
    timeUnit: (plan.timeUnit as UnitTime | null) ?? null,
    dataMb: plan.dataMb ?? null,
  };

  const seconds = timeToSeconds(plan.timeAmount, plan.timeUnit);
  const dataBytes =
    plan.dataMb != null && plan.dataMb > 0 ? plan.dataMb * 1024 * 1024 : null;

  return (
    <Card
      size="small"
      title={
        <span>
          Selected plan{" "}
          <Text code style={{ fontSize: 12 }}>
            {plan.code}
          </Text>
        </span>
      }
      extra={
        plan.isActive ? <Tag color="success">Active</Tag> : <Tag>Inactive</Tag>
      }
      styles={{ body: { padding: "8px 12px" } }}
    >
      <Descriptions
        size="small"
        column={{ xs: 1, sm: 2, md: 3 }}
        items={[
          {
            key: "name",
            label: "Name",
            children: plan.name,
          },
          {
            key: "quota",
            label: "Quota",
            children: formatQuotaLabel(quotaPlan),
          },
          {
            key: "validity",
            label: "Validity",
            children: formatValidity(plan.validityDays ?? null),
          },
          {
            key: "devices",
            label: "Max devices",
            children: plan.maxDevices ?? "—",
          },
          {
            key: "seconds",
            label: "→ Session-Timeout",
            children: seconds != null ? (
              <Text code>{seconds} sec</Text>
            ) : (
              <Text type="secondary">Unlimited / use {"{timeSeconds}"}</Text>
            ),
          },
          {
            key: "bytes",
            label: "→ Byte quota",
            children: dataBytes != null ? (
              <Text code>{dataBytes.toLocaleString("en-US")} bytes</Text>
            ) : (
              <Text type="secondary">Unlimited / n/a</Text>
            ),
          },
        ]}
      />
      <Text type="secondary" style={{ fontSize: 11 }}>
        Match RADIUS values to this plan so Session-Timeout and quotas stay consistent.
      </Text>
    </Card>
  );
};

export default PlanPolicyPlanSummary;
