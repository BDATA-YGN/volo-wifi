"use client";

import React, { useEffect, useState } from "react";
import { Descriptions, Drawer, Spin, Tag, Typography } from "antd";
import dayjs from "dayjs";
import type { LiveSessionRecord } from "../types";
import { STATUS_COLOR, STATUS_LABEL } from "../constant";
import {
  formatBytes,
  formatMac,
  formatSessionDuration,
  sessionDisplayName,
} from "../utils";

const { Text, Title } = Typography;

type Props = {
  open: boolean;
  sessionId: string | null;
  fallback?: LiveSessionRecord | null;
  onClose: () => void;
  loadSession: (id: string) => Promise<LiveSessionRecord>;
};

const LiveSessionDetailDrawer: React.FC<Props> = ({
  open,
  sessionId,
  fallback,
  onClose,
  loadSession,
}) => {
  const [session, setSession] = useState<LiveSessionRecord | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !sessionId) {
      setSession(null);
      return;
    }

    if (fallback?.id === sessionId) {
      setSession(fallback);
    }

    setLoading(true);
    void loadSession(sessionId)
      .then(setSession)
      .catch(() => {
        if (fallback?.id === sessionId) setSession(fallback);
      })
      .finally(() => setLoading(false));
  }, [open, sessionId, fallback, loadSession]);

  const row = session;

  return (
    <Drawer
      title="Session details"
      size={520}
      open={open}
      onClose={onClose}
      destroyOnHidden
    >
      <Spin spinning={loading}>
        {row ? (
          <>
            <div className="mb-4">
              <Title level={5} style={{ margin: 0 }}>
                {sessionDisplayName(row)}
              </Title>
              <Tag color={STATUS_COLOR[row.status]} className="mt-2">
                {STATUS_LABEL[row.status]}
              </Tag>
            </div>

            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Acct-Session-Id">
                <Text code copyable>
                  {row.acctSessionId}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="User-Name">
                {row.userName ?? "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Calling-Station-Id">
                {formatMac(row.callingStationId)}
              </Descriptions.Item>
              <Descriptions.Item label="Framed-IP-Address">
                {row.framedIpAddress ?? "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Tenant">
                {row.org ? `${row.org.name} (${row.org.code})` : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Site">
                {row.station ? `${row.station.name} (${row.station.code})` : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Credential">
                {row.credential
                  ? row.credential.username ??
                    (row.credential.token
                      ? `${row.credential.token.slice(0, 8)}…`
                      : row.credential.id.slice(0, 8))
                  : "—"}
                {row.credential ? (
                  <Text type="secondary" className="ml-2" style={{ fontSize: 11 }}>
                    {row.credential.type} · {row.credential.status}
                  </Text>
                ) : null}
              </Descriptions.Item>
            </Descriptions>

            <Title level={5} style={{ marginTop: 24, marginBottom: 12 }}>
              NAS
            </Title>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="NAS-IP-Address">
                {row.nasIpAddress ?? "—"}
              </Descriptions.Item>
              <Descriptions.Item label="NAS-Identifier">
                {row.nasIdentifier ?? "—"}
              </Descriptions.Item>
            </Descriptions>

            <Title level={5} style={{ marginTop: 24, marginBottom: 12 }}>
              Accounting
            </Title>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Started">
                {dayjs(row.startedAt).format("YYYY-MM-DD HH:mm:ss")}
              </Descriptions.Item>
              <Descriptions.Item label="Last interim">
                {row.lastInterimAt
                  ? dayjs(row.lastInterimAt).format("YYYY-MM-DD HH:mm:ss")
                  : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Stopped">
                {row.stoppedAt
                  ? dayjs(row.stoppedAt).format("YYYY-MM-DD HH:mm:ss")
                  : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Session time">
                {formatSessionDuration(
                  row.sessionTimeSec,
                  row.startedAt,
                  row.stoppedAt,
                  row.status,
                  row.lastInterimAt,
                  row.createdAt
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Input / Output">
                {formatBytes(row.inputBytes)} / {formatBytes(row.outputBytes)}
              </Descriptions.Item>
              <Descriptions.Item label="Total bytes">
                {formatBytes(row.totalBytes)}
              </Descriptions.Item>
              <Descriptions.Item label="Terminate cause">
                {row.terminateCause ?? "—"}
              </Descriptions.Item>
            </Descriptions>
          </>
        ) : (
          !loading && <Text type="secondary">Session not found.</Text>
        )}
      </Spin>
    </Drawer>
  );
};

export default LiveSessionDetailDrawer;
