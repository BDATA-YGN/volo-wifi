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
import type { AuthEventOutcome, AuthEventsFormOptions, AuthEventView } from "../types";
import { VIEW_OPTIONS } from "../constant";
import { formatOutcomeLabel } from "../utils";

const { Text } = Typography;

type Props = {
  formOptions: AuthEventsFormOptions;
  search: string;
  orgId: string | null;
  showOrgFilter?: boolean;
  stationId: string | null;
  view: AuthEventView;
  outcome: AuthEventOutcome | null;
  autoRefresh: boolean;
  loading?: boolean;
  onSearchChange: (value: string) => void;
  onOrgChange: (orgId: string | null) => void;
  onStationChange: (stationId: string | null) => void;
  onViewChange: (view: AuthEventView) => void;
  onOutcomeChange: (outcome: AuthEventOutcome | null) => void;
  onAutoRefreshChange: (enabled: boolean) => void;
  onRefresh: () => void;
};

const AuthEventsToolbar: React.FC<Props> = ({
  formOptions,
  search,
  orgId,
  showOrgFilter = false,
  stationId,
  view,
  outcome,
  autoRefresh,
  loading,
  onSearchChange,
  onOrgChange,
  onStationChange,
  onViewChange,
  onOutcomeChange,
  onAutoRefreshChange,
  onRefresh,
}) => (
  <div className="flex flex-col gap-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Segmented
        value={view}
        onChange={(v) => onViewChange(v as AuthEventView)}
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
          placeholder="Tenant (via credentials)"
          style={{ minWidth: 220 }}
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
        placeholder="Station / Site"
        style={{ minWidth: 220 }}
        value={stationId ?? undefined}
        optionFilterProp="label"
        onChange={(v) => onStationChange(v ?? null)}
        options={(formOptions.stations ?? []).map((s) => ({
          value: s.id,
          label: `${s.name} (${s.code})`,
        }))}
      />
      <Select
        allowClear
        placeholder="Outcome"
        style={{ width: 130 }}
        value={outcome ?? undefined}
        onChange={(v) => onOutcomeChange(v ?? null)}
        options={(["ACCEPT", "REJECT", "UNKNOWN"] as AuthEventOutcome[]).map((o) => ({
          value: o,
          label: formatOutcomeLabel(o),
        }))}
      />
      <Input
        allowClear
        prefix={<SearchOutlined />}
        placeholder="Username, client MAC, NAS ID, site…"
        style={{ minWidth: 260, flex: 1 }}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </div>
  </div>
);

export default AuthEventsToolbar;
