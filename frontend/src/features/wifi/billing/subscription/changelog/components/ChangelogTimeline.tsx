"use client";

import React from "react";
import { Empty, Tag, Timeline, Typography } from "antd";
import type { ChangelogEntry } from "../types";
import { CHANGE_TYPE_COLOR, TIER_CODE_COLORS } from "../constant";
import { formatDateTime } from "../../../tier-rates/platform/utils";
import { describeChangelogEntry, formatChangeType } from "../utils";

const { Text } = Typography;

type Props = {
  entries: ChangelogEntry[];
  loading?: boolean;
  currency?: string;
};

function EntryContent({ entry, currency }: { entry: ChangelogEntry; currency: string }) {
  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <Tag color={CHANGE_TYPE_COLOR[entry.changeType] ?? "default"}>
          {formatChangeType(entry.changeType)}
        </Tag>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {formatDateTime(entry.createdAt)}
        </Text>
        {entry.stationSize ? (
          <Tag color={TIER_CODE_COLORS[entry.stationSize.code] ?? "default"}>
            {entry.stationSize.code}
          </Tag>
        ) : null}
      </div>
      <Text style={{ fontSize: 13 }}>{describeChangelogEntry(entry, currency)}</Text>
      {entry.reason ? (
        <div className="mt-1">
          <Text type="secondary" style={{ fontSize: 12 }}>
            {entry.reason}
          </Text>
        </div>
      ) : null}
      <Text type="secondary" style={{ fontSize: 11 }}>
        by {entry.changedByAdmin.fullName || entry.changedByAdmin.username}
      </Text>
    </div>
  );
}

const ChangelogTimeline: React.FC<Props> = ({ entries, loading, currency = "MMK" }) => {
  if (!loading && entries.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="No changelog entries match the current filters."
      />
    );
  }

  return (
    <Timeline
      items={entries.map((entry) => ({
        key: entry.id,
        color: CHANGE_TYPE_COLOR[entry.changeType] ?? "blue",
        content: <EntryContent entry={entry} currency={currency} />,
      }))}
    />
  );
};

export default ChangelogTimeline;
