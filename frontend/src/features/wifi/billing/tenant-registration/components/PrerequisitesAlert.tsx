"use client";

import React from "react";
import { Alert, Button, Space } from "antd";
import { ArrowRightOutlined, WarningOutlined } from "@ant-design/icons";
import Link from "next/link";
import type { RegistrationPrerequisites } from "../types";

interface Props {
  prerequisites: RegistrationPrerequisites | null;
  loading?: boolean;
}

const PrerequisitesAlert: React.FC<Props> = ({ prerequisites, loading }) => {
  if (loading || !prerequisites || prerequisites.ready) return null;

  const needsTiers = prerequisites.missing.includes("capacity_tiers");
  const needsRates = prerequisites.missing.includes("platform_tier_rates");

  return (
    <Alert
      type="warning"
      showIcon
      icon={<WarningOutlined />}
      className="mb-6"
      message="Platform billing setup required"
      description={
        <Space direction="vertical" size="small" className="w-full">
          <span>
            Configure capacity tiers and platform tier rates before registering the first tenant.
          </span>
          <Space wrap>
            {needsTiers ? (
              <Link href="/wifi/billing/capacity-tiers">
                <Button size="small" icon={<ArrowRightOutlined />}>
                  Capacity Tiers
                </Button>
              </Link>
            ) : null}
            {needsRates ? (
              <Link href="/wifi/billing/tier-rates/platform">
                <Button size="small" icon={<ArrowRightOutlined />}>
                  Platform Tier Rates
                </Button>
              </Link>
            ) : null}
          </Space>
        </Space>
      }
    />
  );
};

export default PrerequisitesAlert;
