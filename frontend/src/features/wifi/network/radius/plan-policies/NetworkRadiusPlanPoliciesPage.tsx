"use client";

import React, { useEffect, useState } from "react";
import { getApiErrorMessage } from "@/common/exceptions/handleApiError";
import { Alert, App, Card, Typography, theme } from "antd";
import { SafetyOutlined } from "@ant-design/icons";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import WifiOrgScopeBar from "@/features/wifi/shared/components/WifiOrgScopeBar";
import { useNetworkRadiusPlanPolicies } from "./useNetworkRadiusPlanPolicies";
import type {
  PlanPoliciesFormOptions,
  PlanPolicyFormValues,
  PlanPolicyRecord,
  RadiusAttrPhase,
} from "./types";
import PlanPoliciesStats from "./components/PlanPoliciesStats";
import PlanPoliciesToolbar from "./components/PlanPoliciesToolbar";
import PlanPoliciesTable from "./components/PlanPoliciesTable";
import PlanPolicyFormDrawer from "./components/PlanPolicyFormDrawer";

const { Paragraph } = Typography;

const emptyFormOptions: PlanPoliciesFormOptions = {
  orgs: [],
  plans: [],
  stations: [],
  vendorProfiles: [],
  catalogAttributes: [],
};

const NetworkRadiusPlanPoliciesPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const { token } = theme.useToken();

  const [search, setSearchLocal] = useState("");
  const [formOptions, setFormOptions] = useState<PlanPoliciesFormOptions>(emptyFormOptions);
  const [filterPlans, setFilterPlans] = useState<PlanPoliciesFormOptions["plans"]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<PlanPolicyRecord | null>(null);
  const [saving, setSaving] = useState(false);

  const {
    list,
    meta,
    loading,
    error,
    params,
    refresh,
    setSearch,
    setPagination,
    patchParams,
    loadFormOptions,
    createPolicy,
    updatePolicy,
    deletePolicy,
    orgId,
    selectOrg,
    showOrgSwitcher,
    needsOrg,
    contextReady,
    memberships,
    canSwitchOrg,
  } = useNetworkRadiusPlanPolicies();

  useEffect(() => {
    if (!orgId) return;
    void loadFormOptions(orgId).then((opts) => {
      setFormOptions(opts);
      setFilterPlans(opts.plans);
    });
  }, [loadFormOptions, orgId]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search, setSearch]);

  const openCreate = () => {
    setEditing(null);
    setDrawerOpen(true);
  };

  const openEdit = (record: PlanPolicyRecord) => {
    setEditing(record);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    if (saving) return;
    setDrawerOpen(false);
    setEditing(null);
  };

  const handleOrgFilterChange = (orgId: string | null) => {
    patchParams({ orgId: orgId ?? undefined, planId: undefined, page: 1 });
  };

  const handleSubmit = async (values: PlanPolicyFormValues) => {
    setSaving(true);
    try {
      if (editing) {
        await updatePolicy(editing.id, values);
        message.success("Plan RADIUS rule updated");
      } else {
        await createPolicy(values);
        message.success("Plan RADIUS rule added");
      }
      setDrawerOpen(false);
      setEditing(null);
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, "Failed to save rule"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (record: PlanPolicyRecord) => {
    modal.confirm({
      title: `Remove rule for ${record.attributeName}?`,
      content: `Plan: ${record.plan.name}`,
      okText: "Remove",
      okType: "danger",
      onOk: async () => {
        try {
          await deletePolicy(record.id);
          message.success("Rule removed");
        } catch (err: unknown) {
          message.error(getApiErrorMessage(err, "Failed to remove rule"));
        }
      },
    });
  };

  return (
    <div className="p-0">
      <CommonHeader icon={SafetyOutlined} />

      <div
        style={{
          height: "var(--content-body-height)",
          overflowY: "auto",
          background: token.colorBgLayout,
          padding: 20,
        }}
      >
        <div className="mb-5 max-w-3xl">
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Per-plan RADIUS reply rules — map FreeRADIUS attributes to WiFi plans by vendor profile.
            Optional site scope allows location-specific overrides.
          </Paragraph>
        </div>

        {error ? (
          <Alert
            type="error"
            showIcon
            className="mb-4"
            message="Failed to load plan policies"
            description={String(error)}
          />
        ) : null}

        <div className="flex flex-col gap-4">
          <WifiOrgScopeBar
            memberships={memberships}
            orgId={orgId}
            showOrgSwitcher={showOrgSwitcher}
            needsOrg={needsOrg}
            loading={loading}
            onSelectOrg={selectOrg}
          />

          {contextReady ? (
            <>
              <PlanPoliciesStats meta={meta} loading={loading} />

              <Card
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <PlanPoliciesToolbar
                  formOptions={formOptions}
                  plans={filterPlans}
                  search={search}
                  orgId={orgId ?? null}
                  showOrgFilter={showOrgSwitcher}
                  planId={params.planId ?? null}
                  vendorProfileId={params.vendorProfileId ?? null}
                  phase={(params.phase as RadiusAttrPhase) ?? null}
                  globalOnly={params.globalOnly === true}
                  loading={loading}
                  onSearchChange={setSearchLocal}
                  onOrgChange={handleOrgFilterChange}
                  onPlanChange={(planId) =>
                    patchParams({ planId: planId ?? undefined, page: 1 })
                  }
                  onVendorChange={(id) =>
                    patchParams({ vendorProfileId: id ?? undefined, page: 1 })
                  }
                  onPhaseChange={(phase) =>
                    patchParams({ phase: phase ?? undefined, page: 1 })
                  }
                  onGlobalOnlyChange={(value) =>
                    patchParams({ globalOnly: value ? true : undefined, page: 1 })
                  }
                  onRefresh={refresh}
                  onAdd={openCreate}
                />
              </Card>

              <Card
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <PlanPoliciesTable
                  data={list}
                  loading={loading}
                  page={params.page ?? 1}
                  pageSize={params.limit ?? 20}
                  total={meta?.total ?? 0}
                  onPaginationChange={setPagination}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                />
              </Card>
            </>
          ) : null}
        </div>
      </div>

      <PlanPolicyFormDrawer
        open={drawerOpen}
        saving={saving}
        editing={editing}
        formOptions={formOptions}
        lockedOrgId={canSwitchOrg ? undefined : orgId}
        loadOptions={loadFormOptions}
        onClose={closeDrawer}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default NetworkRadiusPlanPoliciesPage;
