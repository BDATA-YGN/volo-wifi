"use client";

import { theme } from "antd";
import { UserAddOutlined } from "@ant-design/icons";
import CommonHeader from "@/common/components/@bdata/CommonHeader";
import { TenantRegistrationPage } from "@/features/wifi/billing/tenant-registration";

export default function TenantRegistrationRoutePage() {
  const { token } = theme.useToken();

  return (
    <div className="p-0">
      <CommonHeader title="Tenant Registration" icon={UserAddOutlined as any} />
      <div
        style={{
          height: "var(--content-body-height)",
          overflowY: "auto",
          background: token.colorBgLayout,
        }}
      >
        <div style={{ padding: "20px 24px", maxWidth: 1280, margin: "0 auto" }}>
          <TenantRegistrationPage />
        </div>
      </div>
    </div>
  );
}
