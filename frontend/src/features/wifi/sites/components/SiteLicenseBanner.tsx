"use client";

import React from "react";
import Link from "next/link";
import { Alert, Progress, Typography } from "antd";
import { useRoutePermission } from "@/features/wifi/shared/hooks/useRoutePermission";
import type { SitesLicenseMeta } from "../types";

const { Text } = Typography;

type Props = {
  license?: SitesLicenseMeta;
};

const SiteLicenseBanner: React.FC<Props> = ({ license }) => {
  const licensedSitesPermission = useRoutePermission("/wifi/billing/subscription/sites");

  if (!license?.hasLicense) {
    return (
      <Alert
        type="warning"
        showIcon
        title="No subscription on file"
        description="Active sites require a tenant subscription with a licensed site limit."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-solid border-[var(--ant-color-border-secondary)] bg-[var(--ant-color-bg-container)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Text type="secondary" style={{ fontSize: 12 }}>
          Licensed site usage — {license.billableCount} of {license.stationLimit} active slots
        </Text>
        {licensedSitesPermission.accessible ? (
          <Link href="/wifi/billing/subscription/sites" style={{ fontSize: 12 }}>
            View licensed sites
          </Link>
        ) : null}
      </div>
      <Progress
        percent={license.usagePercent}
        status={license.isAtLimit ? "exception" : license.isNearLimit ? "active" : "normal"}
      />
      {license.isAtLimit ? (
        <Alert
          type="error"
          showIcon
          title="Site limit reached"
          description="Cannot add more active sites until the subscription limit is increased."
        />
      ) : license.isNearLimit ? (
        <Alert
          type="warning"
          showIcon
          title="Approaching site limit"
          description={`Only ${license.remainingSlots} licensed slot${license.remainingSlots === 1 ? "" : "s"} remaining.`}
        />
      ) : null}
    </div>
  );
};

export default SiteLicenseBanner;
