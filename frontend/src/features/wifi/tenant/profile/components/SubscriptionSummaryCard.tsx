"use client";

import React from "react";
import Link from "next/link";
import { Button, Card, Descriptions, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { useRoutePermission } from "@/features/wifi/shared/hooks/useRoutePermission";
import type { TenantProfile } from "../types";
import { LICENSE_STATUS_COLOR } from "../constant";

const { Text } = Typography;

type Props = {
  profile: TenantProfile;
};

const SubscriptionSummaryCard: React.FC<Props> = ({ profile }) => {
  const license = profile.orgLicense;
  const subscriptionPermission = useRoutePermission("/wifi/billing/subscription");

  return (
    <Card title="Subscription" size="small">
      {license ? (
        <>
          <div className="mb-3">
            <Tag color={LICENSE_STATUS_COLOR[license.status]}>{license.status}</Tag>
            <Tag>{license.billingCycle}</Tag>
          </div>
          <Descriptions column={1} size="small">
            <Descriptions.Item label="Site limit">{license.stationLimit}</Descriptions.Item>
            <Descriptions.Item label="In use">
              {profile.activeStationCount} active ({profile.usagePercent}%)
            </Descriptions.Item>
            <Descriptions.Item label="Remaining slots">
              {profile.remainingSlots ?? "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Effective from">
              {dayjs(license.effectiveFrom).format("YYYY-MM-DD")}
            </Descriptions.Item>
            <Descriptions.Item label="Expires">
              {license.expiresAt ? dayjs(license.expiresAt).format("YYYY-MM-DD") : "—"}
            </Descriptions.Item>
          </Descriptions>
          {subscriptionPermission.accessible ? (
            <Link href={`/wifi/billing/subscription?orgId=${profile.id}`}>
              <Button type="link" style={{ padding: 0, marginTop: 12, height: "auto" }}>
                Manage subscription
              </Button>
            </Link>
          ) : null}
        </>
      ) : (
        <Text type="secondary" style={{ fontSize: 13 }}>
          No subscription record is linked to this organization yet.
        </Text>
      )}
    </Card>
  );
};

export default SubscriptionSummaryCard;
