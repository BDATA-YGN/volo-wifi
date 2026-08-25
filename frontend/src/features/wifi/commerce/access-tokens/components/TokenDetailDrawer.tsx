"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Button,
  Descriptions,
  Drawer,
  Popconfirm,
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
  RadiusSessionPreview,
} from "../types";
import { formatWifiDateTime } from "@/features/wifi/shared/format";
import {
  gateSessionLifecycleActions,
  useCanManageTokenSessionLifecycle,
} from "@/features/wifi/shared/session-lifecycle-role";
import {
  VoucherCodeText,
  voucherCodeFontClassName,
  voucherCodeTextStyle,
} from "@/features/wifi/shared/components/VoucherCodeText";
import { STATUS_COLOR } from "../constant";
import {
  formatBytes,
  formatMoney,
  formatSessionDuration,
  formatStatusLabel,
  accountingStartAt,
} from "../utils";

const { Text, Title, Paragraph } = Typography;

type Props = {
  open: boolean;
  tokenId: string | null;
  currency: string;
  fallback?: AccessTokenRecord | null;
  onClose: () => void;
  onRevoke: (record: AccessTokenRecord) => void;
  onApplyAction: (record: AccessTokenRecord, action: CredentialLifecycleAction) => void;
  onDeleteSession: (
    record: AccessTokenRecord,
    sessionId: string,
    source: "hot" | "archive" | "captive"
  ) => Promise<void>;
  loadToken: (id: string) => Promise<AccessTokenDetail>;
};

const RADIUS_STATUS_COLOR: Record<string, string> = {
  START: "processing",
  INTERIM: "blue",
  STOP: "default",
};

const TokenDetailDrawer: React.FC<Props> = ({
  open,
  tokenId,
  currency,
  fallback,
  onClose,
  onRevoke,
  onApplyAction,
  onDeleteSession,
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
  const canManageSessionLifecycle = useCanManageTokenSessionLifecycle();
  const actions = gateSessionLifecycleActions(row?.actions, canManageSessionLifecycle);
  const captiveSessions = row?.captiveSessions ?? [];
  const captiveSessionsTotal =
    row?.captiveSessionsTotal ?? row?.captiveSessionCount ?? captiveSessions.length;
  const captiveSessionsTruncated = row?.captiveSessionsTruncated ?? false;
  const radiusSessions = row?.radiusSessions ?? [];
  const radiusSessionsTotal = row?.radiusSessionsTotal ?? radiusSessions.length;
  const radiusSessionsTruncated = row?.radiusSessionsTruncated ?? false;
  const sessionsMeta = row?.sessionsMeta ?? null;
  const hasAnySessions = captiveSessions.length > 0 || radiusSessions.length > 0;
  const canDeleteSessions = Boolean(actions?.canDeleteSessions);

  const captiveColumns: ColumnsType<CaptiveSessionPreview> = [
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
      title: "Device (MAC)",
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
      title: "Login",
      dataIndex: "createdAt",
      width: 130,
      render: (value: string) => formatWifiDateTime(value),
    },
    ...(canDeleteSessions
      ? [
          {
            title: "",
            key: "delete",
            width: 72,
            render: (_: unknown, record: CaptiveSessionPreview) => (
              <Popconfirm
                title="Delete this session row?"
                okText="Delete"
                okButtonProps={{ danger: true }}
                onConfirm={() =>
                  row ? onDeleteSession(row, record.id, "captive") : Promise.resolve()
                }
              >
                <Button type="link" danger size="small">
                  Delete
                </Button>
              </Popconfirm>
            ),
          },
        ]
      : []),
  ];

  const radiusColumns: ColumnsType<RadiusSessionPreview> = [
    {
      title: "Status",
      dataIndex: "status",
      width: 90,
      render: (status: string, record) => (
        <div className="flex flex-col gap-1">
          <Tag color={RADIUS_STATUS_COLOR[status] ?? "default"} style={{ margin: 0 }}>
            {status}
          </Tag>
          {record.source === "archive" ? (
            <Tag style={{ margin: 0, fontSize: 10 }}>Archived</Tag>
          ) : null}
        </div>
      ),
    },
    {
      title: "Device / IP",
      key: "device",
      width: 150,
      render: (_, record) => (
        <div>
          <div>
            {record.callingStationId ? (
              <Text code style={{ fontSize: 11 }}>
                {record.callingStationId}
              </Text>
            ) : (
              "—"
            )}
          </div>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {record.framedIpAddress ?? "—"}
          </Text>
        </div>
      ),
    },
    {
      title: "NAS",
      key: "nas",
      width: 120,
      render: (_, record) => (
        <Text type="secondary" style={{ fontSize: 11 }}>
          {record.nasIdentifier || record.nasIpAddress || "—"}
        </Text>
      ),
    },
    {
      title: "Login → Logout",
      key: "window",
      width: 160,
      render: (_, record) => (
        <div style={{ fontSize: 12 }}>
          <div>{formatWifiDateTime(accountingStartAt(record.startedAt, record.createdAt))}</div>
          <Text type="secondary">
            → {record.stoppedAt
              ? formatWifiDateTime(record.lastInterimAt ?? record.stoppedAt)
              : "online"}
          </Text>
        </div>
      ),
    },
    {
      title: "Duration",
      key: "duration",
      width: 90,
      render: (_, record) =>
        formatSessionDuration(
          record.sessionTimeSec,
          record.startedAt,
          record.stoppedAt,
          record.status,
          record.createdAt,
          record.lastInterimAt
        ),
    },
    {
      title: "Data",
      key: "data",
      width: 110,
      render: (_, record) => (
        <div style={{ fontSize: 12 }}>
          <div>{formatBytes(record.totalBytes)}</div>
          <Text type="secondary" style={{ fontSize: 11 }}>
            ↓{formatBytes(record.outputBytes)} ↑{formatBytes(record.inputBytes)}
          </Text>
        </div>
      ),
    },
    ...(canDeleteSessions
      ? [
          {
            title: "",
            key: "delete",
            width: 72,
            render: (_: unknown, record: RadiusSessionPreview) => (
              <Popconfirm
                title="Delete this session row?"
                okText="Delete"
                okButtonProps={{ danger: true }}
                onConfirm={() =>
                  row ? onDeleteSession(row, record.id, record.source) : Promise.resolve()
                }
              >
                <Button type="link" danger size="small">
                  Delete
                </Button>
              </Popconfirm>
            ),
          },
        ]
      : []),
  ];

  return (
    <Drawer
      title="Access token details"
      size={720}
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
            {actions.canClearSessions ? (
              <Button size="small" onClick={() => onApplyAction(row, "clearSessions")}>
                Fix Session
              </Button>
            ) : null}
            {actions.canRestoreActivated ? (
              <Button size="small" type="primary" onClick={() => onApplyAction(row, "restoreActivated")}>
                Restore to activated
              </Button>
            ) : null}
            {actions.canAllowNewDevice ? (
              <Button size="small" type="primary" onClick={() => onApplyAction(row, "allowNewDevice")}>
                Allow new device
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
                <VoucherCodeText
                  value={row.token}
                  copyable
                  style={{ fontSize: 16, fontWeight: 700 }}
                />
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
                message={actions.revokeBlockedReason}
              />
            ) : null}

            <Descriptions column={1} size="small" bordered className="mb-4">
              <Descriptions.Item label="Plan">
                <Tag className={voucherCodeFontClassName} style={voucherCodeTextStyle}>
                  {row.plan.code}
                </Tag>{" "}
                {row.plan.name}
              </Descriptions.Item>
              <Descriptions.Item label="Site">
                {row.station ? (
                  <>
                    <VoucherCodeText value={row.station.code} />
                    {` — ${row.station.name}`}
                  </>
                ) : (
                  "—"
                )}
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
              <Descriptions.Item label="First login">
                {row.firstLoginAt ? formatWifiDateTime(row.firstLoginAt) : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Activated at">
                {row.activatedAt ? formatWifiDateTime(row.activatedAt) : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Expires">
                {row.expiresAt ? formatWifiDateTime(row.expiresAt) : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Captive logins">
                {(row.captiveSessionCount ?? captiveSessionsTotal) > 0
                  ? row.captiveSessionCount ?? captiveSessionsTotal
                  : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="RADIUS sessions">
                {radiusSessionsTotal > 0 ? radiusSessionsTotal : "—"}
              </Descriptions.Item>
            </Descriptions>

            <Title level={5} style={{ marginTop: 8 }}>
              Network sessions (RADIUS)
            </Title>
            <Paragraph type="secondary" style={{ marginBottom: 12, fontSize: 13 }}>
              Usage time, data, login/logout, and device from accounting records
              {row.radiusSessionsArchiveTotal
                ? ` · ${row.radiusSessionsArchiveTotal} archived`
                : ""}
              .
            </Paragraph>
            {radiusSessions.length > 0 ? (
              <>
                <Table<RadiusSessionPreview>
                  size="small"
                  rowKey={(r) => `${r.source}-${r.id}`}
                  pagination={false}
                  columns={radiusColumns}
                  dataSource={radiusSessions}
                  scroll={{ x: canDeleteSessions ? 800 : 720 }}
                  className="mb-2"
                />
                {radiusSessionsTruncated ? (
                  <Alert
                    type="info"
                    showIcon
                    className="mb-4"
                    message={`Showing latest ${radiusSessions.length} of ${radiusSessionsTotal} RADIUS sessions`}
                  />
                ) : null}
              </>
            ) : null}

            <Title level={5}>Captive portal logins</Title>
            <Paragraph type="secondary" style={{ marginBottom: 12, fontSize: 13 }}>
              Portal handoff records (IP / MAC at login). These do not include data usage.
            </Paragraph>
            {captiveSessions.length > 0 ? (
              <>
                <Table<CaptiveSessionPreview>
                  size="small"
                  rowKey="id"
                  pagination={false}
                  columns={captiveColumns}
                  dataSource={captiveSessions}
                  className="mb-2"
                />
                {captiveSessionsTruncated ? (
                  <Alert
                    type="info"
                    showIcon
                    className="mb-4"
                    message={`Showing latest ${captiveSessions.length} of ${captiveSessionsTotal} captive logins`}
                  />
                ) : null}
              </>
            ) : null}

            {!hasAnySessions ? (
              <Alert
                type="info"
                showIcon
                className="mt-2"
                message={
                  sessionsMeta?.emptyStateMessage ??
                  "No portal or network sessions recorded yet."
                }
                description={
                  sessionsMeta && row.firstLoginAt
                    ? `Retention: captive ${sessionsMeta.captiveRetentionDays}d · RADIUS hot ${sessionsMeta.radiusHotRetentionDays}d · archive ${sessionsMeta.radiusArchiveRetentionDays}d.`
                    : undefined
                }
              />
            ) : null}
          </>
        ) : null}
      </Spin>
    </Drawer>
  );
};

export default TokenDetailDrawer;
