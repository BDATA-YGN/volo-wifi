"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Button,
  Descriptions,
  Drawer,
  Spin,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type {
  AccessTokenDetail,
  AccessTokenRecord,
  CaptiveSessionPreview,
  CredentialLifecycleAction,
} from "../types";
import { formatWifiDateTime, maskVoucherToken } from "@/features/wifi/shared/format";
import { STATUS_COLOR } from "../constant";
import { formatMoney, formatStatusLabel } from "../utils";

const { Text, Title, Paragraph } = Typography;

type Props = {
  open: boolean;
  tokenId: string | null;
  currency: string;
  fallback?: AccessTokenRecord | null;
  onClose: () => void;
  onRevoke: (record: AccessTokenRecord) => void;
  onApplyAction: (record: AccessTokenRecord, action: CredentialLifecycleAction) => void;
  loadToken: (id: string) => Promise<AccessTokenDetail>;
};

const TokenDetailDrawer: React.FC<Props> = ({
  open,
  tokenId,
  currency,
  fallback,
  onClose,
  onRevoke,
  onApplyAction,
  loadToken,
}) => {
  const [token, setToken] = useState<AccessTokenDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !tokenId) {
      setToken(null);
      return;
    }

    if (fallback?.id === tokenId) {
      setToken(fallback as AccessTokenDetail);
    }

    setLoading(true);
    void loadToken(tokenId)
      .then(setToken)
      .catch(() => {
        if (fallback?.id === tokenId) setToken(fallback as AccessTokenDetail);
      })
      .finally(() => setLoading(false));
  }, [open, tokenId, fallback, loadToken]);

  const row = token;
  const actions = row?.actions;
  const captiveSessions = row?.captiveSessions ?? [];
  const captiveSessionsTotal =
    row?.captiveSessionsTotal ?? row?.captiveSessionCount ?? captiveSessions.length;
  const captiveSessionsTruncated = row?.captiveSessionsTruncated ?? false;

  const sessionColumns: ColumnsType<CaptiveSessionPreview> = [
    {
      title: "Username / token",
      dataIndex: "username",
      render: (username: string) => (
        <Text code style={{ fontSize: 11 }}>
          {username}
        </Text>
      ),
    },
    {
      title: "IP",
      dataIndex: "ip",
      width: 120,
      render: (value: string | null) => value ?? "—",
    },
    {
      title: "MAC",
      dataIndex: "mac",
      width: 150,
      render: (value: string | null) =>
        value ? (
          <Text code style={{ fontSize: 11 }}>
            {value}
          </Text>
        ) : (
          "—"
        ),
    },
    {
      title: "Started",
      dataIndex: "createdAt",
      width: 130,
      render: (value: string) => formatWifiDateTime(value),
    },
  ];

  return (
    <Drawer
      title="Access token details"
      size={560}
      open={open}
      onClose={onClose}
      destroyOnClose
      extra={
        row && actions ? (
          <div className="flex flex-wrap gap-2 justify-end">
            {actions.canUnlock ? (
              <Button size="small" onClick={() => onApplyAction(row, "unlock")}>
                Unlock
              </Button>
            ) : null}
            {actions.canPause ? (
              <Button size="small" onClick={() => onApplyAction(row, "pause")}>
                Pause
              </Button>
            ) : null}
            {actions.canRevertToSold ? (
              <Button size="small" onClick={() => onApplyAction(row, "revertToSold")}>
                Revert to sold
              </Button>
            ) : null}
            {actions.canRevoke ? (
              <Button danger size="small" onClick={() => onRevoke(row)}>
                Revoke
              </Button>
            ) : null}
          </div>
        ) : null
      }
    >
      <Spin spinning={loading}>
        {row ? (
          <>
            <div className="mb-4">
              {row.token ? (
                <Text
                  code
                  copyable={{
                    text: row.token,
                    tooltips: ["Copy code", "Copied"],
                  }}
                  style={{ fontSize: 13 }}
                >
                  {maskVoucherToken(row.token)}
                </Text>
              ) : null}
              <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 8 }}>
                {row.plan.name} · {row.station?.code ?? "No site"}
              </Paragraph>
              <Tag color={STATUS_COLOR[row.status]}>{formatStatusLabel(row.status)}</Tag>
            </div>

            {actions?.revokeBlockedReason && !actions.canRevoke ? (
              <Alert
                type="info"
                showIcon
                className="mb-3"
                title={actions.revokeBlockedReason}
              />
            ) : null}

            <Descriptions column={1} size="small" bordered className="mb-4">
              <Descriptions.Item label="Plan">
                <Tag style={{ fontFamily: "monospace" }}>{row.plan.code}</Tag> {row.plan.name}
              </Descriptions.Item>
              <Descriptions.Item label="Site">
                {row.station ? `${row.station.code} — ${row.station.name}` : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Sale">
                {row.sale ? (
                  <Link href="/wifi/commerce/transactions/orders">
                    {row.sale.order.orderNo} ·{" "}
                    {formatMoney(row.sale.lineTotal, row.sale.order.currency || currency)}
                  </Link>
                ) : (
                  "—"
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Sold at">
                {row.soldAt ? formatWifiDateTime(row.soldAt) : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Activated">
                {row.activatedAt ? formatWifiDateTime(row.activatedAt) : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Expires">
                {row.expiresAt ? formatWifiDateTime(row.expiresAt) : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Captive sessions">
                {(row.captiveSessionCount ?? 0) > 0 ? row.captiveSessionCount : "—"}
              </Descriptions.Item>
            </Descriptions>

            {captiveSessions.length > 0 ? (
              <>
                <Title level={5}>Captive portal sessions</Title>
                <Table<CaptiveSessionPreview>
                  size="small"
                  rowKey="id"
                  pagination={false}
                  columns={sessionColumns}
                  dataSource={captiveSessions}
                  className="mb-2"
                />
                {captiveSessionsTruncated ? (
                  <Alert
                    type="info"
                    showIcon
                    message={`Showing latest ${captiveSessions.length} of ${captiveSessionsTotal} sessions`}
                  />
                ) : null}
              </>
            ) : (
              <Paragraph type="secondary">No captive portal sessions recorded yet.</Paragraph>
            )}
          </>
        ) : null}
      </Spin>
    </Drawer>
  );
};

export default TokenDetailDrawer;
