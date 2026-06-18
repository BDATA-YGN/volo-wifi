"use client";

import React from "react";
import { Alert, Progress, Tag, Typography } from "antd";
import type { LicensedSitesLicense, LicensedSitesOrg } from "../types";
import { STATUS_COLOR } from "../../constant";

const { Text } = Typography;

type Props = {
  org: LicensedSitesOrg;
  license: LicensedSitesLicense;
};

const LicenseUsageBanner: React.FC<Props> = ({ org, license }) => (
  <div className="flex flex-col gap-3">
    <div className="flex flex-wrap items-center gap-2">
      <Text strong style={{ fontSize: 16 }}>
        {org.name}
      </Text>
      <Text type="secondary" code>
        {org.code}
      </Text>
      <Tag color={STATUS_COLOR[license.status] ?? "default"}>{license.status}</Tag>
      <Tag>{license.billingCycle}</Tag>
    </div>

    <div style={{ maxWidth: 360 }}>
      <Text type="secondary" style={{ fontSize: 12 }}>
        Subscription usage — {license.billableCount} of {license.stationLimit} licensed slots
      </Text>
      <Progress
        percent={license.usagePercent}
        status={license.isAtLimit ? "exception" : license.isNearLimit ? "active" : "normal"}
      />
    </div>

    {license.isAtLimit ? (
      <Alert
        type="error"
        showIcon
        message="Site limit reached"
        description="This tenant cannot add more active sites until the subscription limit is increased."
      />
    ) : license.isNearLimit ? (
      <Alert
        type="warning"
        showIcon
        message="Approaching site limit"
        description={`Only ${license.remainingSlots} licensed slot${license.remainingSlots === 1 ? "" : "s"} remaining.`}
      />
    ) : null}
  </div>
);

export default LicenseUsageBanner;
