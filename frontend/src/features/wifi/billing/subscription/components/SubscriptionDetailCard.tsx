"use client";

import React from "react";
import { Card, Col, Descriptions, Progress, Row, Tag, Typography, theme } from "antd";
import type { SubscriptionRecord } from "../types";
import { STATUS_COLOR } from "../constant";
import { formatDate } from "../../tier-rates/platform/utils";

const { Text, Title } = Typography;

type Props = {
  license: SubscriptionRecord;
  overrideCount?: number;
};

const SubscriptionDetailCard: React.FC<Props> = ({ license, overrideCount }) => {
  const { token } = theme.useToken();

  return (
    <Card
      styles={{ body: { padding: 24 } }}
      style={{
        borderRadius: token.borderRadiusLG,
        borderColor: license.isAtLimit ? token.colorErrorBorder : undefined,
      }}
    >
      <Row gutter={[24, 24]} align="middle">
        <Col xs={24} md={14}>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Title level={4} style={{ margin: 0 }}>
              {license.org.name}
            </Title>
            <Tag color={STATUS_COLOR[license.status]}>{license.status}</Tag>
            <Tag>{license.billingCycle}</Tag>
          </div>
          <Text type="secondary" code>
            {license.org.code}
          </Text>

          <Descriptions
            column={{ xs: 1, sm: 2 }}
            size="small"
            className="mt-4"
            items={[
              {
                key: "effective",
                label: "Effective from",
                children: formatDate(license.effectiveFrom),
              },
              {
                key: "expires",
                label: "Expires",
                children: license.expiresAt ? formatDate(license.expiresAt) : "No expiry",
              },
              {
                key: "currency",
                label: "Currency",
                children: license.currency,
              },
              {
                key: "overrides",
                label: "Tier overrides",
                children: overrideCount ? `${overrideCount} active` : "Platform default",
              },
            ]}
          />

          {license.notes ? (
            <div
              className="mt-4 p-3 rounded"
              style={{ background: token.colorFillAlter, fontSize: 13 }}
            >
              <Text type="secondary">{license.notes}</Text>
            </div>
          ) : null}
        </Col>

        <Col xs={24} md={10}>
          <div className="text-center">
            <Progress
              type="dashboard"
              percent={license.usagePercent}
              status={license.isAtLimit ? "exception" : license.isNearLimit ? "active" : "normal"}
              format={() => (
                <div>
                  <div style={{ fontSize: 22, fontWeight: 600 }}>
                    {license.activeStationCount}
                  </div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    of {license.stationLimit} sites
                  </Text>
                </div>
              )}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {license.remainingSlots} slot{license.remainingSlots === 1 ? "" : "s"} remaining
            </Text>
          </div>
        </Col>
      </Row>
    </Card>
  );
};

export default SubscriptionDetailCard;
