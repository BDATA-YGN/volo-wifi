"use client";

import React, { useEffect, useState } from "react";
import { Alert, Card, theme } from "antd";
import { ShieldCheck } from "lucide-react";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import WifiOrgScopeBar from "@/features/wifi/shared/components/WifiOrgScopeBar";
import { useNetworkRadiusAuthEvents } from "./useNetworkRadiusAuthEvents";
import type {
  AuthEventOutcome,
  AuthEventRecord,
  AuthEventsFormOptions,
  AuthEventView,
} from "./types";
import AuthEventsStats from "./components/AuthEventsStats";
import AuthEventsToolbar from "./components/AuthEventsToolbar";
import AuthEventsTable from "./components/AuthEventsTable";
import AuthEventDetailDrawer from "./components/AuthEventDetailDrawer";

const emptyFormOptions: AuthEventsFormOptions = {
  orgs: [],
  stations: [],
};

const NetworkRadiusAuthEventsPage: React.FC = () => {
  const { token } = theme.useToken();

  const [search, setSearchLocal] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [formOptions, setFormOptions] = useState<AuthEventsFormOptions>(emptyFormOptions);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AuthEventRecord | null>(null);

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
    loadEvent,
    orgId,
    selectOrg,
    showOrgSwitcher,
    needsOrg,
    contextReady,
    memberships,
  } = useNetworkRadiusAuthEvents(undefined, { autoRefresh });

  useEffect(() => {
    if (!orgId) return;
    void loadFormOptions().then(setFormOptions);
  }, [loadFormOptions, orgId]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search, setSearch]);

  const openDetail = (record: AuthEventRecord) => {
    setSelectedEvent(record);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedEvent(null);
  };

  return (
    <div className="p-0">
      <CommonHeader icon={ShieldCheck} />

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
            message="Failed to load auth events"
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
          <AuthEventsStats meta={meta} loading={loading} />

          <Card
            styles={{ body: { padding: 16 } }}
            style={{ borderRadius: token.borderRadiusLG }}
          >
            <AuthEventsToolbar
              formOptions={formOptions}
              search={search}
              orgId={orgId ?? null}
              showOrgFilter={showOrgSwitcher}
              stationId={(params.stationId as string | undefined) ?? null}
              view={(params.view as AuthEventView) ?? "recent"}
              outcome={(params.outcome as AuthEventOutcome) ?? null}
              autoRefresh={autoRefresh}
              loading={loading}
              onSearchChange={setSearchLocal}
              onOrgChange={(nextOrgId) =>
                patchParams({
                  orgId: nextOrgId ?? undefined,
                  stationId: undefined,
                  page: 1,
                })
              }
              onStationChange={(nextStationId) =>
                patchParams({ stationId: nextStationId ?? undefined, page: 1 })
              }
              onViewChange={(view) =>
                patchParams({ view, page: 1 })
              }
              onOutcomeChange={(outcome) =>
                patchParams({ outcome: outcome ?? undefined, page: 1 })
              }
              onAutoRefreshChange={setAutoRefresh}
              onRefresh={refresh}
            />
          </Card>

          <Card
            styles={{ body: { padding: 16 } }}
            style={{ borderRadius: token.borderRadiusLG }}
          >
            <AuthEventsTable
              data={list}
              loading={loading}
              page={params.page ?? 1}
              pageSize={params.limit ?? 20}
              total={meta?.total ?? 0}
              onPaginationChange={setPagination}
              onView={openDetail}
            />
          </Card>
            </>
          ) : null}
        </div>
      </div>

      <AuthEventDetailDrawer
        open={drawerOpen}
        eventId={selectedEvent?.id ?? null}
        fallback={selectedEvent}
        onClose={closeDrawer}
        loadEvent={loadEvent}
      />
    </div>
  );
};

export default NetworkRadiusAuthEventsPage;
