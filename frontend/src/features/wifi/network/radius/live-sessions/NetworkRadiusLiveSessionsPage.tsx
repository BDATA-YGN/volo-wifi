"use client";

import React, { useEffect, useState } from "react";
import { Alert, Card, theme } from "antd";
import { Wifi } from "lucide-react";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import WifiOrgScopeBar from "@/features/wifi/shared/components/WifiOrgScopeBar";
import { useNetworkRadiusLiveSessions } from "./useNetworkRadiusLiveSessions";
import type { LiveSessionRecord, LiveSessionsFormOptions, SessionView } from "./types";
import type { RadiusAcctStatus } from "./types";
import LiveSessionsStats from "./components/LiveSessionsStats";
import LiveSessionsToolbar from "./components/LiveSessionsToolbar";
import LiveSessionsTable from "./components/LiveSessionsTable";
import LiveSessionDetailDrawer from "./components/LiveSessionDetailDrawer";

const emptyFormOptions: LiveSessionsFormOptions = {
  orgs: [],
  stations: [],
};

const NetworkRadiusLiveSessionsPage: React.FC = () => {
  const { token } = theme.useToken();

  const [search, setSearchLocal] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [formOptions, setFormOptions] = useState<LiveSessionsFormOptions>(emptyFormOptions);
  const [filterStations, setFilterStations] = useState<LiveSessionsFormOptions["stations"]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<LiveSessionRecord | null>(null);

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
    loadSession,
    orgId,
    selectOrg,
    showOrgSwitcher,
    needsOrg,
    contextReady,
    memberships,
  } = useNetworkRadiusLiveSessions(undefined, { autoRefresh });

  useEffect(() => {
    if (!orgId) return;
    void loadFormOptions(orgId).then((opts) => {
      setFormOptions(opts);
      setFilterStations(opts.stations);
    });
  }, [loadFormOptions, orgId]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search, setSearch]);

  const openDetail = (record: LiveSessionRecord) => {
    setSelectedSession(record);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedSession(null);
  };

  return (
    <div className="p-0">
      <CommonHeader icon={Wifi} />

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
            message="Failed to load sessions"
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
              <LiveSessionsStats meta={meta} loading={loading} />

              <Card
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <LiveSessionsToolbar
                  formOptions={formOptions}
                  stations={filterStations}
                  search={search}
                  orgId={orgId ?? null}
                  showOrgFilter={showOrgSwitcher}
                  stationId={params.stationId ?? null}
                  view={(params.view as SessionView) ?? "active"}
                  status={(params.status as RadiusAcctStatus) ?? null}
                  autoRefresh={autoRefresh}
                  loading={loading}
                  onSearchChange={setSearchLocal}
                  onOrgChange={(orgId) =>
                    patchParams({ orgId: orgId ?? undefined, stationId: undefined, page: 1 })
                  }
                  onStationChange={(stationId) =>
                    patchParams({ stationId: stationId ?? undefined, page: 1 })
                  }
                  onViewChange={(view) =>
                    patchParams({
                      view,
                      status: undefined,
                      page: 1,
                    })
                  }
                  onStatusChange={(status) =>
                    patchParams({ status: status ?? undefined, page: 1 })
                  }
                  onAutoRefreshChange={setAutoRefresh}
                  onRefresh={refresh}
                />
              </Card>

              <Card
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <LiveSessionsTable
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

      <LiveSessionDetailDrawer
        open={drawerOpen}
        sessionId={selectedSession?.id ?? null}
        fallback={selectedSession}
        onClose={closeDrawer}
        loadSession={loadSession}
      />
    </div>
  );
};

export default NetworkRadiusLiveSessionsPage;
