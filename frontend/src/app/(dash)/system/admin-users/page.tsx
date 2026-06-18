"use client";

import { theme } from "antd";
import { TeamOutlined } from "@ant-design/icons";
import CommonHeader from "@/common/components/@bdata/CommonHeader";
import { AdminUsersPage } from "@/features/system/admin-users";

export default function AdminUsersRoutePage() {
  const { token } = theme.useToken();

  return (
    <div className="p-0">
      <CommonHeader title="Admin users" icon={TeamOutlined as any} />
      <div
        style={{
          height: "var(--content-body-height)",
          overflowY: "auto",
          background: token.colorBgLayout,
        }}
      >
        <div style={{ padding: "20px 24px" }}>
          <AdminUsersPage />
        </div>
      </div>
    </div>
  );
}
