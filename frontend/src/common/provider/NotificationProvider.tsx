"use client";

import React, { createContext, useContext, useMemo } from "react";
import { notification } from "antd";
import type { NotificationArgsProps } from "antd";

type NotificationPlacement = NotificationArgsProps["placement"];

interface NotificationContextProps {
  notify: (config: {
    message: string;
    description?: React.ReactNode;
    placement?: NotificationPlacement;
    type?: "info" | "success" | "error" | "warning";
  }) => void;
}

const NotificationContext = createContext<NotificationContextProps | null>(null);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [api, contextHolder] = notification.useNotification();

  const notify = ({
    message,
    description,
    placement = "topRight",
    type = "info",
  }: NotificationContextProps["notify"] extends (arg: infer A) => void ? A : never) => {
    api[type]({
      title: message,
      description,
      placement,
    });
  };

  const value = useMemo(() => ({ notify }), [api]);

  return (
    <NotificationContext.Provider value={value}>
      {contextHolder}
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotify = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    // Return a mock function instead of throwing an error
    // This prevents crashes in error boundaries or other contexts where provider might not be available
    return () => { };
  }
  return ctx.notify;
};
