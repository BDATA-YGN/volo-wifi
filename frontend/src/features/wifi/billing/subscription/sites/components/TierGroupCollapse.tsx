"use client";

import React from "react";
import { Collapse, Empty, Tag, Typography, theme } from "antd";
import type { LicensedSitesTierGroup } from "../types";
import { TIER_CODE_COLORS } from "../constant";
import { formatMoney } from "../../../tier-rates/platform/utils";
import LicensedSitesTable from "./LicensedSitesTable";

const { Text } = Typography;

type Props = {
  groups: LicensedSitesTierGroup[];
  loading?: boolean;
};

const TierGroupCollapse: React.FC<Props> = ({ groups, loading }) => {
  const { token } = theme.useToken();

  const visibleGroups = groups.filter((g) => g.displayedCount > 0);

  if (!loading && visibleGroups.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="No licensed sites for this tenant yet."
      />
    );
  }

  return (
    <Collapse
      defaultActiveKey={visibleGroups.map((g) => g.stationSize.id)}
      items={visibleGroups.map((group) => ({
        key: group.stationSize.id,
        label: (
          <div className="flex flex-wrap items-center gap-2">
            <Tag color={TIER_CODE_COLORS[group.stationSize.code] ?? "default"}>
              {group.stationSize.code}
            </Tag>
            <Text strong>{group.stationSize.name}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {group.billableCount} billable
              {group.displayedCount !== group.billableCount
                ? ` · ${group.displayedCount} shown`
                : ""}
            </Text>
            {group.monthlySubtotal ? (
              <Text type="secondary" style={{ fontSize: 12 }}>
                · {formatMoney(group.monthlySubtotal, group.currency)} / month
              </Text>
            ) : null}
            {group.hasOverride ? <Tag color="blue">Tenant rate</Tag> : null}
          </div>
        ),
        children: (
          <div
            style={{
              margin: -8,
              padding: 8,
              borderRadius: token.borderRadius,
              background: token.colorFillAlter,
            }}
          >
            <LicensedSitesTable sites={group.sites} loading={loading} />
          </div>
        ),
      }))}
    />
  );
};

export default TierGroupCollapse;
