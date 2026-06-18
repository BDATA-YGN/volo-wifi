"use client";

import React from "react";
import {
  Button,
  Input,
  Select,
  Segmented,
  Space,
  Switch,
  Tooltip,
  Typography,
} from "antd";
import { ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import type { LiveSessionsFormOptions, RadiusAcctStatus, SessionView } from "../types";
import { STATUS_LABEL, VIEW_OPTIONS } from "../constant";

const { Text } = Typography;

type Props = {
  formOptions: LiveSessionsFormOptions;
  stations: LiveSessionsFormOptions["stations"];
  search: string;
  orgId: string | null;
  showOrgFilter?: boolean;
  stationId: string | null;
  view: SessionView;
  status: RadiusAcctStatus | null;
  autoRefresh: boolean;
  loading?: boolean;
  onSearchChange: (value: string) => void;
  onOrgChange: (orgId: string | null) => void;
  onStationChange: (stationId: string | null) => void;
  onViewChange: (view: SessionView) => void;
  onStatusChange: (status: RadiusAcctStatus | null) => void;
  onAutoRefreshChange: (enabled: boolean) => void;
  onRefresh: () => void;
};

const LiveSessionsToolbar: React.FC<Props> = ({
  formOptions,
  stations,
  search,
  orgId,
  showOrgFilter = false,
  stationId,
  view,
  status,
  autoRefresh,
  loading,
  onSearchChange,
  onOrgChange,
  onStationChange,
  onViewChange,
  onStatusChange,
  onAutoRefreshChange,
  onRefresh,
}) => (
  <div className="flex flex-col gap-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Segmented
        value={view}
        onChange={(v) => onViewChange(v as SessionView)}
        options={VIEW_OPTIONS}
      />
      <Space wrap>
        <Tooltip title="Poll every 30 seconds">
          <Space size={4}>
            <Switch size="small" checked={autoRefresh} onChange={onAutoRefreshChange} />
            <Text type="secondary" style={{ fontSize: 12 }}>
              Live refresh
            </Text>
          </Space>
        </Tooltip>
        <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
          Refresh
        </Button>
      </Space>
    </div>

    <div className="flex flex-wrap gap-2">
      {showOrgFilter ? (
        <Select
          allowClear
          showSearch
          placeholder="Tenant"
          style={{ minWidth: 200 }}
          value={orgId ?? undefined}
          optionFilterProp="label"
          onChange={(v) => onOrgChange(v ?? null)}
          options={formOptions.orgs.map((o) => ({
            value: o.id,
            label: `${o.name} (${o.code})`,
          }))}
        />
      ) : null}
      <Select
        allowClear
        showSearch
        placeholder="Site"
        style={{ minWidth: 180 }}
        value={stationId ?? undefined}
        disabled={!orgId}
        optionFilterProp="label"
        onChange={(v) => onStationChange(v ?? null)}
        options={stations.map((s) => ({
          value: s.id,
          label: `${s.name} (${s.code})`,
        }))}
      />
      <Select
        allowClear
        placeholder="Status"
        style={{ width: 130 }}
        value={status ?? undefined}
        onChange={(v) => onStatusChange(v ?? null)}
        options={(["START", "INTERIM", "STOP"] as RadiusAcctStatus[]).map((s) => ({
          value: s,
          label: STATUS_LABEL[s],
        }))}
      />
      <Input
        allowClear
        prefix={<SearchOutlined />}
        placeholder="User, MAC, IP, session ID…"
        style={{ minWidth: 240, flex: 1 }}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </div>
  </div>
);

export default LiveSessionsToolbar;
