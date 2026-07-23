"use client";

import React from "react";
import { theme } from "antd";
import { HomeOutlined } from "@ant-design/icons";
import CommonHeader from "@/common/components/@bdata/CommonHeader";
import SystemGuidePage from "@/features/home";
import { useSystemGuide } from "@/features/home/useSystemGuide";

function HomeHeader() {
  const guide = useSystemGuide();
  return <CommonHeader title={guide.title} icon={HomeOutlined as never} />;
}

export default function HomeRoutePage() {
  const { token } = theme.useToken();

  return (
    <div className="p-0">
      <HomeHeader />
      <div
        style={{
          height: "var(--content-body-height)",
          overflowY: "auto",
          background: token.colorBgLayout,
        }}
      >
        <SystemGuidePage />
      </div>
    </div>
  );
}
