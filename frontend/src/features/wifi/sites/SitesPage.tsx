"use client";

import React, { useEffect, useState } from "react";
import { getApiErrorMessage } from "@/common/exceptions/handleApiError";
import Link from "next/link";
import { Alert, App, Card, theme } from "antd";
import { MapPin } from "lucide-react";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import OrgSwitcher from "@/features/wifi/tenant/profile/components/OrgSwitcher";
import { useSites } from "./useSites";
import type { SiteFormValues, SiteRecord, StationStatus } from "./types";
import SiteLicenseBanner from "./components/SiteLicenseBanner";
import SitesStats from "./components/SitesStats";
import SitesToolbar from "./components/SitesToolbar";
import SitesTable from "./components/SitesTable";
import SiteFormDrawer from "./components/SiteFormDrawer";
import SiteDetailDrawer from "./components/SiteDetailDrawer";



const SitesPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const { token } = theme.useToken();

  const [search, setSearchLocal] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editing, setEditing] = useState<SiteRecord | null>(null);
  const [selected, setSelected] = useState<SiteRecord | null>(null);
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
    loadSite,
    createSite,
    updateSite,
    removeSite,
  } = useSites();

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
  const showSwitcher = memberships.length > 1;
  const needsOrg = initDone && !orgId && memberships.length > 1;
  const license = meta?.license;
  const licenseAtLimit = Boolean(license?.isAtLimit);
  const noTiers = formOptions.stationSizes.length === 0;

  const openCreate = () => {
    setEditing(null);
    setDetailOpen(false);
    setDrawerOpen(true);
  };

  const openEdit = (record: SiteRecord) => {
    setEditing(record);
    setDetailOpen(false);
    setDrawerOpen(true);
  };

  const openDetail = (record: SiteRecord) => {
    setSelected(record);
    setDetailOpen(true);
  };

  const closeDrawer = () => {
    if (saving) return;
    setDrawerOpen(false);
    setEditing(null);
  };

  const handleCreate = async (values: SiteFormValues) => {
    setSaving(true);
    try {
      await createSite(values);
      message.success("Site created");
      setDrawerOpen(false);
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, "Failed to create site"));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string, values: SiteFormValues) => {
    setSaving(true);
    try {
      await updateSite(id, values);
      message.success("Site updated");
      setDrawerOpen(false);
      setEditing(null);
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, "Failed to update site"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (record: SiteRecord) => {
    modal.confirm({
      title: `Delete site "${record.code}"?`,
      content: "Soft-deletes the site record. Sites with credentials or sales cannot be removed.",
      okText: "Delete",
      okType: "danger",
      onOk: async () => {
        try {
          await removeSite(record.id);
          message.success("Site removed");
        } catch (err: unknown) {
          message.error(getApiErrorMessage(err, "Failed to delete site"));
        }
      },
    });
  };

  return (
    <div className="p-0">
      <CommonHeader icon={MapPin} />

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
            message="Failed to load sites"
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
              message="Select an organization"
              description="Choose a tenant to manage its WiFi sites."
            />
          ) : null}

          {orgId ? (
            <>
              {noTiers ? (
                <Alert
                  type="warning"
                  showIcon
                  message="No capacity tiers configured"
                  description={
                    <span>
                      Platform capacity tiers must exist before adding sites.{" "}
                      <Link href="/wifi/billing/capacity-tiers">Configure capacity tiers</Link>
                    </span>
                  }
                />
              ) : null}

              <SiteLicenseBanner license={license} />

              <SitesStats meta={meta} loading={loading} />

              <Card
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <SitesToolbar
                  search={search}
                  status={(params.status as StationStatus) ?? null}
                  stationSizeId={(params.stationSizeId as string) ?? null}
                  township={(params.township as string) ?? null}
                  formOptions={formOptions}
                  loading={loading}
                  addDisabled={noTiers}
                  onSearchChange={setSearchLocal}
                  onStatusChange={(status) =>
                    patchParams({ status: status ?? undefined, page: 1 })
                  }
                  onTierChange={(stationSizeId) =>
                    patchParams({ stationSizeId: stationSizeId ?? undefined, page: 1 })
                  }
                  onTownshipChange={(township) =>
                    patchParams({ township: township ?? undefined, page: 1 })
                  }
                  onRefresh={refresh}
                  onCreate={openCreate}
                />
              </Card>

              <Card
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <SitesTable
                  data={list}
                  loading={loading}
                  page={params.page ?? 1}
                  pageSize={params.limit ?? 20}
                  total={meta?.total ?? 0}
                  onPaginationChange={setPagination}
                  onView={openDetail}
                  onEdit={openEdit}
                  onDelete={handleDelete}
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

      <SiteFormDrawer
        open={drawerOpen}
        saving={saving}
        editing={editing}
        formOptions={formOptions}
        licenseAtLimit={licenseAtLimit}
        onClose={closeDrawer}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />

      <SiteDetailDrawer
        open={detailOpen}
        siteId={selected?.id ?? null}
        fallback={selected}
        onClose={() => {
          setDetailOpen(false);
          setSelected(null);
        }}
        onEdit={openEdit}
        loadSite={loadSite}
      />
    </div>
  );
};

export default SitesPage;
