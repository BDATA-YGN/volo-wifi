"use client";

import React from "react";
import { Button, Input, Select, Space, Switch } from "antd";
import { PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { PHASE_OPTIONS } from "../constant";
import type {
  PlanPoliciesFormOptions,
  PolicyPlan,
  PolicyVendorProfile,
  RadiusAttrPhase,
} from "../types";

type Props = {
  formOptions: PlanPoliciesFormOptions;
  search: string;
  orgId: string | null;
  showOrgFilter?: boolean;
  planId: string | null;
  vendorProfileId: string | null;
  phase: RadiusAttrPhase | null;
  globalOnly: boolean;
  plans: PolicyPlan[];
  loading?: boolean;
  onSearchChange: (value: string) => void;
  onOrgChange: (orgId: string | null) => void;
  onPlanChange: (planId: string | null) => void;
  onVendorChange: (id: string | null) => void;
  onPhaseChange: (phase: RadiusAttrPhase | null) => void;
  onGlobalOnlyChange: (value: boolean) => void;
  onRefresh: () => void;
  onAdd: () => void;
};

const PlanPoliciesToolbar: React.FC<Props> = ({
  formOptions,
  search,
  orgId,
  showOrgFilter = false,
  planId,
  vendorProfileId,
  phase,
  globalOnly,
  plans,
  loading,
  onSearchChange,
  onOrgChange,
  onPlanChange,
  onVendorChange,
  onPhaseChange,
  onGlobalOnlyChange,
  onRefresh,
  onAdd,
}) => (
  <div className="flex flex-col gap-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Space wrap>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Search attribute, plan, value…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{ width: 260 }}
        />
        {showOrgFilter ? (
          <Select
            showSearch
            allowClear
            placeholder="All tenants"
            value={orgId ?? undefined}
            onChange={(v) => onOrgChange(v ?? null)}
            style={{ minWidth: 180 }}
            optionFilterProp="label"
            options={formOptions.orgs.map((o) => ({
              value: o.id,
              label: `${o.code} — ${o.name}`,
            }))}
          />
        ) : null}
        <Select
          showSearch
          allowClear
          placeholder="All plans"
          value={planId ?? undefined}
          onChange={(v) => onPlanChange(v ?? null)}
          disabled={!orgId}
          style={{ minWidth: 160 }}
          optionFilterProp="label"
          options={plans.map((p) => ({
            value: p.id,
            label: `${p.code} — ${p.name}`,
          }))}
        />
        <Select
          showSearch
          allowClear
          placeholder="All vendor profiles"
          value={vendorProfileId ?? undefined}
          onChange={(v) => onVendorChange(v ?? null)}
          style={{ minWidth: 180 }}
          optionFilterProp="label"
          options={formOptions.vendorProfiles.map((v: PolicyVendorProfile) => ({
            value: v.id,
            label: v.name,
          }))}
        />
        <Select
          value={phase ?? ""}
          onChange={(v) => onPhaseChange((v as RadiusAttrPhase) || null)}
          style={{ minWidth: 150 }}
          options={PHASE_OPTIONS}
        />
      </Space>
      <Space>
        <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
          Refresh
        </Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
          Add policy
        </Button>
      </Space>
    </div>
    <label className="flex items-center gap-2 text-sm">
      <Switch size="small" checked={globalOnly} onChange={onGlobalOnlyChange} />
      Plan-wide rules only (exclude site overrides)
    </label>
  </div>
);

export default PlanPoliciesToolbar;
