"use client";

import React from "react";
import Link from "next/link";
import { Alert, Card, Steps, Typography } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import type { WorkspaceDashboard, WorkspaceMode } from "../types";

const { Text, Paragraph } = Typography;

type Props = {
  dashboard: WorkspaceDashboard;
  mode: WorkspaceMode;
};

const WorkspaceReadinessCard: React.FC<Props> = ({ dashboard, mode }) => {
  const { readiness, stats } = dashboard;
  const isPreview = mode === "preview";

  const steps = [
    {
      title: "Sites mapped",
      status: readiness.hasSites ? ("finish" as const) : ("error" as const),
      content: readiness.hasSites
        ? `${stats.stationCount} site${stats.stationCount === 1 ? "" : "s"}`
        : isPreview
          ? "Map sites in Partner Directory"
          : "Contact your tenant admin",
    },
    {
      title: "Plans entitled",
      status: readiness.hasPlans ? ("finish" as const) : ("error" as const),
      content: readiness.hasPlans
        ? `${stats.planCount} plan${stats.planCount === 1 ? "" : "s"}`
        : "Plans must be assigned to your account",
    },
    {
      title: "Retail pricing",
      status: readiness.hasPricing ? ("finish" as const) : ("error" as const),
      content: readiness.hasPricing
        ? `${readiness.pricedPlanCount} priced`
        : "Reseller or default price book required",
    },
    {
      title: "Ready to sell",
      status: readiness.canSellTokens ? ("finish" as const) : ("wait" as const),
      content: readiness.canSellTokens ? "Issue access tokens" : "Complete setup above",
    },
  ];

  return (
    <Card
      size="small"
      title="Selling readiness"
      extra={
        readiness.canSellTokens ? (
          <Text type="success">
            <CheckCircleOutlined /> Ready
          </Text>
        ) : (
          <Text type="secondary">
            <CloseCircleOutlined /> Incomplete
          </Text>
        )
      }
    >
      {!readiness.canSellTokens ? (
        <Alert
          type="info"
          showIcon
          className="mb-4"
          message={
            isPreview
              ? "This partner cannot sell tokens yet"
              : "Complete setup before selling access tokens"
          }
          description={
            isPreview ? (
              <span>
                Finish configuration in{" "}
                <Link href="/wifi/commerce/partners">Partner Directory</Link> and{" "}
                <Link href="/wifi/catalog/retail-pricing">Retail Pricing</Link>.
              </span>
            ) : (
              "Your tenant administrator must map sites, assign plans, and configure pricing."
            )
          }
        />
      ) : null}

      <Steps orientation="vertical" size="small" current={-1} items={steps} />

      {dashboard.reseller.status !== "ACTIVE" ? (
        <Paragraph type="warning" style={{ marginTop: 16, marginBottom: 0 }}>
          Partner account is {dashboard.reseller.status.toLowerCase()}. Selling is disabled until
          status is active.
        </Paragraph>
      ) : null}
    </Card>
  );
};

export default WorkspaceReadinessCard;
