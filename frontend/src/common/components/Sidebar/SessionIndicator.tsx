"use client";

import { Badge, Dropdown, Progress, Space, Typography, Button, Modal, App } from "antd";
import { ClockCircleOutlined, LogoutOutlined, ReloadOutlined } from "@ant-design/icons";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/features/core/auth/store";
import dayjs from "dayjs";
import * as AuthHook from "@/features/core/auth/useAuth";

const { Text } = Typography;

/** Show warning modal and countdown during the last N seconds before expiry. */
const SESSION_WARNING_SECONDS = 30;

export function SessionIndicator() {
  const { age, clearAuthData } = useAuthStore();
  const { signOut, reAuthenticate } = AuthHook.useLoginUser();
  const { message } = App.useApp();
  const [modal, contextHolder] = Modal.useModal();

  const expiresAtMs = age ? dayjs(age).valueOf() : null;
  const [remainingTime, setRemainingTime] = useState(0);
  const [isAlertVisible, setIsAlertVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const sessionTotalRef = useRef(0);
  const autoLogoutStartedRef = useRef(false);
  const hasSyncedExpiryRef = useRef(false);
  /** Previous tick value — logout only on transition from >0 to 0 (not on first paint). */
  const prevSecondsLeftRef = useRef<number | null>(null);

  const router = useRouter();

  const isExpired =
    !age ||
    !Number.isFinite(expiresAtMs) ||
    (hasSyncedExpiryRef.current && remainingTime <= 0);

  const percentage =
    sessionTotalRef.current > 0
      ? Math.min(100, Math.max(0, (remainingTime / sessionTotalRef.current) * 100))
      : 0;

  const forceLogout = useCallback(async () => {
    if (autoLogoutStartedRef.current) return;
    autoLogoutStartedRef.current = true;
    setIsAlertVisible(false);
    setIsLoggingOut(true);
    clearAuthData();
    try {
      await signOut();
    } catch {
      window.location.href = "/signin";
    } finally {
      setIsLoggingOut(false);
    }
  }, [signOut, clearAuthData]);

  useEffect(() => {
    autoLogoutStartedRef.current = false;
    prevSecondsLeftRef.current = null;
    hasSyncedExpiryRef.current = false;
    sessionTotalRef.current = 0;
  }, [age]);

  useEffect(() => {
    if (!expiresAtMs || !Number.isFinite(expiresAtMs)) {
      hasSyncedExpiryRef.current = false;
      prevSecondsLeftRef.current = null;
      setRemainingTime(0);
      return;
    }

    const tick = () => {
      const secondsLeft = Math.max(
        0,
        Math.floor((expiresAtMs - Date.now()) / 1000),
      );
      setRemainingTime(secondsLeft);
      hasSyncedExpiryRef.current = true;

      if (sessionTotalRef.current === 0 && secondsLeft > 0) {
        sessionTotalRef.current = secondsLeft;
      }

      if (secondsLeft <= SESSION_WARNING_SECONDS && secondsLeft > 0) {
        setIsAlertVisible(true);
      } else if (secondsLeft > SESSION_WARNING_SECONDS) {
        setIsAlertVisible(false);
        autoLogoutStartedRef.current = false;
      }

      const prev = prevSecondsLeftRef.current;
      if (prev !== null && prev > 0 && secondsLeft === 0) {
        void forceLogout();
      }
      prevSecondsLeftRef.current = secondsLeft;
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [expiresAtMs, forceLogout]);

  const formatTime = (seconds: number): string => {
    if (seconds <= 0) return "Expired";

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) return `${hours}h ${minutes}m`;

    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const onSignOut = async () => {
    setIsAlertVisible(false);
    setIsLoggingOut(true);
    try {
      await signOut();
      message.success("Sign out success");
    } catch {
      window.location.href = "/signin";
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleSignOut = () => {
    modal.confirm({
      title: "Are you sure?",
      content: "Session will clear for your account",
      okText: "Sure",
      cancelText: "Cancel",
      onOk: onSignOut,
    });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await reAuthenticate();
      setIsAlertVisible(false);
      autoLogoutStartedRef.current = false;
      sessionTotalRef.current = 0;
      prevSecondsLeftRef.current = null;
    } catch {
      await forceLogout();
    } finally {
      setIsRefreshing(false);
    }
  };

  const warningSeconds = Math.min(SESSION_WARNING_SECONDS, remainingTime);

  const dropdownItems = [
    {
      key: "1",
      label: (
        <Space orientation="vertical" style={{ width: 250, padding: "8px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Text>Session expires in:</Text>
            <Text strong>{formatTime(remainingTime)}</Text>
          </div>

          <Progress
            percent={percentage}
            strokeColor={
              percentage > 50 ? "#52c41a" : percentage > 20 ? "#faad14" : "#ff4d4f"
            }
            showInfo={false}
            size="small"
            style={{ margin: "8px 0" }}
          />

          <Space>
            <Button
              size="small"
              onClick={handleRefresh}
              loading={isRefreshing}
              disabled={isLoggingOut}
              icon={<ReloadOutlined />}
            >
              Refresh
            </Button>
            <Button
              size="small"
              danger
              onClick={handleSignOut}
              disabled={isLoggingOut}
              icon={<LogoutOutlined />}
            >
              Logout
            </Button>
          </Space>
        </Space>
      ),
    },
  ];

  if (isExpired && !isLoggingOut) {
    return (
      <Button type="primary" onClick={() => router.push("/signin")}>
        Login
      </Button>
    );
  }

  return (
    <>
      <Modal
        title="Session Expiring Soon"
        open={isAlertVisible}
        onCancel={handleRefresh}
        footer={[
          <Button key="logout" danger onClick={onSignOut} loading={isLoggingOut}>
            Logout
          </Button>,
          <Button
            key="continue"
            type="primary"
            onClick={handleRefresh}
            loading={isRefreshing}
            disabled={isLoggingOut}
          >
            Continue Session
          </Button>,
        ]}
        closable={!isLoggingOut}
        maskClosable={false}
        keyboard={false}
      >
        <p>
          Your session will expire in <strong>{warningSeconds}</strong> second
          {warningSeconds === 1 ? "" : "s"}. You will be signed out automatically when
          the timer reaches zero.
        </p>
      </Modal>

      <Dropdown menu={{ items: dropdownItems }} placement="bottomRight" arrow>
        <Badge
          count={
            <div
              style={{
                background:
                  percentage > 50 ? "#52c41a" : percentage > 20 ? "#faad14" : "#ff4d4f",
                borderRadius: "50%",
                width: 12,
                height: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ClockCircleOutlined style={{ fontSize: 8, color: "white" }} />
            </div>
          }
        >
          <Button type="text" icon={<ClockCircleOutlined />} disabled={isLoggingOut}>
            {isAlertVisible ? formatTime(warningSeconds) : formatTime(remainingTime)}
          </Button>
        </Badge>
      </Dropdown>
      {contextHolder}
    </>
  );
}
