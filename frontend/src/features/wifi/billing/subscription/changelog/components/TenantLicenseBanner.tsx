"use client";

import React from "react";
import { Tag, Typography } from "antd";
import type { ChangelogLicense, ChangelogOrg } from "../types";
import { STATUS_COLOR } from "../constant";
import { formatDate } from "../../../tier-rates/platform/utils";

const { Text } = Typography;

type Props = {
  org: ChangelogOrg;
  license: ChangelogLicense;
};

const TenantLicenseBanner: React.FC<Props> = ({ org, license }) => (
  <div className="flex flex-wrap items-center gap-2">
    <Text strong style={{ fontSize: 16 }}>
      {org.name}
    </Text>
    <Text type="secondary" code>
      {org.code}
    </Text>
    <Tag color={STATUS_COLOR[license.status] ?? "default"}>{license.status}</Tag>
    <Tag>{license.billingCycle}</Tag>
    <Text type="secondary" style={{ fontSize: 12 }}>
      Site limit {license.stationLimit} · effective {formatDate(license.effectiveFrom)}
    </Text>
  </div>
);

export default TenantLicenseBanner;
