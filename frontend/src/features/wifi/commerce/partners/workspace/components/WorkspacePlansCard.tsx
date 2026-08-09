"use client";

import React from "react";
import { Card, Empty, Space, Tag, Typography } from "antd";
import type { WorkspacePlan } from "../types";

const { Text } = Typography;

type Props = {
  plans: WorkspacePlan[];
};

const WorkspacePlansCard: React.FC<Props> = ({ plans }) => {
  const pricedCount = plans.filter((p) => p.hasPricing).length;

  return (
    <Card
      size="small"
      title={`Sellable plans (${pricedCount}/${plans.length} priced)`}
    >
      {plans.length > 0 ? (
        <Space orientation="vertical" style={{ width: "100%" }} size="small">
          {plans.map((plan) => (
            <div
              key={plan.entitlementId}
              className="flex items-center justify-between rounded border px-3 py-2"
            >
              <div>
                <Tag style={{ fontFamily: "monospace", marginRight: 6 }}>{plan.code}</Tag>
                <Text type={plan.hasPricing === false ? "secondary" : undefined}>
                  {plan.name}
                </Text>
              </div>
              <Space size={4}>
                {plan.hasPricing ? (
                  <Tag color="success">Priced</Tag>
                ) : (
                  <Tag>No price</Tag>
                )}
                <Tag color="blue">{plan.quotaType.replace(/_/g, " ")}</Tag>
              </Space>
            </div>
          ))}
        </Space>
      ) : (
        <Empty description="No plans assigned yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
    </Card>
  );
};

export default WorkspacePlansCard;
