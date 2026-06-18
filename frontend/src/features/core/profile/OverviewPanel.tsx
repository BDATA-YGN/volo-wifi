"use client";

import React from "react";
import { Card, Col, Row, Space, Statistic, Tag, theme, Typography } from "antd";
import {
  CalendarOutlined,
  ClockCircleOutlined,
  GlobalOutlined,
  IdcardOutlined,
  KeyOutlined,
  MailOutlined,
  PhoneOutlined,
  SafetyOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { UserProfile } from "./profile";

const { Text } = Typography;

interface Props {
  profile: UserProfile;
}

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value?: React.ReactNode }> = ({
  icon,
  label,
  value,
}) => {
  const { token } = theme.useToken();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 0",
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <Space size={10} style={{ color: token.colorTextSecondary }}>
        <span style={{ color: token.colorPrimary }}>{icon}</span>
        <Text type="secondary">{label}</Text>
      </Space>
      <Text strong>{value ?? "—"}</Text>
    </div>
  );
};

const OverviewPanel: React.FC<Props> = ({ profile }) => {
  const { token } = theme.useToken();

  const formattedJoin = profile.joinDate ? dayjs(profile.joinDate).format("MMM D, YYYY") : "—";
  const formattedLastLogin = profile.lastLogin
    ? dayjs(profile.lastLogin).fromNow?.() || dayjs(profile.lastLogin).format("MMM D, YYYY · HH:mm")
    : "—";

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} md={8}>
        <Card variant="borderless" styles={{ body: { padding: 16 } }}>
          <Statistic
            title="Status"
            value={profile.isOnline ? "Online" : "Offline"}
            styles={{
              content: {
                color: profile.isOnline ? token.colorSuccess : token.colorTextSecondary,
              },
            }}
            prefix={<ClockCircleOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} md={8}>
        <Card variant="borderless" styles={{ body: { padding: 16 } }}>
          <Statistic
            title="Permissions"
            value={profile.permissions.length}
            styles={{ content: { color: token.colorPrimary } }}
            prefix={<KeyOutlined />}
            suffix={<Text type="secondary" style={{ fontSize: 12 }}>role(s)</Text>}
          />
        </Card>
      </Col>
      <Col xs={24} md={8}>
        <Card variant="borderless" styles={{ body: { padding: 16 } }}>
          <Statistic
            title="Member since"
            value={formattedJoin}
            styles={{ content: { fontSize: 18, color: token.colorText } }}
            prefix={<CalendarOutlined />}
          />
        </Card>
      </Col>

      <Col xs={24} lg={14}>
        <Card title="Account information" variant="borderless">
          <InfoRow icon={<UserOutlined />} label="Full name" value={profile.fullName || "—"} />
          <InfoRow icon={<IdcardOutlined />} label="Username" value={`@${profile.username || "—"}`} />
          <InfoRow icon={<MailOutlined />} label="Email" value={profile.email || "—"} />
          <InfoRow icon={<PhoneOutlined />} label="Phone" value={profile.phoneNumber || "—"} />
          <InfoRow
            icon={<SafetyOutlined />}
            label="Role"
            value={profile.roleName ? <Tag color="blue">{profile.roleName}</Tag> : "—"}
          />
          <InfoRow
            icon={<IdcardOutlined />}
            label="Reporter code"
            value={profile.reporterCode || "—"}
          />
          <InfoRow
            icon={<UserOutlined />}
            label="Employment type"
            value={profile.employmentType ? <Tag>{profile.employmentType}</Tag> : "—"}
          />
        </Card>
      </Col>

      <Col xs={24} lg={10}>
        <Card title="Session" variant="borderless">
          <InfoRow icon={<ClockCircleOutlined />} label="Last login" value={formattedLastLogin} />
          <InfoRow icon={<GlobalOutlined />} label="Last IP address" value={profile.lastIp || "—"} />
          <InfoRow
            icon={<SafetyOutlined />}
            label="Verified"
            value={
              profile.isVerified ? (
                <Tag color="success">Yes</Tag>
              ) : (
                <Tag color="warning">No</Tag>
              )
            }
          />
          <InfoRow
            icon={<KeyOutlined />}
            label="Super admin"
            value={
              profile.isSuper ? <Tag color="gold">Yes</Tag> : <Tag>No</Tag>
            }
          />
        </Card>
      </Col>
    </Row>
  );
};

export default OverviewPanel;
