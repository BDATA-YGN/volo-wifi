"use client";

import React, { useEffect, useState } from "react";
import { getApiErrorMessage } from "@/common/exceptions/handleApiError";
import Link from "next/link";
import { Alert, App, Card, Typography, theme } from "antd";
import { Tags } from "lucide-react";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import OrgSwitcher from "@/features/wifi/tenant/profile/components/OrgSwitcher";
import { useCatalogRetailPricing } from "./useCatalogRetailPricing";
import type { PriceBookFormValues, PriceBookRecord, PriceBookScope } from "./types";
import RetailPricingStats from "./components/RetailPricingStats";
import RetailPricingToolbar from "./components/RetailPricingToolbar";
import PriceBooksTable from "./components/PriceBooksTable";
import PriceBookFormDrawer from "./components/PriceBookFormDrawer";
import PricesDrawer from "./components/PricesDrawer";

const { Paragraph } = Typography;

const CatalogRetailPricingPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const { token } = theme.useToken();

  const [search, setSearchLocal] = useState("");
  const [bookDrawerOpen, setBookDrawerOpen] = useState(false);
  const [pricesDrawerOpen, setPricesDrawerOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<PriceBookRecord | null>(null);
  const [activeBook, setActiveBook] = useState<PriceBookRecord | null>(null);
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
    loadBook,
    createBook,
    updateBook,
    removeBook,
    createPrice,
    updatePrice,
    removePrice,
  } = useCatalogRetailPricing();

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
  const hasPlans = formOptions.plans.length > 0;
  const hasDefaultBook = list.some((b) => b.isDefault);

  const openCreateBook = () => {
    setEditingBook(null);
    setBookDrawerOpen(true);
  };

  const openEditBook = (record: PriceBookRecord) => {
    setEditingBook(record);
    setBookDrawerOpen(true);
  };

  const openPrices = (record: PriceBookRecord) => {
    setActiveBook(record);
    setPricesDrawerOpen(true);
  };

  const closeBookDrawer = () => {
    if (saving) return;
    setBookDrawerOpen(false);
    setEditingBook(null);
  };

  const handleCreateBook = async (values: PriceBookFormValues) => {
    setSaving(true);
    try {
      await createBook(values);
      message.success("Price book created");
      setBookDrawerOpen(false);
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, "Failed to create price book"));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateBook = async (id: string, values: PriceBookFormValues) => {
    setSaving(true);
    try {
      await updateBook(id, values);
      message.success("Price book updated");
      setBookDrawerOpen(false);
      setEditingBook(null);
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, "Failed to update price book"));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBook = (record: PriceBookRecord) => {
    modal.confirm({
      title: `Delete "${record.name}"?`,
      content: "All plan prices in this book will be removed.",
      okText: "Delete",
      okType: "danger",
      onOk: async () => {
        try {
          await removeBook(record.id);
          message.success("Price book removed");
          if (activeBook?.id === record.id) {
            setPricesDrawerOpen(false);
            setActiveBook(null);
          }
        } catch (err: unknown) {
          message.error(getApiErrorMessage(err, "Failed to delete price book"));
        }
      },
    });
  };

  const handleRemovePrice = (priceId: string) =>
    new Promise<void>((resolve, reject) => {
      modal.confirm({
        title: "Remove this plan price?",
        okText: "Remove",
        okType: "danger",
        onOk: async () => {
          try {
            await removePrice(priceId);
            message.success("Plan price removed");
            refresh();
            resolve();
          } catch (err) {
            reject(err);
          }
        },
        onCancel: () => resolve(),
      });
    });

  return (
    <div className="p-0">
      <CommonHeader icon={Tags} />

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
            Retail price books for service plans — set organization defaults or override prices per
            reseller or site. Plans are defined on{" "}
            <Link href="/wifi/catalog/service-plans">Service Plans</Link>.
          </Paragraph>
        </div>

        {error ? (
          <Alert
            type="error"
            showIcon
            className="mb-4"
            message="Failed to load retail pricing"
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
              description="Choose a tenant to manage retail price books."
            />
          ) : null}

          {orgId ? (
            <>
              {!hasPlans ? (
                <Alert
                  type="warning"
                  showIcon
                  title="No service plans yet"
                  description={
                    <span>
                      Create internet plans on{" "}
                      <Link href="/wifi/catalog/service-plans">Service Plans</Link> before assigning
                      retail prices.
                    </span>
                  }
                />
              ) : null}

              {hasPlans && !hasDefaultBook && list.length > 0 ? (
                <Alert
                  type="info"
                  showIcon
                  message="No default price book"
                  description="Consider marking one book as the organization default for fallback pricing."
                />
              ) : null}

              <RetailPricingStats meta={meta} loading={loading} />

              <Card
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <RetailPricingToolbar
                  search={search}
                  scope={(params.scope as PriceBookScope) ?? null}
                  loading={loading}
                  onSearchChange={setSearchLocal}
                  onScopeChange={(scope) =>
                    patchParams({ scope: scope ?? undefined, page: 1 })
                  }
                  onRefresh={refresh}
                  onCreate={openCreateBook}
                />
              </Card>

              <Card
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <PriceBooksTable
                  data={list}
                  loading={loading}
                  page={params.page ?? 1}
                  pageSize={params.limit ?? 20}
                  total={meta?.total ?? 0}
                  onPaginationChange={setPagination}
                  onManagePrices={openPrices}
                  onEdit={openEditBook}
                  onDelete={handleDeleteBook}
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

      <PriceBookFormDrawer
        open={bookDrawerOpen}
        saving={saving}
        editing={editingBook}
        formOptions={formOptions}
        onClose={closeBookDrawer}
        onCreate={handleCreateBook}
        onUpdate={handleUpdateBook}
      />

      <PricesDrawer
        open={pricesDrawerOpen}
        book={activeBook}
        formOptions={formOptions}
        onClose={() => {
          setPricesDrawerOpen(false);
          setActiveBook(null);
        }}
        loadBook={loadBook}
        onCreatePrice={createPrice}
        onUpdatePrice={updatePrice}
        onRemovePrice={handleRemovePrice}
      />
    </div>
  );
};

export default CatalogRetailPricingPage;
