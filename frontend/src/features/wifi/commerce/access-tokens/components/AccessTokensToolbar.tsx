"use client";

import React from "react";
import { Button, Input, Select, Space } from "antd";
import { PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import type { CredentialStatus, SellableCatalog } from "../types";
import { STATUS_OPTIONS } from "../constant";

type Props = {
  search: string;
  status: CredentialStatus | null;
  planId: string | null;
  stationId: string | null;
  catalog?: SellableCatalog | null;
  loading?: boolean;
  issueDisabled?: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (status: CredentialStatus | null) => void;
  onPlanChange: (planId: string | null) => void;
  onStationChange: (stationId: string | null) => void;
  onRefresh: () => void;
  onIssue: () => void;
};

const AccessTokensToolbar: React.FC<Props> = ({
  search,
  status,
  planId,
  stationId,
  catalog,
  loading,
  issueDisabled,
  onSearchChange,
  onStatusChange,
  onPlanChange,
  onStationChange,
  onRefresh,
  onIssue,
}) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <Space wrap>
      <Input
        allowClear
        prefix={<SearchOutlined />}
        placeholder="Search token, plan, site…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        style={{ width: 260 }}
      />
      <Select
        allowClear
        placeholder="Status"
        value={status}
        onChange={onStatusChange}
        style={{ width: 130 }}
        options={STATUS_OPTIONS}
      />
      <Select
        allowClear
        showSearch
        placeholder="Plan"
        value={planId}
        onChange={onPlanChange}
        optionFilterProp="label"
        style={{ width: 180 }}
        options={(catalog?.plans ?? []).map((p) => ({
          value: p.id,
          label: `${p.code} — ${p.name}`,
        }))}
      />
      <Select
        allowClear
        showSearch
        placeholder="Site"
        value={stationId}
        onChange={onStationChange}
        optionFilterProp="label"
        style={{ width: 180 }}
        options={(catalog?.stations ?? []).map((s) => ({
          value: s.id,
          label: `${s.code} — ${s.name}`,
        }))}
      />
    </Space>
    <Space>
      <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
        Refresh
      </Button>
      <Button type="primary" icon={<PlusOutlined />} onClick={onIssue} disabled={issueDisabled}>
        Issue tokens
      </Button>
    </Space>
  </div>
);

export default AccessTokensToolbar;
