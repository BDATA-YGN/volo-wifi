"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Form, Input, Spin } from "antd";
import { useRequest } from "ahooks";
import VoloLogo from "@/features/mobile/shared/components/VoloLogo";
import mobileStyles from "@/features/mobile/shared/components/mobile.module.css";
import { PARTNER_ROUTES } from "../constants";
import * as PartnerAuth from "../query";

interface FormValues {
  username: string;
  password: string;
}

export default function PartnerLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [form] = Form.useForm<FormValues>();
  const [prepDone, setPrepDone] = useState(false);

  useEffect(() => {
    void PartnerAuth.partnerPrepareLogin()
      .then((prep) => {
        if (prep.status === "already_logged_in") {
          router.replace(PARTNER_ROUTES.home);
          return;
        }
        setPrepDone(true);
      })
      .catch(() => setPrepDone(true));
  }, [router]);

  const { runAsync: submitLogin, loading } = useRequest(
    async (values: FormValues) => {
      setError(null);

      const result = await PartnerAuth.partnerSignIn({
        username: values.username.trim(),
        password: values.password,
      });

      if (!result.success) {
        throw new Error(result.error?.message ?? "Login failed");
      }

      window.location.href = PARTNER_ROUTES.home;
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

  if (!prepDone) {
    return (
      <div className={mobileStyles.loginCard} style={{ textAlign: "center", padding: "2rem" }}>
        <Spin />
      </div>
    );
  }

  return (
    <div className={mobileStyles.loginCard}>
      <div className={mobileStyles.loginBrand}>
        <VoloLogo
          variant="full"
          height={72}
          title="VOLO"
          plate="white"
          className={mobileStyles.loginBrandLogo}
        />
        <h1 className={mobileStyles.loginBrandTitle}>Volo Partner</h1>
        <p className={mobileStyles.loginBrandSub}>Sign in to sell WiFi tokens</p>
      </div>

      <div className={mobileStyles.errorText} role="alert">
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
