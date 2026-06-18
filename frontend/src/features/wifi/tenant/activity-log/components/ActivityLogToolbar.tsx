"use client";

import React from "react";
import { Button, Input, Segmented, Select, Space } from "antd";
import { ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import type { ActivityLogFormOptions, ActivityLogView } from "../types";
import { VIEW_OPTIONS } from "../constant";
import { formatActionLabel, formatEntityLabel } from "../utils";

type Props = {
  formOptions: ActivityLogFormOptions;
  search: string;
  view: ActivityLogView;
  action: string | null;
  entity: string | null;
  loading?: boolean;
  onSearchChange: (value: string) => void;
  onViewChange: (view: ActivityLogView) => void;
  onActionChange: (action: string | null) => void;
  onEntityChange: (entity: string | null) => void;
  onRefresh: () => void;
};

const ActivityLogToolbar: React.FC<Props> = ({
  formOptions,
  search,
  view,
  action,
  entity,
  loading,
  onSearchChange,
  onViewChange,
  onActionChange,
  onEntityChange,
  onRefresh,
}) => (
  <div className="flex flex-col gap-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Segmented
        value={view}
        onChange={(v) => onViewChange(v as ActivityLogView)}
        options={VIEW_OPTIONS}
      />
      <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
        Refresh
      </Button>
    </div>

    <Space wrap>
      <Select
        allowClear
        placeholder="Action"
        style={{ minWidth: 180 }}
        value={action ?? undefined}
        onChange={(v) => onActionChange(v ?? null)}
        options={formOptions.actions.map((a) => ({
          value: a,
          label: formatActionLabel(a),
        }))}
      />
      <Select
        allowClear
        placeholder="Entity"
        style={{ minWidth: 140 }}
        value={entity ?? undefined}
        onChange={(v) => onEntityChange(v ?? null)}
        options={formOptions.entities.map((e) => ({
          value: e,
          label: formatEntityLabel(e),
        }))}
      />
      <Input
        allowClear
        prefix={<SearchOutlined />}
        placeholder="Actor, action, entity, IP…"
        style={{ minWidth: 260, flex: 1 }}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </Space>
  </div>
);

export default ActivityLogToolbar;
