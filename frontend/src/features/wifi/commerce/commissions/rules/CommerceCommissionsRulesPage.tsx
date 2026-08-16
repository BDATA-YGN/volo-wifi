"use client";

import React, { useEffect, useState } from "react";
import { getApiErrorMessage } from "@/common/exceptions/handleApiError";
import Link from "next/link";
import { Alert, App, Card, theme } from "antd";
import { Percent } from "lucide-react";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import OrgSwitcher from "@/features/wifi/tenant/profile/components/OrgSwitcher";
import { useCommerceCommissionsRules } from "./useCommerceCommissionsRules";
import type { CommissionRuleFormValues, CommissionRuleRecord, CommissionType } from "./types";
import RulesStats from "./components/RulesStats";
import RulesToolbar from "./components/RulesToolbar";
import RulesTable from "./components/RulesTable";
import RuleFormDrawer from "./components/RuleFormDrawer";
import RuleDetailDrawer from "./components/RuleDetailDrawer";
import { formValuesFromRecord } from "./utils";



const CommerceCommissionsRulesPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const { token } = theme.useToken();

  const [search, setSearchLocal] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editing, setEditing] = useState<CommissionRuleRecord | null>(null);
  const [selected, setSelected] = useState<CommissionRuleRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [initDone, setInitDone] = useState(false);

  const {
    list,
    meta,
    loading,
    error,
    params,
    orgId,
    formOptions,
    setPagination,
    setSearch,
    patchParams,
    selectOrg,
    refresh,
    loadFormOptions,
    loadRule,
    createRule,
    updateRule,
    removeRule,
  } = useCommerceCommissionsRules();

  useEffect(() => {
    void loadFormOptions().then(() => setInitDone(true));
  }, [loadFormOptions]);

  useEffect(() => {
    if (initDone && meta?.memberships?.length === 1 && !orgId) {
      selectOrg(meta.memberships[0].id);
    }
  }, [initDone, meta?.memberships, orgId, selectOrg]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search, setSearch]);

  const memberships = meta?.memberships ?? formOptions.memberships;
  const currency = formOptions.currency;
  const showSwitcher = memberships.length > 1;
  const needsOrg = initDone && !orgId && memberships.length > 1;
  const noPartners = formOptions.resellers.length === 0;

  const openCreate = () => {
    setEditing(null);
    setDetailOpen(false);
    setDrawerOpen(true);
  };

  const openEdit = (record: CommissionRuleRecord) => {
    setEditing(record);
    setDetailOpen(false);
    setDrawerOpen(true);
  };

  const openDetail = (record: CommissionRuleRecord) => {
    setSelected(record);
    setDetailOpen(true);
  };

  const closeDrawer = () => {
    if (saving) return;
    setDrawerOpen(false);
    setEditing(null);
  };

  const handleCreate = async (values: CommissionRuleFormValues) => {
    setSaving(true);
    try {
      await createRule(values);
      message.success("Commission rule created");
      setDrawerOpen(false);
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, "Failed to create rule"));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string, values: CommissionRuleFormValues) => {
    setSaving(true);
    try {
      await updateRule(id, values);
      message.success("Commission rule updated");
      setDrawerOpen(false);
      setEditing(null);
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, "Failed to update rule"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (record: CommissionRuleRecord) => {
    modal.confirm({
      title: "Delete commission rule?",
      content: `Remove rule for "${record.scopeLabel}"? This cannot be undone.`,
      okText: "Delete",
      okType: "danger",
      onOk: async () => {
        try {
          await removeRule(record.id);
          message.success("Rule removed");
        } catch (err: unknown) {
          message.error(getApiErrorMessage(err, "Failed to delete rule"));
        }
      },
    });
  };

  const handleToggleActive = async (record: CommissionRuleRecord, active: boolean) => {
    try {
      await updateRule(record.id, { ...formValuesFromRecord(record), isActive: active });
      message.success(active ? "Rule activated" : "Rule deactivated");
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, "Failed to update rule"));
      refresh();
    }
  };

  return (
    <div className="p-0">
      <CommonHeader icon={Percent} />

      <div
        style={{
          height: "var(--content-body-height)",
          overflowY: "auto",
          background: token.colorBgLayout,
          padding: 20,
        }}
      >
        {error ? (
          <Alert
            type="error"
            showIcon
            className="mb-4"
            title="Failed to load commission rules"
            description={String(error)}
          />
        ) : null}

        <div className="flex flex-col gap-4">
          {showSwitcher ? (
            <OrgSwitcher
              memberships={memberships}
              value={orgId}
              required={needsOrg}
              loading={loading}
              onChange={selectOrg}
            />
          ) : null}

          {needsOrg ? (
            <Alert
              type="info"
              showIcon
              title="Select an organization"
              description="Choose a tenant to manage commission rules."
            />
          ) : null}

          {orgId ? (
            <>
              {noPartners ? (
                <Alert
                  type="warning"
                  showIcon
                  title="No partners configured"
                  description={
                    <span>
                      Create reseller accounts in{" "}
                      <Link href="/wifi/commerce/partners">Partner Directory</Link> before setting
                      partner-specific commission rules.
                    </span>
                  }
                />
              ) : null}

              <RulesStats meta={meta} loading={loading} />

              <Card
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <RulesToolbar
                  search={search}
                  type={(params.type as CommissionType) ?? null}
                  resellerId={(params.resellerId as string) ?? null}
                  planId={(params.planId as string) ?? null}
                  isActive={
                    params.isActive === true
                      ? true
                      : params.isActive === false
                        ? false
                        : null
                  }
                  formOptions={formOptions}
                  loading={loading}
                  onSearchChange={setSearchLocal}
                  onTypeChange={(type) => patchParams({ type: type ?? undefined, page: 1 })}
                  onResellerChange={(id) =>
                    patchParams({ resellerId: id ?? undefined, page: 1 })
                  }
                  onPlanChange={(id) => patchParams({ planId: id ?? undefined, page: 1 })}
                  onActiveChange={(active) =>
                    patchParams({
                      isActive: active === null ? undefined : active,
                      page: 1,
                    })
                  }
                  onRefresh={refresh}
                  onCreate={openCreate}
                />
              </Card>

              <Card
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <RulesTable
                  data={list}
                  currency={currency}
                  loading={loading}
                  page={params.page ?? 1}
                  pageSize={params.limit ?? 20}
                  total={meta?.total ?? 0}
                  onPaginationChange={setPagination}
                  onView={openDetail}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onToggleActive={handleToggleActive}
                />
              </Card>
            </>
          ) : initDone && memberships.length === 0 ? (
            <Alert
              type="warning"
              showIcon
              title="No organization access"
              description="Your account is not linked to a tenant."
            />
          ) : null}
        </div>
      </div>

      <RuleFormDrawer
        open={drawerOpen}
        saving={saving}
        editing={editing}
        formOptions={formOptions}
        onClose={closeDrawer}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />

      <RuleDetailDrawer
        open={detailOpen}
        ruleId={selected?.id ?? null}
        currency={currency}
        fallback={selected}
        onClose={() => {
          setDetailOpen(false);
          setSelected(null);
        }}
        onEdit={openEdit}
        loadRule={loadRule}
      />
    </div>
  );
};

export default CommerceCommissionsRulesPage;
