"use client";

import React, { useMemo } from "react";
import { Button, Form, Input, Modal, Progress, Tag, Typography } from "antd";
import type { MemberResetPasswordValues, OrgMemberRecord } from "../types";
import {
  getPasswordStrengthChecklist,
  passwordMeetsStrengthRules,
  scorePassword,
} from "@/lib/passwordStrength";

const { Text } = Typography;

type Props = {
  open: boolean;
  saving?: boolean;
  member: OrgMemberRecord | null;
  onClose: () => void;
  onSubmit: (password: string) => Promise<void>;
};

const ResetPasswordModal: React.FC<Props> = ({ open, saving, member, onClose, onSubmit }) => {
  const [form] = Form.useForm<MemberResetPasswordValues>();
  const password = Form.useWatch("password", form) ?? "";
  const confirmPassword = Form.useWatch("confirmPassword", form) ?? "";
  const passwordStrength = useMemo(() => scorePassword(password), [password]);
  const passwordRules = useMemo(() => getPasswordStrengthChecklist(password), [password]);

  const validatePassword = async (_: unknown, value: string) => {
    if (!value || value.trim() === "") {
      return Promise.reject(new Error("Password is required"));
    }
    if (!passwordMeetsStrengthRules(value)) {
      return Promise.reject(new Error("Password must meet all strength requirements"));
    }
    return Promise.resolve();
  };

  return (
    <Modal
      title={member ? `Reset password — ${member.admin.fullName}` : "Reset password"}
      open={open}
      onCancel={() => {
        if (saving) return;
        form.resetFields();
        onClose();
      }}
      destroyOnHidden
      footer={
        <div className="flex justify-end gap-2">
          <Button
            onClick={() => {
              form.resetFields();
              onClose();
            }}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="primary" loading={saving} onClick={() => form.submit()}>
            Update password
          </Button>
        </div>
      }
    >
      {member ? (
        <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
          Set a new password for <Text code>{member.admin.username}</Text>. The same password
          policy as create/edit applies.
        </Text>
      ) : null}

      <Form
        form={form}
        layout="vertical"
        disabled={saving}
        onFinish={async (values) => {
          await onSubmit(values.password.trim());
          form.resetFields();
        }}
      >
        <Form.Item name="password" label="New password" rules={[{ validator: validatePassword }]}>
          <Input.Password autoComplete="new-password" />
        </Form.Item>

        {password ? (
          <div style={{ marginBottom: 16, marginTop: -8 }}>
            <div style={{ marginBottom: 8 }}>
              <Text type="secondary" style={{ fontSize: 12, marginRight: 8 }}>
                Strength:
              </Text>
              <Tag
                style={{
                  background: passwordStrength.color,
                  color: "#fff",
                  border: "none",
                }}
              >
                {passwordStrength.label}
              </Tag>
            </div>
            <Progress
              percent={passwordStrength.percent}
              strokeColor={passwordStrength.color}
              showInfo={false}
              size="small"
            />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 8,
                marginTop: 8,
              }}
            >
              {passwordRules.map((rule) => (
                <Text
                  key={rule.label}
                  type={rule.ok ? "success" : "secondary"}
                  style={{ fontSize: 12 }}
                >
                  {rule.ok ? "✓" : "○"} {rule.label}
                </Text>
              ))}
            </div>
          </div>
        ) : null}

        <Form.Item
          name="confirmPassword"
          label="Confirm password"
          dependencies={["password"]}
          rules={[
            { required: true, message: "Please confirm the password" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("password") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error("Passwords do not match"));
              },
            }),
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>

        {confirmPassword && password !== confirmPassword ? (
          <Text type="danger" style={{ fontSize: 12 }}>
            Passwords do not match
          </Text>
        ) : null}
      </Form>
    </Modal>
  );
};

export default ResetPasswordModal;
