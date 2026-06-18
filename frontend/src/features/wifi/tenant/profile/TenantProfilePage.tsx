"use client";

import React, { useEffect, useState } from "react";
import { getApiErrorMessage } from "@/common/exceptions/handleApiError";
import Link from "next/link";
import { Alert, App, Col, Row, Spin, Typography, theme } from "antd";
import { Settings } from "lucide-react";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import { useTenantProfile } from "./useTenantProfile";
import ProfileStats from "./components/ProfileStats";
import OrgSwitcher from "./components/OrgSwitcher";
import ProfileSettingsForm from "./components/ProfileSettingsForm";
import SubscriptionSummaryCard from "./components/SubscriptionSummaryCard";
import type { TenantProfileFormValues } from "./types";

const { Paragraph } = Typography;

const TenantProfilePage: React.FC = () => {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [saving, setSaving] = useState(false);

  const {
    profile,
    meta,
    loading,
    error,
    requiresSelection,
    orgId,
    selectOrg,
    refresh,
    updateProfile,
  } = useTenantProfile();

  useEffect(() => {
    if (requiresSelection && meta?.memberships?.length === 1) {
      selectOrg(meta.memberships[0].id);
    }
  }, [requiresSelection, meta?.memberships, selectOrg]);

  const memberships = meta?.memberships ?? [];
  const showSwitcher = requiresSelection || (meta?.canSwitchOrg && memberships.length > 1);

  const handleSubmit = async (values: TenantProfileFormValues) => {
    setSaving(true);
    try {
      await updateProfile(values);
      message.success("Tenant profile saved");
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, "Failed to save profile"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-0">
      <CommonHeader icon={Settings} />

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
            Manage your organization profile — display name, regional defaults, captive portal
            messaging, and entity code prefixes. Subscription limits are shown for reference.
          </Paragraph>
        </div>

        {error ? (
          <Alert
            type="error"
            showIcon
            className="mb-4"
            title="Failed to load tenant profile"
            description={String(error)}
            action={
              <button type="button" className="text-sm underline" onClick={() => refresh()}>
                Retry
              </button>
            }
          />
        ) : null}

        <Spin spinning={loading && !profile}>
          <div className="flex flex-col gap-4">
            {showSwitcher ? (
              <OrgSwitcher
                memberships={memberships}
                value={orgId}
                required={requiresSelection}
                loading={loading}
                onChange={selectOrg}
              />
            ) : null}

            {requiresSelection && !orgId ? (
              <Alert
                type="info"
                showIcon
                title="Select an organization to continue"
                description="Choose a tenant from the list above to load profile settings."
              />
            ) : null}

            {profile ? (
              <>
                <ProfileStats
                  profile={profile}
                  planCount={meta?.planCount}
                  loading={loading}
                />

                <Row gutter={[24, 24]}>
                  <Col xs={24} xl={16}>
                    <ProfileSettingsForm
                      profile={profile}
                      saving={saving}
                      onSubmit={handleSubmit}
                    />
                  </Col>
                  <Col xs={24} xl={8}>
                    <div className="flex flex-col gap-4">
                      <SubscriptionSummaryCard profile={profile} />
                      <Alert
                        type="info"
                        showIcon
                        title="Next steps"
                        description={
                          <div className="flex flex-col gap-1">
                            <Link href="/wifi/tenant/access-control">Access control</Link>
                            <Link href="/wifi/sites">Site directory</Link>
                            <Link href="/wifi/catalog/service-plans">Service plans</Link>
                          </div>
                        }
                      />
                    </div>
                  </Col>
                </Row>
              </>
            ) : !requiresSelection && !loading ? (
              <Alert
                type="warning"
                showIcon
                title="No organization linked"
                description={
                  <>
                    Your account is not associated with a tenant.{" "}
                    <Link href="/wifi/billing/tenant-registration">Register a tenant</Link> or
                    contact a platform administrator.
                  </>
                }
              />
            ) : null}
          </div>
        </Spin>
      </div>
    </div>
  );
};

export default TenantProfilePage;
