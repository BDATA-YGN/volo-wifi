"use client";

import React from "react";
import Link from "next/link";
import { Empty, Tag, Timeline, Typography } from "antd";
import type { SubscriptionHistoryEntry } from "../types";
import { formatDateTime } from "../../tier-rates/platform/utils";

const { Text } = Typography;

type Props = {
  entries: SubscriptionHistoryEntry[];
  orgId: string;
};

function describeChange(entry: SubscriptionHistoryEntry): string {
  if (entry.changeType === "STATION_LIMIT_CHANGE") {
    return `Site limit ${entry.previousStationLimit ?? "—"} → ${entry.newStationLimit ?? "—"}`;
  }
  if (entry.changeType === "STATUS_CHANGE") {
    return `Status ${entry.previousStatus ?? "—"} → ${entry.newStatus ?? "—"}`;
  }
  return entry.changeType.replace(/_/g, " ");
}

function HistoryEntryContent({ item }: { item: SubscriptionHistoryEntry }) {
  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center gap-2">
        <Tag>{item.changeType.replace(/_/g, " ")}</Tag>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {formatDateTime(item.createdAt)}
        </Text>
      </div>
      <Text style={{ fontSize: 13 }}>{describeChange(item)}</Text>
      {item.reason ? (
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {item.reason}
          </Text>
        </div>
      ) : null}
      <Text type="secondary" style={{ fontSize: 11 }}>
        by {item.changedByAdmin.fullName || item.changedByAdmin.username}
      </Text>
    </div>
  );
}

const RecentHistoryPanel: React.FC<Props> = ({ entries, orgId }) => (
  <div>
    {entries.length === 0 ? (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="No subscription changes recorded yet."
      />
    ) : (
      <Timeline
        items={entries.map((item) => ({
          key: item.id,
          content: <HistoryEntryContent item={item} />,
        }))}
      />
    )}
    {entries.length > 0 ? (
      <Link
        href={`/wifi/billing/subscription/changelog?orgId=${orgId}`}
        className="ant-btn ant-btn-link"
        style={{ padding: 0, marginTop: 8 }}
      >
        View full changelog
      </Link>
    ) : null}
  </div>
);

export default RecentHistoryPanel;
