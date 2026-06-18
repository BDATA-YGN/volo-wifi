"use client";

import React from "react";
import { Col, Row } from "antd";
import OverviewPanel from "./OverviewPanel";
import AccountPanel from "./AccountPanel";
import SecurityPanel from "./SecurityPanel";
import PermissionList from "./PermissionList";
import { ProfileActions } from "./useProfileActions";

interface DetailsProps {
  activeKey: string;
  actions: ProfileActions;
}

/** Renders the tab panel content. Hero lives in `page.tsx` so it's always visible. */
const Details: React.FC<DetailsProps> = ({ activeKey, actions }) => {
  const { profile, savingProfile, savingPassword, saveProfile, savePassword } = actions;

  if (activeKey === "overview") return <OverviewPanel profile={profile} />;

  if (activeKey === "account")
    return <AccountPanel profile={profile} saving={savingProfile} onSubmit={saveProfile} />;

  if (activeKey === "security")
    return <SecurityPanel saving={savingPassword} onSubmit={savePassword} />;

  if (activeKey === "access") {
    return (
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <PermissionList
            title="Assigned role"
            permissions={profile.permissions}
            description="Roles control which features and menus you can access."
            color="blue"
          />
        </Col>
        <Col xs={24} lg={12}>
          <PermissionList
            title="Capabilities"
            permissions={[
              profile.isSuper ? "Super admin" : "",
              profile.isVerified ? "Verified account" : "",
              profile.isOnline ? "Currently online" : "",
            ].filter(Boolean)}
            description="Special flags that grant additional capabilities."
            color="green"
          />
        </Col>
      </Row>
    );
  }

  return null;
};

export default Details;
