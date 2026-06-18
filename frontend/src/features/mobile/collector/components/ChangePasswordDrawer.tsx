"use client";

import { useMemo, useState } from "react";
import { App, Button, Drawer, Form, Input, Progress } from "antd";
import { LockOutlined } from "@ant-design/icons";
import {
  getPasswordStrengthChecklist,
  passwordMeetsStrengthRules,
  scorePassword,
} from "@/lib/passwordStrength";
import * as MobileAuth from "@/features/mobile/shared/query";
import type { MobileActorType } from "@/features/mobile/shared/types";
import {
  MobileDrawerBody,
  mobileDrawerStyleProps,
  useMobileDrawerChrome,
} from "@/features/mobile/shared/components/MobileDrawerChrome";
import styles from "./profile.module.css";

interface ChangePasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ChangePasswordDrawerProps {
  open: boolean;
  onClose: () => void;
  actor?: MobileActorType;
}

export default function ChangePasswordDrawer({
  open,
  onClose,
  actor = "collector",
}: ChangePasswordDrawerProps) {
  const { message } = App.useApp();
  const { colorScheme } = useMobileDrawerChrome(actor);
  const [form] = Form.useForm<ChangePasswordForm>();
  const [submitting, setSubmitting] = useState(false);

  const newPassword = Form.useWatch("newPassword", form) || "";
  const confirmPassword = Form.useWatch("confirmPassword", form) || "";

  const strength = useMemo(() => scorePassword(newPassword), [newPassword]);
  const rules = useMemo(() => getPasswordStrengthChecklist(newPassword), [newPassword]);
  const allRulesOk = passwordMeetsStrengthRules(newPassword);
  const matchesConfirm = !!newPassword && newPassword === confirmPassword;
  const canSubmit = allRulesOk && matchesConfirm;

  const handleClose = () => {
    form.resetFields();
    onClose();
  };

  const onFinish = async (values: ChangePasswordForm) => {
    setSubmitting(true);
    try {
      const result = await MobileAuth.mobileChangePassword(
        {
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        },
        actor,
      );

      if (!result.success) {
        throw new Error(result.error?.message ?? "Failed to update password");
      }

      message.success("Password updated successfully");
      handleClose();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      title="Change password"
      placement="bottom"
      size="auto"
      open={open}
      onClose={handleClose}
      destroyOnHidden
      styles={mobileDrawerStyleProps(colorScheme, {
        body: { paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0))" },
      })}
    >
      <MobileDrawerBody actor={actor}>
      <div className={styles.drawerBody}>
        <div className={styles.drawerHint}>
          Use a strong password you do not reuse elsewhere. You will stay signed in on this device.
        </div>

        <Form form={form} layout="vertical" onFinish={onFinish} requiredMark="optional">
          <Form.Item
            label="Current password"
            name="currentPassword"
            rules={[{ required: true, message: "Enter your current password" }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Current password"
              autoComplete="current-password"
              size="large"
            />
          </Form.Item>

          <Form.Item
            label="New password"
            name="newPassword"
            rules={[
              { required: true, message: "Enter a new password" },
              { min: 8, message: "Use at least 8 characters" },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="New password"
              autoComplete="new-password"
              size="large"
            />
          </Form.Item>

          <Form.Item
            label="Confirm new password"
            name="confirmPassword"
            dependencies={["newPassword"]}
            rules={[
              { required: true, message: "Confirm your new password" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("newPassword") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("Passwords do not match"));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Re-enter new password"
              autoComplete="new-password"
              size="large"
            />
          </Form.Item>

          {newPassword ? (
            <>
              <div className={styles.strengthBlock}>
                <div className={styles.strengthLabel}>
                  <span>Password strength</span>
                  <span
                    className={styles.strengthTag}
                    style={{ background: strength.color }}
                  >
                    {strength.label}
                  </span>
                </div>
                <Progress
                  percent={strength.percent}
                  strokeColor={strength.color}
                  showInfo={false}
                  size="small"
                />
              </div>

              <div className={styles.ruleList}>
                {rules.map((rule) => (
                  <div
                    key={rule.label}
                    className={`${styles.ruleItem} ${rule.ok ? styles.ruleOk : styles.rulePending}`}
                  >
                    {rule.ok ? "✓" : "○"} {rule.label}
                  </div>
                ))}
              </div>
            </>
          ) : null}

          <Button
            type="primary"
            htmlType="submit"
            block
            size="large"
            loading={submitting}
            disabled={!canSubmit}
          >
            Update password
          </Button>
        </Form>
      </div>
      </MobileDrawerBody>
    </Drawer>
  );
}
