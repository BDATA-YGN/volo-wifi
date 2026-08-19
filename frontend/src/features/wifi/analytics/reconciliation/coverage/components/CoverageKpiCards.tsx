"use client";

import React from "react";
import { Card, Col, Row, Statistic, theme } from "antd";
import { WifiMutedText } from "@/features/wifi/shared/components/WifiMutedText";
import {
  CheckCircleOutlined,
  DatabaseOutlined,
  ExclamationCircleOutlined,
  LockOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import type { CoverageSummary, EligibilityStatus } from "../types";
import { formatCount, formatGapDays, formatPercent } from "../utils";

type Props = {
  summary: CoverageSummary;
  loading?: boolean;
  selectedEligibility?: EligibilityStatus;
  onSelectEligibility?: (status: EligibilityStatus | undefined) => void;
};

type KpiDef = {
  key: EligibilityStatus | "scopes" | "avg";
  title: string;
  value: number | string;
  hint: string;
  prefix?: React.ReactNode;
  eligibility?: EligibilityStatus;
};

const CoverageKpiCards: React.FC<Props> = ({
  summary,
  loading,
  selectedEligibility,
  onSelectEligibility,
}) => {
  const { token } = theme.useToken();
  const sealedPct = summary.sealedPct ?? 0;
  const atRisk = summary.atRiskCount ?? summary.gapCount + summary.unsealedCount + summary.noCoverageCount;

  const kpis: KpiDef[] = [
    {
      key: "SEALED",
      title: "Sealed",
      value: summary.sealedCount,
      hint: `${formatPercent(sealedPct)} of scopes · purge eligible`,
      prefix: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
      eligibility: "SEALED",
    },
    {
      key: "GAP",
      title: "Coverage gaps",
      value: summary.gapCount,
      hint: `${formatCount(summary.totalUncoveredPayments)} uncovered payments`,
      prefix: <WarningOutlined style={{ color: "#faad14" }} />,
      eligibility: "GAP",
    },
    {
      key: "UNSEALED",
      title: "Unsealed",
      value: summary.unsealedCount,
      hint: "Missing posting seal",
      prefix: <LockOutlined style={{ color: "#1677ff" }} />,
      eligibility: "UNSEALED",
    },
    {
      key: "NO_COVERAGE",
      title: "No coverage",
      value: summary.noCoverageCount,
      hint: "Payment activity without a record",
      prefix: <ExclamationCircleOutlined style={{ color: "#ff4d4f" }} />,
      eligibility: "NO_COVERAGE",
    },
    {
      key: "scopes",
      title: "Scopes tracked",
      value: summary.scopeCount,
      hint: `${formatCount(summary.activePaymentScopes)} with payment activity`,
      prefix: <DatabaseOutlined style={{ color: "#722ed1" }} />,
    },
    {
      key: "avg",
      title: "Avg gap",
      value: formatGapDays(summary.avgGapDays),
      hint: `${formatCount(atRisk)} scopes at risk`,
    },
  ];

  return (
    <Row gutter={[16, 16]}>
      {kpis.map((kpi, index) => {
        const active = kpi.eligibility != null && selectedEligibility === kpi.eligibility;
        const clickable =
          Boolean(onSelectEligibility) && (kpi.eligibility != null || kpi.key === "scopes");
        return (
          <Col xs={24} sm={12} lg={8} key={`${kpi.title}-${index}`}>
            <Card
              size="small"
              hoverable={clickable}
              onClick={
                clickable
                  ? () => {
                      if (kpi.key === "scopes") {
                        onSelectEligibility?.(undefined);
                        return;
                      }
                      if (!kpi.eligibility) return;
                      onSelectEligibility?.(
                        selectedEligibility === kpi.eligibility ? undefined : kpi.eligibility
                      );
                    }
                  : undefined
              }
              styles={{
                body: { padding: 16 },
              }}
              style={{
                cursor: clickable ? "pointer" : undefined,
                borderColor: active ? token.colorPrimary : undefined,
              }}
            >
              <Statistic
                loading={loading}
                title={kpi.title}
                value={kpi.value}
                prefix={kpi.prefix}
                formatter={
                  typeof kpi.value === "number"
                    ? (value) => formatCount(Number(value))
                    : undefined
                }
              />
              <WifiMutedText style={{ fontSize: 12 }}>{kpi.hint}</WifiMutedText>
            </Card>
          </Col>
        );
      })}
    </Row>
  );
};

export default CoverageKpiCards;
