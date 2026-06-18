"use client";

import React, { useEffect, useState, useCallback } from "react";
import { notification, Button, Badge, Dropdown, Modal } from "antd";
import { BellOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import { useSocket } from "@/lib/socket/SocketProvider";
import { EventObject, useLiveSocketDataStore } from "@/common/store/liveSocketStore";

// Define interfaces for type safety
interface Notification {
  id: string;
  type: "success" | "info" | "warning" | "error";
  message: string;
  timestamp: Date;
}

const NotificationSystem: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [api, contextHolder] = notification.useNotification();
  const { status, on } = useSocket();
  const { event, addEvent } = useLiveSocketDataStore();

  // Generate unique ID for notifications
  const generateUniqueId = useCallback((timestamp: string): string => {
    return `${timestamp}-${Math.random().toString(36).slice(2, 11)}`;
  }, []);

  // Create notification from event data
  const createNotification = useCallback(
    (event: EventObject): Notification | null => {
      return {
        id: event.timestamp.toString(),
        type: "success",
        message: event.data.message,
        timestamp: new Date(event.timestamp),
      };
    },
    [generateUniqueId]
  );

  // Handle incoming socket notifications
  useEffect(() => {
    const cleanup = on("notification", (data: EventObject) => {
      addEvent(data);
      const newNotification = createNotification(data);
      if (!newNotification) return;

      // Add to notifications list if not a duplicate
      setNotifications((prev) => {
        if (prev.some((n) => n.id === newNotification.id)) return prev;
        return [...prev, newNotification];
      });

      // Display notification
      api["success"]({
        title: "New Notification",
        description: newNotification.message,
        placement: "topRight",
        icon: <BellOutlined className="text-blue-500" />,
      });
    });

    return cleanup;
  }, [on, createNotification, api, addEvent]);

  // Handle clicking a notification in the dropdown
  const handleNotificationClick = useCallback((notif: Notification) => {
    setSelectedNotification(notif);
    setIsModalOpen(true);
  }, []);

  // Clear all notifications
  const handleClearNotifications = useCallback(() => {
    setNotifications([]);
    setIsModalOpen(false);
    setSelectedNotification(null);
  }, []);

  // Dropdown menu items
  const menuItems: MenuProps["items"] = notifications.map((notif) => ({
    key: notif.id,
    label: (
      <Button
        type="text"
        block
        onClick={() => handleNotificationClick(notif)}
        style={{
          textAlign: "left",
          borderLeft: `4px solid ${
            notif.type === "success"
              ? "#52c41a"
              : notif.type === "info"
              ? "#1890ff"
              : notif.type === "warning"
              ? "#faad14"
              : "#ff4d4f"
          }`,
          padding: "8px",
        }}
      >
        <div style={{ fontSize: "14px", fontWeight: 500 }}>{notif.message}</div>
        <div style={{ fontSize: "12px", color: "#8c8c8c" }}>
          {notif.timestamp.toLocaleTimeString()}
        </div>
      </Button>
    ),
  }));

  return (
    <>
      {contextHolder}
      <Dropdown menu={{ items: menuItems }} placement="bottomRight" trigger={["click"]} arrow>
        <Badge count={notifications.length} size="small">
          <Button
            type="text"
            icon={<BellOutlined style={{ fontSize: "14px" }} />}
            style={{ border: "none" }}
          />
        </Badge>
      </Dropdown>

      <Modal
        title="Notification Details"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={[
          <Button key="clear" onClick={handleClearNotifications}>
            Clear All
          </Button>,
          <Button key="close" onClick={() => setIsModalOpen(false)}>
            Close
          </Button>,
        ]}
      >
        {selectedNotification && (
          <div style={{ padding: "16px" }}>
            <div style={{ padding: "16px", borderRadius: "8px", background: "#fafafa" }}>
              <h3 style={{ marginBottom: "8px", fontWeight: 500 }}>Message</h3>
              <p>{selectedNotification.message}</p>
              <div style={{ fontSize: "14px", color: "#8c8c8c", marginTop: "8px" }}>
                Received at: {selectedNotification.timestamp.toLocaleString()}
              </div>
            </div>
            <div style={{ fontSize: "14px", color: "#8c8c8c", marginTop: "16px" }}>
              Type: <span style={{ textTransform: "capitalize" }}>{selectedNotification.type}</span>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default NotificationSystem;