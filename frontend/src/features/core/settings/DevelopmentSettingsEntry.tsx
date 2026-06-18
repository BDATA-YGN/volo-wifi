"use client";

import React from "react";
import { AppSettingsPage } from "@/features/system/app-setting";

/**
 * Legacy development route `/settings` — same editor as **System → Settings**
 * (`app_settings` via `/app-settings` API).
 */
const Page = ({ activeKey }: { activeKey: string }) => {
  if (activeKey !== "1") return null;

  return (
    <div className="p-1">
      <AppSettingsPage />
    </div>
  );
};

export default Page;
