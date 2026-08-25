"use client";

import React, { useEffect, useState } from "react";
import { getApiErrorMessage } from "@/common/exceptions/handleApiError";
import { Alert, App, Card, theme } from "antd";
import { KeyRound } from "lucide-react";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import OrgSwitcher from "@/features/wifi/tenant/profile/components/OrgSwitcher";
import { useCommerceAccessTokens } from "./useCommerceAccessTokens";
import { useCanManageTokenSessionLifecycle } from "@/features/wifi/shared/session-lifecycle-role";
import type {
  AccessTokenRecord,
  CredentialLifecycleAction,
  CredentialStatus,
  IssueTokenFormValues,
  IssueTokenResult,
} from "./types";
import AccessTokensStats from "./components/AccessTokensStats";
import AccessTokensToolbar from "./components/AccessTokensToolbar";
import AccessTokensTable from "./components/AccessTokensTable";
import IssueTokenDrawer from "./components/IssueTokenDrawer";
import TokenDetailDrawer from "./components/TokenDetailDrawer";
import IssueSuccessModal from "./components/IssueSuccessModal";

const CommerceAccessTokensPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const { token } = theme.useToken();
  const canManageSessionLifecycle = useCanManageTokenSessionLifecycle();

  const [search, setSearchLocal] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [issueResult, setIssueResult] = useState<IssueTokenResult | null>(null);
  const [selected, setSelected] = useState<AccessTokenRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [initDone, setInitDone] = useState(false);

  const {
    list,
    meta,
    catalog,
    loading,
    error,
    params,
    orgId,
    resellerId,
    formOptions,
    setPagination,
    setSearch,
    patchParams,
    selectOrg,
    selectReseller,
    refresh,
    loadFormOptions,
    loadToken,
    issueTokens,
    revokeToken,
    applyTokenAction,
    deleteTokenSession,
  } = useCommerceAccessTokens();

  useEffect(() => {
    void loadFormOptions().then(() => setInitDone(true));
  }, [loadFormOptions]);

  useEffect(() => {
    if (initDone && meta?.memberships?.length === 1 && !orgId) {
      selectOrg(meta.memberships[0].id);
    }
  }, [initDone, meta?.memberships, orgId, selectOrg]);

  useEffect(() => {
    if (meta?.orgId && !orgId) selectOrg(meta.orgId);
  }, [meta?.orgId, orgId, selectOrg]);

  // Partner-role users are locked to their reseller.
  useEffect(() => {
    if (meta?.partnerLocked && meta.resellerId && resellerId !== meta.resellerId) {
      selectReseller(meta.resellerId);
    }
  }, [meta?.partnerLocked, meta?.resellerId, resellerId, selectReseller]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search, setSearch]);

  const memberships = meta?.memberships ?? formOptions.memberships;
  const resellers = meta?.resellers ?? formOptions.resellers;
  const activeCatalog = catalog ?? meta?.catalog ?? formOptions.catalog;
  const currency = activeCatalog?.currency ?? "MMK";
  const showOrgSwitcher =
    (meta?.requiresOrgSelection || meta?.mode === "preview") && memberships.length > 1;
  const needsOrg = Boolean(meta?.requiresOrgSelection) && !orgId;
  const partnerLocked = Boolean(meta?.partnerLocked || meta?.mode === "partner");
  const showPartnerFilter =
    Boolean(orgId) && (partnerLocked || meta?.mode === "preview" || resellers.length > 0);
  const canSell = Boolean(activeCatalog?.canSell) && Boolean(resellerId);
  const contextReady = Boolean(orgId) || meta?.mode === "partner" || Boolean(meta?.orgId);

  const openIssue = () => {
    if (!resellerId) {
      message.warning("Select a partner before issuing tokens.");
      return;
    }
    setDetailOpen(false);
    setDrawerOpen(true);
  };

  const openDetail = (record: AccessTokenRecord) => {
    setSelected(record);
    setDetailOpen(true);
  };

  const handleIssue = async (values: IssueTokenFormValues) => {
    setSaving(true);
    try {
      const result = await issueTokens(values);
      setIssueResult(result);
      setDrawerOpen(false);
      setSuccessOpen(true);
      message.success(
        result.credentials.length === 1
          ? "Access token issued"
          : `${result.credentials.length} tokens issued`
      );
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, "Failed to issue tokens"));
    } finally {
      setSaving(false);
    }
  };

  const actionLabels: Record<CredentialLifecycleAction, string> = {
    pause: "Pause this token?",
    unlock: "Unlock this token for login?",
    allowNewDevice: "Allow a new device to use this token?",
    clearSessions: "Fix Session times for this token?",
    restoreActivated: "Restore this consumed token to activated?",
    revertToSold: "Revert this token to sold status?",
  };

  const handleApplyAction = (record: AccessTokenRecord, action: CredentialLifecycleAction) => {
    if (
      (action === "clearSessions" ||
        action === "restoreActivated" ||
        action === "revertToSold") &&
      !canManageSessionLifecycle
    ) {
      message.warning("This action is only available to Developer, Admin, or ORG_ADMIN.");
      return;
    }
    modal.confirm({
      title: actionLabels[action],
      content:
        action === "revertToSold"
          ? "Activation state will be cleared and leftover sessions ended. Org staff and developers only."
          : action === "pause"
            ? "The customer will not be able to log in until the token is unlocked."
            : action === "allowNewDevice"
              ? "Releases the current device slot (online session / recent portal login) so another phone or laptop can log in with this token. This does not add permanent multi-device capacity."
              : action === "clearSessions"
                ? "Corrects backdated login/logout times from RADIUS last update. Does not delete session rows. Remaining time is recomputed."
                : action === "restoreActivated"
                  ? "Clears leftover sessions and sets status back to Activated (or Expired if calendar expiry already passed)."
              : "The customer can log in again if the plan quota allows.",
      okText:
        action === "pause"
          ? "Pause"
          : action === "unlock"
            ? "Unlock"
            : action === "allowNewDevice"
              ? "Allow new device"
              : action === "clearSessions"
                ? "Fix Session"
                : action === "restoreActivated"
                  ? "Restore"
                  : "Revert",
      onOk: async () => {
        try {
          const updated = await applyTokenAction(record.id, action);
          setSelected(updated);
          message.success(
            action === "allowNewDevice"
              ? "Device binding cleared. Customer can log in from a new device now."
              : action === "clearSessions"
                ? "Session times were corrected"
                : "Token updated"
          );
        } catch (err: unknown) {
          message.error(getApiErrorMessage(err, "Failed to update token"));
        }
      },
    });
  };

  const handleDeleteSession = async (
    record: AccessTokenRecord,
    sessionId: string,
    source: "hot" | "archive" | "captive"
  ) => {
    try {
      await deleteTokenSession(record.id, sessionId, source);
      const updated = await loadToken(record.id);
      setSelected(updated);
      message.success("Session row deleted");
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, "Failed to delete session"));
      throw err;
    }
  };

  const handleRevoke = (record: AccessTokenRecord) => {
    modal.confirm({
      title: "Revoke access token?",
      content:
        record.sale
          ? "The token will be revoked and the linked sale order will be refunded (payment tender adjusted). This cannot be undone."
          : "The token will be marked revoked and cannot be used for login.",
      okText: "Revoke",
      okType: "danger",
      onOk: async () => {
        try {
          await revokeToken(record.id);
          message.success("Token revoked");
          setDetailOpen(false);
        } catch (err: unknown) {
          message.error(getApiErrorMessage(err, "Failed to revoke token"));
        }
      },
    });
  };

  return (
    <div className="p-0">
      <CommonHeader icon={KeyRound} />

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
            title="Failed to load access tokens"
            description={String(error)}
          />
        ) : null}

        <div className="flex flex-col gap-4">
          {showOrgSwitcher ? (
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
              description="Choose a tenant to issue access tokens."
            />
          ) : null}

          {contextReady && activeCatalog && resellerId && !canSell ? (
            <Alert
              type="warning"
              showIcon
              title="Partner not ready to sell"
              description={
                <span>
                  This partner needs mapped sites, sellable plans, and retail prices before tokens
                  can be issued.
                </span>
              }
            />
          ) : null}

          {meta?.mode === "partner" && contextReady && (meta.revokeWindowMinutes ?? 0) > 0 ? (
            <Alert
              type="info"
              showIcon
              title="Partner revoke policy"
              description={`You can revoke a sold token within ${meta.revokeWindowMinutes} minutes of sale. Pause and status changes require org staff.`}
            />
          ) : null}

          {contextReady ? (
            <>
              <AccessTokensStats meta={meta} currency={currency} loading={loading} />

              <Card
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <AccessTokensToolbar
                  search={search}
                  status={(params.status as CredentialStatus) ?? null}
                  planId={(params.planId as string) ?? null}
                  stationId={(params.stationId as string) ?? null}
                  resellerId={resellerId ?? null}
                  resellers={resellers}
                  showPartnerFilter={showPartnerFilter}
                  partnerLocked={partnerLocked}
                  catalog={activeCatalog}
                  loading={loading}
                  issueDisabled={!canSell}
                  onSearchChange={setSearchLocal}
                  onStatusChange={(status) =>
                    patchParams({ status: status ?? undefined, page: 1 })
                  }
                  onPlanChange={(planId) => patchParams({ planId: planId ?? undefined, page: 1 })}
                  onStationChange={(stationId) =>
                    patchParams({ stationId: stationId ?? undefined, page: 1 })
                  }
                  onPartnerChange={selectReseller}
                  onRefresh={refresh}
                  onIssue={openIssue}
                />
              </Card>

              <Card
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <AccessTokensTable
                  data={list}
                  currency={currency}
                  loading={loading}
                  page={params.page ?? 1}
                  pageSize={params.limit ?? 20}
                  total={meta?.total ?? 0}
                  onPaginationChange={setPagination}
                  onView={openDetail}
                  onRevoke={handleRevoke}
                />
              </Card>
            </>
          ) : initDone && !loading && !needsOrg && !error ? (
            <Alert
              type="warning"
              showIcon
              title="No organization context"
              description="Select an organization to view access tokens."
            />
          ) : null}
        </div>
      </div>

      <IssueTokenDrawer
        open={drawerOpen}
        saving={saving}
        catalog={activeCatalog}
        onClose={() => setDrawerOpen(false)}
        onIssue={handleIssue}
      />

      <TokenDetailDrawer
        open={detailOpen}
        tokenId={selected?.id ?? null}
        currency={currency}
        fallback={selected}
        onClose={() => {
          setDetailOpen(false);
          setSelected(null);
        }}
        onRevoke={handleRevoke}
        onApplyAction={handleApplyAction}
        onDeleteSession={handleDeleteSession}
        loadToken={loadToken}
      />

      <IssueSuccessModal
        open={successOpen}
        result={issueResult}
        onClose={() => {
          setSuccessOpen(false);
          setIssueResult(null);
        }}
      />
    </div>
  );
};

export default CommerceAccessTokensPage;
