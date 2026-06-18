"use client";

import React, { useEffect, useMemo, useState } from "react";
import { App, Col, Row, theme } from "antd";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import * as MainUseCase from "@/features/core/permissions/usePermission";

import RoleListPanel, {
  type RoleListItem,
} from "./components/RoleListPanel";
import RolePermissionsPanel, {
  type Mapping,
} from "./components/RolePermissionsPanel";

const AdminRolesPage: React.FC = () => {
  const { message } = App.useApp();
  const { token } = theme.useToken();

  const {
    fetchMngRoles,
    mngRolesList,
    mngRoleSettingsList,
    loading,
  } = MainUseCase.useManagement();

  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [countsByRole, setCountsByRole] = useState<
    Record<number, { granted: number; total: number } | undefined>
  >({});

  useEffect(() => {
    void (async () => {
      try {
        await fetchMngRoles("", { take: 1000, skip: 0, page: 1, limit: 1000 });
      } catch {
        message.error("Failed to fetch roles");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-select first role once roles are loaded
  useEffect(() => {
    if (!selectedRoleId && mngRolesList.length > 0) {
      setSelectedRoleId(mngRolesList[0].roleId);
    }
  }, [mngRolesList, selectedRoleId]);

  const roles = useMemo<RoleListItem[]>(
    () =>
      mngRolesList.map((r: any) => ({
        roleId: r.roleId,
        roleName: r.roleName,
        description: r.description,
      })),
    [mngRolesList],
  );

  const selectedRole = useMemo(
    () => roles.find((r) => r.roleId === selectedRoleId) ?? null,
    [roles, selectedRoleId],
  );

  const handleMappingsChange = (roleId: number, mappings: Mapping[]) => {
    const total = mngRoleSettingsList.length;
    const granted = mappings.filter((m) => m.enable).length;
    setCountsByRole((prev) => ({ ...prev, [roleId]: { granted, total } }));
  };

  return (
    <div className="p-0">
      <CommonHeader />
      <div
        style={{
          height: "var(--content-body-height)",
          overflowY: "auto",
          background: token.colorBgLayout,
          padding: 20,
        }}
      >
        <Row gutter={[20, 20]}>
          <Col xs={24} md={9} lg={7} xl={6}>
            <div style={{ position: "sticky", top: 0 }}>
              <RoleListPanel
                roles={roles}
                loading={!!loading?.fetchMngRoles}
                selectedRoleId={selectedRoleId}
                onSelect={setSelectedRoleId}
                countsByRole={countsByRole}
              />
            </div>
          </Col>

          <Col xs={24} md={15} lg={17} xl={18}>
            <RolePermissionsPanel
              selectedRole={selectedRole}
              onMappingsChange={handleMappingsChange}
            />
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default AdminRolesPage;
