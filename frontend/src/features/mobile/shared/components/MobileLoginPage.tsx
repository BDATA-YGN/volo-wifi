"use client";

import { useState } from "react";
import { Button, Form, Input } from "antd";
import { useRequest } from "ahooks";
import * as MobileAuth from "../query";
import { setMobileActorCookie, clearMobileActorCookie } from "../auth-cookie";
import { MOBILE_ROUTES } from "../constants";
import type { MobileActorType } from "../types";
import VoloLogo from "./VoloLogo";
import styles from "./mobile.module.css";

interface MobileLoginPageProps {
  actor: MobileActorType;
}

interface FormValues {
  username: string;
  password: string;
}

export default function MobileLoginPage({ actor }: MobileLoginPageProps) {
  const [error, setError] = useState<string | null>(null);
  const [form] = Form.useForm<FormValues>();

  const brandTitle = actor === "collector" ? "VOLO Collector" : "StarLink Customer";
  const homePath =
    actor === "collector" ? MOBILE_ROUTES.collector.home : MOBILE_ROUTES.customer.home;

  const { runAsync: submitLogin, loading } = useRequest(
    async (values: FormValues) => {
      setError(null);
      const result = await MobileAuth.mobileLogin(
        {
          username: values.username.trim(),
          password: values.password,
        },
        actor,
      );

      if (!result.success) {
        throw new Error(result.error?.message ?? "Login failed");
      }

      const profile = result.data?.data.profile;
      if (!profile || profile.actorType !== actor) {
        clearMobileActorCookie();
        throw new Error(
          actor === "collector"
            ? "This account is not a collector login."
            : "This account is not a customer login.",
        );
      }

      setMobileActorCookie(actor);
      window.location.href = homePath;
    },
    { manual: true },
  );

  const onFinish = async (values: FormValues) => {
    try {
      await submitLogin(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  };

  return (
    <div className={styles.loginCard}>
        <div className={styles.loginBrand}>
          <VoloLogo variant="full" height={72} title="VOLO" className={styles.loginBrandLogo} />
          <h1 className={styles.loginBrandTitle}>{brandTitle}</h1>
          <p className={styles.loginBrandSub}>Sign in to continue</p>
        </div>

        <div className={styles.errorText} role="alert">
          {error ?? "\u00A0"}
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          disabled={loading}
          autoComplete="off"
        >
          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: "Username is required" }]}
          >
            <Input size="large" autoComplete="username" placeholder="Username" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: "Password is required" }]}
          >
            <Input.Password size="large" autoComplete="current-password" placeholder="Password" />
          </Form.Item>

          <Form.Item className="!mb-0">
            <Button type="primary" htmlType="submit" size="large" block loading={loading}>
              Sign in
            </Button>
          </Form.Item>
        </Form>
    </div>
  );
}
