"use client";

import React, { useEffect, useState } from "react";
import { getApiErrorMessage } from "@/common/exceptions/handleApiError";
import Link from "next/link";
import { Alert, App, Card, Typography, theme } from "antd";
import { HandCoins } from "lucide-react";
import type { Dayjs } from "dayjs";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import OrgSwitcher from "@/features/wifi/tenant/profile/components/OrgSwitcher";
import { useCommerceCommissionsPayouts } from "./useCommerceCommissionsPayouts";
import type { PayoutFormValues, PayoutRecord, PayoutStatus } from "./types";
import PayoutsStats from "./components/PayoutsStats";
import PayoutsToolbar from "./components/PayoutsToolbar";
import PayoutsTable from "./components/PayoutsTable";
import PayoutFormDrawer from "./components/PayoutFormDrawer";
import PayoutDetailDrawer from "./components/PayoutDetailDrawer";

const { Paragraph } = Typography;

const CommerceCommissionsPayoutsPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const { token } = theme.useToken();

  const [search, setSearchLocal] = useState("");
  const [periodRange, setPeriodRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<PayoutRecord | null>(null);
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
    loadPayout,
    previewPayout,
    createPayout,
    updatePayoutStatus,
    removePayout,
  } = useCommerceCommissionsPayouts();

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
  const currency = meta?.currency ?? formOptions.currency;
  const showSwitcher = memberships.length > 1;
  const needsOrg = initDone && !orgId && memberships.length > 1;
  const noPartners = formOptions.resellers.length === 0;

  const openCreate = () => {
    setDetailOpen(false);
    setDrawerOpen(true);
  };

  const openDetail = (record: PayoutRecord) => {
    setSelected(record);
    setDetailOpen(true);
  };

  const closeDrawer = () => {
    if (saving) return;
    setDrawerOpen(false);
  };

  const handleCreate = async (values: PayoutFormValues) => {
    setSaving(true);
    try {
      await createPayout(values);
      message.success("Commission payout created");
      setDrawerOpen(false);
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, "Failed to create payout"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (record: PayoutRecord) => {
    modal.confirm({
      title: "Delete payout?",
      content: `Remove the ${record.periodLabel} payout for ${record.reseller?.name ?? "partner"}?`,
      okText: "Delete",
      okType: "danger",
      onOk: async () => {
        try {
          await removePayout(record.id);
          message.success("Payout removed");
          if (selected?.id === record.id) {
            setDetailOpen(false);
            setSelected(null);
          }
        } catch (err: unknown) {
          message.error(getApiErrorMessage(err, "Failed to delete payout"));
        }
      },
    });
  };

  const handleStatusChange = async (id: string, status: PayoutStatus) => {
    await updatePayoutStatus(id, { status });
    message.success(
      status === "APPROVED"
        ? "Payout approved"
        : status === "PAID"
          ? "Payout marked as paid"
          : "Payout rejected"
    );
    refresh();
  };

  const handlePeriodFilter = (range: [Dayjs | null, Dayjs | null] | null) => {
    setPeriodRange(range);
    patchParams({
      periodFrom: range?.[0]?.startOf("day").toISOString(),
      periodTo: range?.[1]?.endOf("day").toISOString(),
      page: 1,
    });
  };

  return (
    <div className="p-0">
      <CommonHeader icon={HandCoins} />

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
            Partner commission payout workflow — generate drafts from paid sales, review against{" "}
            <Link href="/wifi/commerce/commissions/rules">Commission Rules</Link>, approve, and
            record when funds are transferred.
          </Paragraph>
        </div>

        {error ? (
          <Alert
            type="error"
            showIcon
            className="mb-4"
            title="Failed to load commission payouts"
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
              description="Choose a tenant to manage commission payouts."
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
                      Add reseller accounts in{" "}
                      <Link href="/wifi/commerce/partners">Partner Directory</Link> before creating
                      payouts.
                    </span>
                  }
                />
              ) : null}

              <PayoutsStats meta={meta} loading={loading} />

              <Card
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <PayoutsToolbar
                  search={search}
                  status={(params.status as PayoutStatus) ?? null}
                  resellerId={(params.resellerId as string) ?? null}
                  periodRange={periodRange}
                  formOptions={formOptions}
                  loading={loading}
                  onSearchChange={setSearchLocal}
                  onStatusChange={(status) =>
                    patchParams({ status: status ?? undefined, page: 1 })
                  }
                  onResellerChange={(id) =>
                    patchParams({ resellerId: id ?? undefined, page: 1 })
                  }
                  onPeriodChange={handlePeriodFilter}
                  onRefresh={refresh}
                  onCreate={openCreate}
                />
              </Card>

              <Card
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <PayoutsTable
                  data={list}
                  currency={currency}
                  loading={loading}
                  page={params.page ?? 1}
                  pageSize={params.limit ?? 20}
                  total={meta?.total ?? 0}
                  onPaginationChange={setPagination}
                  onView={openDetail}
                  onDelete={handleDelete}
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

      <PayoutFormDrawer
        open={drawerOpen}
        saving={saving}
        formOptions={formOptions}
        onClose={closeDrawer}
        onCreate={handleCreate}
        onPreview={previewPayout}
      />

      <PayoutDetailDrawer
        open={detailOpen}
        payoutId={selected?.id ?? null}
        currency={currency}
        fallback={selected}
        onClose={() => {
          setDetailOpen(false);
          setSelected(null);
        }}
        onStatusChange={handleStatusChange}
        loadPayout={loadPayout}
      />
    </div>
  );
};

export default CommerceCommissionsPayoutsPage;
