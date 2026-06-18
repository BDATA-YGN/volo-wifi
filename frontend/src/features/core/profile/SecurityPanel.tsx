"use client";

import React, { useMemo } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  Progress,
  Row,
  Space,
  Tag,
  theme,
  Typography,
} from "antd";
import { LockOutlined, SafetyCertificateOutlined, SaveOutlined } from "@ant-design/icons";
import { PasswordUpdate, scorePassword, getPasswordStrengthChecklist, passwordMeetsStrengthRules } from "./profile";

const { Text } = Typography;

interface Props {
  saving?: boolean;
  onSubmit: (values: PasswordUpdate) => Promise<void> | void;
}

const SecurityPanel: React.FC<Props> = ({ saving, onSubmit }) => {
  const { token } = theme.useToken();
  const [form] = Form.useForm<PasswordUpdate>();
  const newPassword = Form.useWatch("newPassword", form) || "";
  const confirmPassword = Form.useWatch("confirmPassword", form) || "";
  const strength = useMemo(() => scorePassword(newPassword), [newPassword]);
  const matchesConfirm = !!newPassword && newPassword === confirmPassword;

  const rules = useMemo(() => getPasswordStrengthChecklist(newPassword), [newPassword]);
  const allRulesOk = passwordMeetsStrengthRules(newPassword);
  const canSubmit = allRulesOk && matchesConfirm;

  return (
    <Card
      variant="borderless"
      title={
        <Space size={8} align="center">
          <SafetyCertificateOutlined style={{ color: token.colorPrimary }} />
          <span style={{ fontWeight: 600 }}>Change password</span>
        </Space>
      }
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        title="Choose a strong password you don't use anywhere else."
        description="Logging out of other sessions is recommended after changing your password."
      />

      <Form
        layout="vertical"
        form={form}
        onFinish={(values) => onSubmit(values)}
        requiredMark="optional"
      >
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="New password"
              name="newPassword"
              rules={[
                { required: true, message: "Please enter a new password" },
                { min: 8, message: "Use at least 8 characters" },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Enter new password"
                autoComplete="new-password"
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="Confirm password"
              name="confirmPassword"
              dependencies={["newPassword"]}
              rules={[
                { required: true, message: "Please confirm your password" },
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
              />
            </Form.Item>
          </Col>
        </Row>

        <div style={{ marginBottom: 16 }}>
          <Space size={8} align="center" style={{ marginBottom: 4 }}>
            <Text type="secondary">Strength:</Text>
            <Tag color={strength.color === "#d9d9d9" ? "default" : undefined} style={{ background: strength.color, color: "#fff", border: "none" }}>
              {strength.label}
            </Tag>
          </Space>
          <Progress
            percent={strength.percent}
            strokeColor={strength.color}
            showInfo={false}
            size="small"
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 8,
            marginBottom: 16,
          }}
        >
          {rules.map((r) => (
            <Text
              key={r.label}
              type={r.ok ? "success" : "secondary"}
              style={{ fontSize: 12 }}
            >
              {r.ok ? "✓" : "○"} {r.label}
            </Text>
          ))}
        </div>

        <Button
          type="primary"
          htmlType="submit"
          icon={<SaveOutlined />}
          disabled={!canSubmit}
          loading={saving}
        >
          Update password
        </Button>
      </Form>
    </Card>
  );
};

export default SecurityPanel;
