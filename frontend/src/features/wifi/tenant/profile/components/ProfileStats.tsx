"use client";

import React from "react";
import { Card, Col, Progress, Row, Statistic } from "antd";
import { TeamOutlined, WifiOutlined } from "@ant-design/icons";
import type { TenantProfile } from "../types";

type Props = {
  profile?: TenantProfile | null;
  planCount?: number;
  loading?: boolean;
};

const ProfileStats: React.FC<Props> = ({ profile, planCount, loading }) => (
  <Row gutter={[16, 16]}>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Team members"
          value={profile?.memberCount ?? 0}
          prefix={<TeamOutlined style={{ color: "#1677ff" }} />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Active sites"
          value={profile?.activeStationCount ?? 0}
          prefix={<WifiOutlined style={{ color: "#52c41a" }} />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic loading={loading} title="Service plans" value={planCount ?? 0} />
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        {profile?.hasLicense ? (
          <div>
            <div className="mb-1 text-xs text-neutral-500">Licensed site usage</div>
            <div className="text-lg font-semibold">
              {profile.activeStationCount} / {profile.orgLicense?.stationLimit ?? 0}
            </div>
            <Progress
              percent={profile.usagePercent}
              size="small"
              status={profile.isAtLimit ? "exception" : profile.isNearLimit ? "active" : "normal"}
              showInfo={false}
            />
          </div>
        ) : (
          <Statistic loading={loading} title="Subscription" value="None" />
        )}
      </Card>
    </Col>
  </Row>
);

export default ProfileStats;
