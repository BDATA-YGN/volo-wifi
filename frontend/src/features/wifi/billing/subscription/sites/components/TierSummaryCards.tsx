"use client";

import React from "react";
import { Card, Col, Row, Tag, Typography, theme } from "antd";
import type { LicensedSitesTierGroup } from "../types";
import { TIER_CODE_COLORS } from "../constant";
import { formatMoney } from "../../../tier-rates/platform/utils";

const { Text } = Typography;

type Props = {
  groups: LicensedSitesTierGroup[];
  selectedTierCode: string | null;
  loading?: boolean;
  onSelectTier: (tierCode: string | null) => void;
};

const TierSummaryCards: React.FC<Props> = ({
  groups,
  selectedTierCode,
  loading,
  onSelectTier,
}) => {
  const { token } = theme.useToken();

  return (
    <Row gutter={[12, 12]}>
      <Col xs={12} sm={8} md={6} lg={4}>
        <Card
          size="small"
          loading={loading}
          hoverable
          onClick={() => onSelectTier(null)}
          style={{
            borderColor: !selectedTierCode ? token.colorPrimary : undefined,
            cursor: "pointer",
          }}
          styles={{ body: { padding: 12 } }}
        >
          <Text type="secondary" style={{ fontSize: 11 }}>
            All tiers
          </Text>
          <div>
            <Text strong style={{ fontSize: 20 }}>
              {groups.reduce((sum, g) => sum + g.billableCount, 0)}
            </Text>
          </div>
        </Card>
      </Col>
      {groups.map((group) => (
        <Col key={group.stationSize.id} xs={12} sm={8} md={6} lg={4}>
          <Card
            size="small"
            loading={loading}
            hoverable
            onClick={() => onSelectTier(group.stationSize.code)}
            style={{
              borderColor:
                selectedTierCode === group.stationSize.code ? token.colorPrimary : undefined,
              cursor: "pointer",
            }}
            styles={{ body: { padding: 12 } }}
          >
            <Tag color={TIER_CODE_COLORS[group.stationSize.code] ?? "default"}>
              {group.stationSize.code}
            </Tag>
            <div>
              <Text strong style={{ fontSize: 20 }}>
                {group.billableCount}
              </Text>
              <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>
                billable
              </Text>
            </div>
            {group.effectiveUnitPrice ? (
              <Text type="secondary" style={{ fontSize: 11 }}>
                {formatMoney(group.effectiveUnitPrice, group.currency)}/site
                {group.hasOverride ? " · override" : ""}
              </Text>
            ) : null}
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default TierSummaryCards;
