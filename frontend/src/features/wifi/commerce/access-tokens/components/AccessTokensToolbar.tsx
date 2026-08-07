"use client";

import React from "react";
import { Button, Input, Select, Space } from "antd";
import { PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import type { CredentialStatus, SellableCatalog } from "../types";
import type { ResellerPickerOption } from "@/features/wifi/commerce/partners/workspace/types";
import { STATUS_OPTIONS } from "../constant";

type Props = {
  search: string;
  status: CredentialStatus | null;
  planId: string | null;
  stationId: string | null;
  resellerId: string | null;
  resellers?: ResellerPickerOption[];
  showPartnerFilter?: boolean;
  partnerLocked?: boolean;
  catalog?: SellableCatalog | null;
  loading?: boolean;
  issueDisabled?: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (status: CredentialStatus | null) => void;
  onPlanChange: (planId: string | null) => void;
  onStationChange: (stationId: string | null) => void;
  onPartnerChange: (resellerId: string | null) => void;
  onRefresh: () => void;
  onIssue: () => void;
};

const AccessTokensToolbar: React.FC<Props> = ({
  search,
  status,
  planId,
  stationId,
  resellerId,
  resellers = [],
  showPartnerFilter,
  partnerLocked,
  catalog,
  loading,
  issueDisabled,
  onSearchChange,
  onStatusChange,
  onPlanChange,
  onStationChange,
  onPartnerChange,
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
        style={{ width: 240 }}
      />
      {showPartnerFilter ? (
        <Select
          allowClear={!partnerLocked}
          disabled={partnerLocked}
          showSearch
          placeholder="Partner"
          value={resellerId}
          onChange={(value) => onPartnerChange(value ?? null)}
          optionFilterProp="label"
          style={{ width: 200 }}
          options={resellers.map((r) => ({
            value: r.id,
            label: `${r.name} (${r.code})`,
          }))}
        />
      ) : null}
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
