"use client";

import React, { useEffect, useState } from "react";
import { Alert, Descriptions, Drawer, Spin, Tag, Typography } from "antd";
import dayjs from "dayjs";
import type { AuthEventRecord } from "../types";
import { OUTCOME_COLOR } from "../constant";
import { formatMac, formatOutcomeLabel } from "../utils";

const { Text, Title } = Typography;

type Props = {
  open: boolean;
  eventId: string | null;
  fallback?: AuthEventRecord | null;
  onClose: () => void;
  loadEvent: (id: string) => Promise<AuthEventRecord>;
};

const AuthEventDetailDrawer: React.FC<Props> = ({
  open,
  eventId,
  fallback,
  onClose,
  loadEvent,
}) => {
  const [event, setEvent] = useState<AuthEventRecord | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !eventId) {
      setEvent(null);
      return;
    }

    if (fallback?.id === eventId) {
      setEvent(fallback);
    }

    setLoading(true);
    void loadEvent(eventId)
      .then(setEvent)
      .catch(() => {
        if (fallback?.id === eventId) setEvent(fallback);
      })
      .finally(() => setLoading(false));
  }, [open, eventId, fallback, loadEvent]);

  const row = event;

  return (
    <Drawer title="Auth event details" size={480} open={open} onClose={onClose} destroyOnClose>
      <Spin spinning={loading}>
        {row ? (
          <>
            <div className="mb-4">
              <Title level={5} style={{ margin: 0 }}>
                {row.username}
              </Title>
              <Tag color={OUTCOME_COLOR[row.outcome]} className="mt-2">
                {formatOutcomeLabel(row.outcome)}
              </Tag>
            </div>

            <Alert
              type="info"
              showIcon
              className="mb-4"
              message="Read-only audit record"
              description="Events are written by FreeRADIUS post-auth. Passwords are never stored or shown in the console."
            />

            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Event ID">
                <Text code copyable>
                  {row.id}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Auth time">
                {dayjs(row.authdate).format("YYYY-MM-DD HH:mm:ss")}
              </Descriptions.Item>
              <Descriptions.Item label="Username">
                <Text copyable>{row.username}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Calling-Station-Id">
                {formatMac(row.callingStationId)}
              </Descriptions.Item>
              <Descriptions.Item label="Called-Station-Id">
                {formatMac(row.calledStationId)}
              </Descriptions.Item>
              <Descriptions.Item label="Reply">{row.reply ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Class">{row.class ?? "—"}</Descriptions.Item>
            </Descriptions>
          </>
        ) : (
          !loading && <Text type="secondary">Event not found.</Text>
        )}
      </Spin>
    </Drawer>
  );
};

export default AuthEventDetailDrawer;
