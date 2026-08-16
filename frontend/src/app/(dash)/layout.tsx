"use client";
import DashLayout from "@/common/components/Layout";
import MaintenanceGate from "@/common/components/MaintenanceGate";
import RouteGuard from "@/common/components/RouteGuard";
import React, { ReactNode, useEffect } from "react";
import { useSocketStatus } from "@/lib/socket/SocketProvider";
import { useGlobalAppSettings } from "@/features/system/app-setting/useGlobalAppSettings";

function AppSettingsStoreBootstrap() {
  useGlobalAppSettings();
  return null;
}

const RootLayout = ({ children }: { children: ReactNode }) => {
  const { isConnected, status, reconnectAttempts, lastError } = useSocketStatus();

  useEffect(() => {
    console.log(`[Dashboard] Socket status: ${status}, Connected: ${isConnected}, Attempts: ${reconnectAttempts}`);
    if (lastError) {
      console.log(`[Dashboard] Socket error: ${lastError}`);
    }
  }, [status, isConnected, reconnectAttempts, lastError]);

  return (
    <DashLayout>
      <AppSettingsStoreBootstrap />
      <MaintenanceGate>
        <RouteGuard>{children}</RouteGuard>
      </MaintenanceGate>
    </DashLayout>
  );
};

export default RootLayout;
