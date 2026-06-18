"use client";

import React from "react";
import { Result } from "antd";
import { useAppSettingStore } from "@/features/system/app-setting/store";

type Props = { children: React.ReactNode };

/**
 * Blocks the authenticated console when `maintenance_mode` is enabled in App Settings.
 */
const MaintenanceGate: React.FC<Props> = ({ children }) => {
  const maintenance = useAppSettingStore((s) => s.getBool("maintenance_mode"));
  const message = useAppSettingStore((s) => s.get("maintenance_message"));
  const loaded = useAppSettingStore((s) => s.loaded);

  if (!loaded) return <>{children}</>;
  if (!maintenance) return <>{children}</>;

  return (
    <div style={{ padding: 48, maxWidth: 640, margin: "0 auto" }}>
      <Result
        status="warning"
        title="Maintenance in progress"
        subTitle={
          message?.trim() ||
          "VOLO - Subscription is under scheduled maintenance. Please try again shortly."
        }
      />
    </div>
  );
};

export default MaintenanceGate;
