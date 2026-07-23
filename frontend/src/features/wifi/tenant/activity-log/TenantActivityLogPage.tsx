"use client";

import React, { useEffect, useState } from "react";
import { Alert, Card, Typography, theme } from "antd";
import { ScrollText } from "lucide-react";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import OrgSwitcher from "../profile/components/OrgSwitcher";
import { useTenantActivityLog } from "./useTenantActivityLog";
import type { ActivityLogRecord, ActivityLogView } from "./types";
import ActivityLogStats from "./components/ActivityLogStats";
import ActivityLogToolbar from "./components/ActivityLogToolbar";
import ActivityLogTable from "./components/ActivityLogTable";
import ActivityLogDetailDrawer from "./components/ActivityLogDetailDrawer";

const { Paragraph } = Typography;

const TenantActivityLogPage: React.FC = () => {
  const { token } = theme.useToken();

  const [search, setSearchLocal] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<ActivityLogRecord | null>(null);
  const [initDone, setInitDone] = useState(false);

  const {
    list,
    meta,
    loading,
    error,
    params,
    orgId,
    formOptions,
    canViewAllOrgs,
    setPagination,
    setSearch,
    patchParams,
    selectOrg,
    clearOrg,
    refresh,
    loadFormOptions,
    loadEntry,
  } = useTenantActivityLog();

  useEffect(() => {
    void loadFormOptions().then(() => setInitDone(true));
  }, [loadFormOptions]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search, setSearch]);

  const memberships = meta?.memberships ?? formOptions.memberships;
  // Developers: optional org filter (clear = all tenants). Multi-membership tenants: required pick.
  const showSwitcher = canViewAllOrgs || memberships.length > 1;
  const needsOrg = initDone && !canViewAllOrgs && !orgId && memberships.length > 1;
  const contextReady = canViewAllOrgs || Boolean(orgId);

  const openDetail = (record: ActivityLogRecord) => {
    setSelected(record);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelected(null);
  };

  return (
    <div className="p-0">
      <CommonHeader icon={ScrollText} />

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
            {canViewAllOrgs
              ? "Platform audit trail across all tenants. Clear the organization filter to see every org, or pick one tenant to narrow the feed."
              : "Immutable audit trail for your organization — who did what, on which entity, and when. Filter by time window, action type, or search actors and metadata."}
          </Paragraph>
        </div>

        {error ? (
          <Alert
            type="error"
            showIcon
            className="mb-4"
            message="Failed to load activity log"
            description={String(error)}
          />
        ) : null}

        <div className="flex flex-col gap-4">
          {showSwitcher ? (
            <OrgSwitcher
              memberships={memberships}
              value={orgId}
              required={needsOrg}
              allowClear={canViewAllOrgs}
              loading={loading}
              onChange={selectOrg}
              onClear={canViewAllOrgs ? clearOrg : undefined}
            />
          ) : null}

          {needsOrg ? (
            <Alert
              type="info"
              showIcon
              message="Select an organization"
              description="Choose a tenant to view its activity history."
            />
          ) : null}

          {contextReady ? (
            <>
              <ActivityLogStats meta={meta} loading={loading} />

              <Card
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <ActivityLogToolbar
                  formOptions={formOptions}
                  search={search}
                  view={(params.view as ActivityLogView) ?? "recent"}
                  action={(params.action as string) ?? null}
                  entity={(params.entity as string) ?? null}
                  loading={loading}
                  onSearchChange={setSearchLocal}
                  onViewChange={(view) => patchParams({ view, page: 1 })}
                  onActionChange={(action) =>
                    patchParams({ action: action ?? undefined, page: 1 })
                  }
                  onEntityChange={(entity) =>
                    patchParams({ entity: entity ?? undefined, page: 1 })
                  }
                  onRefresh={refresh}
                />
              </Card>

              <Card
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <ActivityLogTable
                  data={list}
                  loading={loading}
                  page={params.page ?? 1}
                  pageSize={params.limit ?? 20}
                  total={meta?.total ?? 0}
                  showOrg={canViewAllOrgs && !orgId}
                  onPaginationChange={setPagination}
                  onView={openDetail}
                />
              </Card>
            </>
          ) : initDone && memberships.length === 0 ? (
            <Alert
              type="warning"
              showIcon
              message="No organization access"
              description="Your account is not linked to a tenant. Contact a platform administrator."
            />
          ) : null}
        </div>
      </div>

      <ActivityLogDetailDrawer
        open={drawerOpen}
        entryId={selected?.id ?? null}
        fallback={selected}
        onClose={closeDrawer}
        loadEntry={loadEntry}
      />
    </div>
  );
};

export default TenantActivityLogPage;
