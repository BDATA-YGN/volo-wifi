"use client";

import React from "react";
import { theme } from "antd";
import BreadCrumb from "./Breadcrumb";

const { useToken } = theme;

export default function BreadcrumbBar() {
  const { token } = useToken();

  return (
    <div
      style={{
        background: token.colorBgContainer,
        borderBottom: `1px solid ${token.colorSplit}`,
        padding: `6px ${token.paddingLG}px`,
      }}
    >
      <BreadCrumb />
    </div>
  );
}

