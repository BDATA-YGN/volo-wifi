"use client";

import React from "react";
import { Alert } from "antd";
import OrgSwitcher from "@/features/wifi/tenant/profile/components/OrgSwitcher";
import type { OrgMembershipOption } from "@/features/wifi/tenant/profile/types";

type Props = {
  memberships: OrgMembershipOption[];
  orgId: string | undefined;
  showOrgSwitcher: boolean;
  needsOrg: boolean;
  loading?: boolean;
  onSelectOrg: (orgId: string) => void;
  requiredDescription?: string;
};

const WifiOrgScopeBar: React.FC<Props> = ({
  memberships,
  orgId,
  showOrgSwitcher,
  needsOrg,
  loading,
  onSelectOrg,
  requiredDescription = "Choose a tenant to view and manage network resources for that organization.",
}) => {
  if (!showOrgSwitcher && !needsOrg) {
    return null;
  }

  return (
    <>
      {showOrgSwitcher ? (
        <OrgSwitcher
          memberships={memberships}
          value={orgId}
          required={needsOrg}
          loading={loading}
          onChange={onSelectOrg}
        />
      ) : null}

      {needsOrg ? (
        <Alert
          type="info"
          showIcon
          title="Select an organization"
          description={requiredDescription}
        />
      ) : null}
    </>
  );
};

export default WifiOrgScopeBar;
