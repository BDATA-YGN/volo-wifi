"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Alert, Button, Space, Tag, Tooltip, Typography, theme } from "antd";
import { ClockCircleOutlined, SyncOutlined } from "@ant-design/icons";
import Link from "next/link";

import { getRetentionPreview } from "../query";
import type { RetentionPreview } from "../interface";

const RetentionBanner: React.FC = () => {
  const { token } = theme.useToken();
  const [info, setInfo] = useState<RetentionPreview | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getRetentionPreview();
      setInfo(res?.data as RetentionPreview);
    } catch {
      setInfo(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!info) return null;

  const expiredTotal = info.auditExpiredCount + info.loginExpiredCount;

  return (
    <Alert
      type={info.enabled ? "info" : "warning"}
      showIcon
      icon={<ClockCircleOutlined />}
      title={
        <Space size={8} wrap>
          <Typography.Text strong>
            {info.enabled ? "Log retention is active" : "Log retention is paused"}
          </Typography.Text>
          <Tag color={info.enabled ? "blue" : "default"} style={{ fontFamily: "monospace" }}>
            {info.cron}
          </Tag>
          <Tag>Audit: {info.auditRetentionDays || "∞"}d</Tag>
          <Tag>Login: {info.loginRetentionDays || "∞"}d</Tag>
          {expiredTotal > 0 ? (
            <Tooltip
              title={`${info.auditExpiredCount.toLocaleString()} audit rows + ${info.loginExpiredCount.toLocaleString()} login rows older than the retention window`}
            >
              <Tag color="orange">
                {expiredTotal.toLocaleString()} expired rows pending cleanup
              </Tag>
            </Tooltip>
          ) : (
            <Tag color="green">Nothing expired</Tag>
          )}
        </Space>
      }
      description={
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Adjust the schedule and retention values under
          <Link
            href="/system/settings"
            style={{ marginLeft: 4, color: token.colorPrimary }}
          >
            System → Settings → Operations
          </Link>
          .
        </Typography.Text>
      }
      action={
        <Button
          size="small"
          icon={<SyncOutlined spin={loading} />}
          onClick={() => void refresh()}
        >
          Recheck
        </Button>
      }
      style={{ borderRadius: token.borderRadiusLG }}
    />
  );
};

export default RetentionBanner;
