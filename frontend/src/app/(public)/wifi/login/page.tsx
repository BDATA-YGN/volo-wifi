"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Form, Input, Button, Switch, theme as antdTheme, Typography, Divider } from "antd";
import { useTranslations } from "next-intl";
import { SunOutlined, MoonOutlined } from "@ant-design/icons";
import { useLoginUser } from "@/features/core/auth/useAuth";
import { useMenuStore } from "@/features/core/menu/menu";
import { useThemeStore } from "@/common/store/themeStore";
import LocaleSwitcher from "@/common/components/LocalSwitcher/LocaleSwitcher";
import { useAppSettings } from "@/common/provider/AppSettingsContentProvider";
import { LOGIN_UI } from "../../../../../config";
import CacheImage from "@/common/components/@bdata/CacheImage";
import {
  buildLoginFeedback,
  formatLockCountdown,
  type LoginFeedback,
} from "@/features/core/auth/loginError";
import { useSystemReadiness } from "@/features/core/auth/useSystemReadiness";
import SignInReadinessPanel from "./SignInReadinessPanel";
import { CONSOLE_HOME_PATH } from "@/lib/auth/console-paths";

const { Title, Text } = Typography;

/** Set `false` to hide the left logo / login image panel on md+ screens. */
const SHOW_LOGIN_SIDEBAR = false;

const ASCII_PRINTABLE = /^[\x20-\x7E]+$/;
const toAsciiOnly = (value: string): string => value.replace(/[^\x20-\x7E]/g, "");

interface FormValues {
  email: string;
  password: string;
}

const SignInPage: React.FC = () => {
  const t = useTranslations("login_page");
  const { login, fetchMe, loading } = useLoginUser();
  const [feedback, setFeedback] = useState<LoginFeedback | null>(null);
  const [lockTick, setLockTick] = useState(0);
  const { setMenus } = useMenuStore();
  const { theme, toggleTheme } = useThemeStore();

  const { token } = antdTheme.useToken();
  const [form] = Form.useForm<FormValues>();
  const email = Form.useWatch("email", form);
  const password = Form.useWatch("password", form);

  const isLocked =
    feedback?.kind === "locked" &&
    feedback.lockedUntilMs !== undefined &&
    feedback.lockedUntilMs > Date.now();

  const displayMessage = (() => {
    if (!feedback) return null;
    if (feedback.kind === "locked" && feedback.lockedUntilMs) {
      const countdown = formatLockCountdown(feedback.lockedUntilMs);
      return t("error_account_locked_countdown", { countdown });
    }
    return feedback.message;
  })();

  const canSubmit =
    Boolean(email?.trim()) &&
    Boolean(password?.trim()) &&
    !loading &&
    !isLocked;

  const { appSettings } = useAppSettings();
  const { state: readinessState, refresh: refreshReadiness, isReady } = useSystemReadiness();

  const asciiRule = {
    pattern: ASCII_PRINTABLE,
    message: t("error_ascii_only"),
  };

  useEffect(() => {
    if (!feedback?.lockedUntilMs || feedback.lockedUntilMs <= Date.now()) return;
    const id = window.setInterval(() => {
      setLockTick((n) => n + 1);
      if (Date.now() >= feedback.lockedUntilMs!) {
        setFeedback(null);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [feedback?.lockedUntilMs, feedback?.kind]);

  void lockTick;

  const onFinish = async (values: FormValues) => {
    try {
      setFeedback(null);
      await login(values.email.trim(), values.password);

      const userData = await fetchMe();
      setMenus(userData.menus);

      window.location.href = CONSOLE_HOME_PATH;
    } catch (err: unknown) {
      setFeedback(buildLoginFeedback(err, t));
    }
  };

  const onFinishFailed = useCallback((errorInfo: unknown) => {
    console.log("Form submission failed:", errorInfo);
  }, []);

  const clearFeedback = () => {
    if (feedback !== null) {
      setFeedback(null);
    }
  };

  const setAsciiField = (field: keyof FormValues, raw: string) => {
    form.setFieldValue(field, toAsciiOnly(raw));
    clearFeedback();
  };

  const feedbackClass =
    feedback?.kind === "locked"
      ? "text-amber-500"
      : feedback?.kind === "blocked"
        ? "text-orange-500"
        : "text-red-600";

  const LoginForm = () => (
    <Form
      form={form}
      name="signIn"
      initialValues={{ email: "", password: "" }}
      onFinish={onFinish}
      onFinishFailed={onFinishFailed}
      disabled={loading || isLocked}
      autoComplete="off"
      layout="vertical"
      className="w-full max-w-sm mx-auto"
    >
      <div
        className={`text-sm w-full text-center pb-2 min-h-[2.5rem] leading-snug ${feedbackClass}`}
        role="alert"
        aria-live="polite"
      >
        {displayMessage ?? "\u00A0"}
      </div>
      <Form.Item
        name="email"
        label={t("label_email")}
        rules={[
          { required: true, message: t("error_message_email") },
          { whitespace: true, message: t("error_message_email") },
          asciiRule,
        ]}
      >
        <Input
          size="large"
          placeholder={t("placeholder_email")}
          autoComplete="username"
          autoFocus
          inputMode="text"
          lang="en"
          onChange={(e) => setAsciiField("email", e.target.value)}
        />
      </Form.Item>

      <Form.Item
        name="password"
        label={t("label_password")}
        rules={[
          { required: true, message: t("error_message_password") },
          asciiRule,
        ]}
      >
        <Input.Password
          size="large"
          placeholder={t("placeholder_password")}
          autoComplete="current-password"
          inputMode="text"
          lang="en"
          onChange={(e) => setAsciiField("password", e.target.value)}
          onPressEnter={() => form.submit()}
        />
      </Form.Item>

      <Form.Item className="pt-4 mb-0">
        <Button
          size="large"
          type="primary"
          htmlType="submit"
          loading={loading}
          block
          disabled={!canSubmit}
        >
          {isLocked ? formatLockCountdown(feedback!.lockedUntilMs!) : t("login_button_text")}
        </Button>
      </Form.Item>
    </Form>
  );

  const starterForm = () => (
    <div className="flex flex-col items-center justify-center w-full max-w-sm mx-auto gap-1 pt-4 text-center">
      <Text type="secondary" className="text-xs sm:text-sm">
        Powered by {LOGIN_UI.author} &copy; {new Date().getFullYear()},
      </Text>
      <Text type="secondary" className="text-xs sm:text-sm">
        Version {appSettings?.app_version}, {`BUILD NUMBER: ${LOGIN_UI.buildNumber}`}
      </Text>
    </div>
  );

  const backgroundColor = theme === "dark" ? token.colorBgContainer : token.colorBgElevated;
  const bgStyles = {
    backgroundColor,
    transition: "background-color 0.3s ease-in-out",
  };

  const formStyles = {
    backgroundColor: theme === "dark" ? "#1f1f1f" : "#fcfcfc",
    transition: "background-color 0.3s ease-in-out",
  };

  return (
    <div
      className="flex min-h-screen min-h-dvh w-full items-center justify-center transition-colors duration-300 overflow-x-hidden relative p-4 sm:p-6"
      style={bgStyles}
      data-theme={theme}
    >
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10 pointer-events-none [&>*]:pointer-events-auto">
        <Switch
          checked={theme === "dark"}
          onChange={toggleTheme}
          checkedChildren={<SunOutlined />}
          unCheckedChildren={<MoonOutlined />}
          aria-label="Toggle theme"
        />
        <LocaleSwitcher />
      </div>

      <div
        className={`relative z-10 flex w-full flex-col overflow-hidden rounded-xl shadow-2xl ${
          SHOW_LOGIN_SIDEBAR
            ? "max-w-[400px] sm:max-w-[440px] md:max-w-[680px] md:flex-row md:items-stretch"
            : "max-w-[400px] sm:max-w-[440px]"
        }`}
        style={formStyles}
      >
        {SHOW_LOGIN_SIDEBAR ? (
          <div className="hidden md:block md:w-[38%] lg:w-[34%] max-w-[260px] shrink-0 bg-white relative overflow-hidden min-h-[280px]">
            <CacheImage
              imageUrl={appSettings?.login_icon}
              className="h-full w-full object-cover"
              width={260}
              height={360}
            />
            <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-gray-900/50 flex items-center justify-center">
              <CacheImage
                imageUrl={appSettings?.app_icon}
                className="w-12 h-12 rounded-full object-contain"
                width={48}
                height={48}
              />
            </div>
          </div>
        ) : null}

        <div
          className="flex flex-1 min-w-0 flex-col justify-between px-4 py-6 sm:px-6 sm:py-8 md:px-8"
          style={formStyles}
        >
          <div className="w-full max-w-sm mx-auto">
            {/*             <div
              className="flex justify-center mb-3"
              style={
                theme === "dark"
                  ? ({
                      "--mobile-logo-plate-bg": "#141414",
                      "--mobile-logo-plate-border": "#303030",
                    } as React.CSSProperties)
                  : undefined
              }
            >
              <VoloLogo variant="full" height={56} title="VOLO" />
            </div> */}
            <Title level={4} className="!mb-0 text-center">
              {appSettings?.app_name}
            </Title>
            <Text type="secondary" className="block text-center text-sm">
              {appSettings?.login_text}
            </Text>
            <Divider className="!my-4" />
          </div>

          <SignInReadinessPanel
            state={readinessState}
            onRetry={refreshReadiness}
            appSettings={appSettings}
          />

          {isReady ? (
            <>
              {LoginForm()}
              {starterForm()}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

SignInPage.displayName = "SignInPage";

export default SignInPage;
