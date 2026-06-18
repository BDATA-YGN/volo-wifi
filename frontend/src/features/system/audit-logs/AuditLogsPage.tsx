"use client";

import React, { useState } from "react";
import { Segmented, theme } from "antd";
import { AuditOutlined, LoginOutlined } from "@ant-design/icons";

import CommonHeader from "@/common/components/@bdata/CommonHeader";

import AuditTrailPanel from "./components/AuditTrailPanel";
import LoginHistoryPanel from "./components/LoginHistoryPanel";
import RetentionBanner from "./components/RetentionBanner";

type TabKey = "audit" | "login";

const AuditLogsPage: React.FC = () => {
  const { token } = theme.useToken();
  const [tab, setTab] = useState<TabKey>("audit");

  return (
    <div className="p-0">
      <CommonHeader
        extras={
          <Segmented<TabKey>
            value={tab}
            onChange={(v) => setTab(v)}
            options={[
              {
                label: (
                  <span>
                    <AuditOutlined style={{ marginRight: 6 }} />
                    Audit trail
                  </span>
                ),
                value: "audit",
              },
              {
                label: (
                  <span>
                    <LoginOutlined style={{ marginRight: 6 }} />
                    Login history
                  </span>
                ),
                value: "login",
              },
            ]}
          />
        }
      />
      <div
        style={{
          height: "var(--content-body-height)",
          overflowY: "auto",
          background: token.colorBgLayout,
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <RetentionBanner />
        {tab === "audit" ? <AuditTrailPanel /> : <LoginHistoryPanel />}
      </div>
    </div>
  );
};

export default AuditLogsPage;
