"use client";

import React from "react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Grid,
  Progress,
  Space,
  Tag,
  theme,
  Tooltip,
  Typography,
  Upload,
  message as antMessage,
} from "antd";
import {
  CameraOutlined,
  CheckCircleFilled,
  MailOutlined,
  PhoneOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from "@ant-design/icons";
import type { UploadChangeParam } from "antd/es/upload";
import CacheImage from "@/common/components/@bdata/CacheImage";
import dayjs from "dayjs";
import { UserProfile, computeProfileCompletion } from "./profile";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

interface Props {
  profile: UserProfile;
  uploading?: boolean;
  onAvatarSelected: (url: string) => void;
}

const formatDate = (value?: string | Date) => {
  if (!value) return "—";
  return dayjs(value).format("MMM D, YYYY · HH:mm");
};

const AVATAR_SIZE = 96;
const COVER_HEIGHT = 88;

const ProfileHero: React.FC<Props> = ({ profile, uploading, onAvatarSelected }) => {
  const { token } = theme.useToken();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const completion = computeProfileCompletion(profile);

  const handleChange = (info: UploadChangeParam) => {
    if (info.file.status === "done") {
      const response = info.file.response;
      if (response?.data?.filePath) {
        onAvatarSelected(`/${response.data.filePath}`);
        antMessage.success("Profile image uploaded");
      } else {
        antMessage.error("Upload completed but no file path returned");
      }
    } else if (info.file.status === "error") {
      antMessage.error("Failed to upload image");
    }
  };

  const actionUrl = "/uploads/image?isPublic=true&category=default&type=image";

  const avatarBlock = (
    <div
      style={{
        position: "relative",
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        flex: "0 0 auto",
      }}
    >
      <Badge
        dot
        status={profile.isOnline ? "success" : "default"}
        offset={[-10, AVATAR_SIZE - 14]}
        styles={{
          indicator: {
            width: 12,
            height: 12,
            boxShadow: `0 0 0 3px ${token.colorBgContainer}`,
          },
        }}
      >
        <Upload
          name="general"
          listType="picture-circle"
          className="profile-hero-upload"
          showUploadList={false}
          action={actionUrl}
          onChange={handleChange}
          accept="image/*"
          progress={{ strokeWidth: 3, showInfo: false }}
          beforeUpload={(file) => {
            const isImg = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
            if (!isImg) {
              antMessage.error("Only JPG/PNG/WebP files are allowed");
              return Upload.LIST_IGNORE;
            }
            if (file.size / 1024 / 1024 > 2) {
              antMessage.error("Image must be smaller than 2MB");
              return Upload.LIST_IGNORE;
            }
            return true;
          }}
        >
          <div
            style={{
              width: AVATAR_SIZE,
              height: AVATAR_SIZE,
              borderRadius: "50%",
              overflow: "hidden",
              border: `3px solid ${token.colorBgContainer}`,
              background: token.colorBgContainer,
              boxShadow: token.boxShadowSecondary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {profile.avatar ? (
              <CacheImage
                imageUrl={profile.avatar}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <Avatar
                size={AVATAR_SIZE - 6}
                icon={<UserOutlined />}
                style={{ background: token.colorPrimary }}
              />
            )}
          </div>
        </Upload>
      </Badge>
      <Tooltip title="Change photo (max 2 MB)">
        <Button
          shape="circle"
          size="small"
          icon={<CameraOutlined />}
          loading={uploading}
          style={{
            position: "absolute",
            right: -2,
            bottom: -2,
            boxShadow: token.boxShadowSecondary,
            background: token.colorBgContainer,
          }}
        />
      </Tooltip>
    </div>
  );

  return (
    <Card
      variant="borderless"
      style={{ overflow: "hidden" }}
      styles={{ body: { padding: 0 } }}
    >
      {/* Cover band — purely decorative. Avatar overlaps its bottom edge. */}
      <div
        style={{
          height: COVER_HEIGHT,
          background: token.colorFillTertiary,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}
      />

      <div
        style={{
          padding: isMobile ? "0 16px 20px" : "0 24px 20px",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "center" : "flex-start",
          gap: isMobile ? 12 : 20,
          textAlign: isMobile ? "center" : "left",
        }}
      >
        <div
          style={{
            marginTop: -(AVATAR_SIZE / 2),
            flex: "0 0 auto",
          }}
        >
          {avatarBlock}
        </div>

        <div
          style={{
            flex: 1,
            minWidth: 0,
            paddingTop: isMobile ? 0 : 12,
            width: "100%",
          }}
        >
          <Space
            size={8}
            align="center"
            wrap
            style={{ justifyContent: isMobile ? "center" : "flex-start" }}
          >
            <Title level={4} style={{ margin: 0, lineHeight: 1.2 }}>
              {profile.fullName || profile.username || "Unnamed user"}
            </Title>
            {profile.isVerified ? (
              <Tooltip title="Verified account">
                <CheckCircleFilled style={{ color: token.colorSuccess, fontSize: 16 }} />
              </Tooltip>
            ) : null}
            {profile.isSuper ? <Tag color="gold">Super Admin</Tag> : null}
            {profile.roleName ? (
              <Tag color="blue" icon={<SafetyCertificateOutlined />}>
                {profile.roleName}
              </Tag>
            ) : null}
          </Space>

          <Space
            size={[16, 4]}
            wrap
            style={{
              marginTop: 6,
              justifyContent: isMobile ? "center" : "flex-start",
            }}
          >
            <Text
              type="secondary"
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <UserOutlined /> @{profile.username || "—"}
            </Text>
            {profile.email ? (
              <Text
                type="secondary"
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <MailOutlined /> {profile.email}
              </Text>
            ) : null}
            {profile.phoneNumber ? (
              <Text
                type="secondary"
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <PhoneOutlined /> {profile.phoneNumber}
              </Text>
            ) : null}
          </Space>

          <Space
            size={[16, 4]}
            wrap
            style={{
              marginTop: 6,
              justifyContent: isMobile ? "center" : "flex-start",
            }}
          >
            <Text type="secondary" style={{ fontSize: 12 }}>
              Joined {formatDate(profile.joinDate)}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Last login {formatDate(profile.lastLogin)}
            </Text>
            {profile.lastIp ? (
              <Text type="secondary" style={{ fontSize: 12 }}>
                IP {profile.lastIp}
              </Text>
            ) : null}
          </Space>
        </div>

        <div
          style={{
            flex: "0 0 auto",
            width: isMobile ? "100%" : 220,
            paddingTop: isMobile ? 0 : 12,
          }}
        >
          <Text type="secondary" style={{ fontSize: 12 }}>
            Profile completion
          </Text>
          <Progress
            percent={completion}
            size="small"
            strokeColor={
              completion >= 80
                ? token.colorSuccess
                : completion >= 50
                  ? token.colorPrimary
                  : token.colorWarning
            }
          />
        </div>
      </div>
    </Card>
  );
};

export default ProfileHero;
