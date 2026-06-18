"use client";

import React, { useCallback, useEffect, useMemo } from "react";
import {
  Alert,
  Button,
  Col,
  Drawer,
  Form,
  Grid,
  Input,
  Progress,
  Row,
  Select,
  Space,
  Switch,
  Tag,
  theme,
  Typography,
} from "antd";
import {
  ClearOutlined,
  LockOutlined,
  SaveOutlined,
  UserOutlined,
} from "@ant-design/icons";
import FormItemBuilder from "@/common/components/Form/FormItemBuilder";
import {
  getPasswordStrengthChecklist,
  passwordMeetsStrengthRules,
  scorePassword,
} from "@/lib/passwordStrength";

import type { AdminUserFormValues } from "../types";

const { Text } = Typography;
const { useBreakpoint } = Grid;

interface AdminUserFormDrawerProps {
  open: boolean;
  editingRecord: Record<string, unknown> | null;
  saving?: boolean;
  rolesLoading?: boolean;
  roles: Array<{ roleId: number; roleName: string }>;
  onClose: () => void;
  onSubmit: (values: AdminUserFormValues) => Promise<void> | void;
}

const DrawerHeading: React.FC<{ editingRecord: Record<string, unknown> | null }> = ({
  editingRecord,
}) => {
  const { token } = theme.useToken();
  return (
    <Space>
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: token.colorPrimaryBg,
          color: token.colorPrimary,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <UserOutlined />
      </div>
      <div>
        <Text strong style={{ fontSize: 16 }}>
          {editingRecord ? "Edit administrator" : "Add administrator"}
        </Text>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {editingRecord
              ? `Updating ${String(editingRecord.username ?? "")}`
              : "Create a new console user and assign a role."}
          </Text>
        </div>
      </div>
    </Space>
  );
};

const AdminUserFormDrawer: React.FC<AdminUserFormDrawerProps> = ({
  open,
  editingRecord,
  saving,
  rolesLoading,
  roles,
  onClose,
  onSubmit,
}) => {
  const [form] = Form.useForm<AdminUserFormValues>();
  const screens = useBreakpoint();
  const { token } = theme.useToken();

  /** Restore form to how it was when the drawer opened (edit = server row; create = empty + defaults). */
  const restoreInitialFormValues = useCallback(() => {
    if (editingRecord) {
      form.setFieldsValue({
        fullName: editingRecord.fullName as string,
        username: editingRecord.username as string,
        email: editingRecord.email as string,
        phoneNumber: editingRecord.phoneNumber as string,
        roleId: editingRecord.roleId as number,
        isActive: (editingRecord.isActive as boolean) ?? false,
        isVerified: (editingRecord.isVerified as boolean) ?? false,
        isBlocked: (editingRecord.isBlocked as boolean) ?? false,
        password: undefined,
        confirmPassword: undefined,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        isActive: true,
        isVerified: false,
        isBlocked: false,
      });
    }
  }, [editingRecord, form]);

  useEffect(() => {
    if (!open) return;
    restoreInitialFormValues();
  }, [open, editingRecord, restoreInitialFormValues]);

  const passwordWatch = Form.useWatch("password", form) || "";
  const strength = useMemo(() => scorePassword(passwordWatch), [passwordWatch]);
  const checklist = useMemo(
    () => getPasswordStrengthChecklist(passwordWatch),
    [passwordWatch]
  );

  const validatePassword = async (_: unknown, value: string) => {
    if (editingRecord && (!value || value.trim() === "")) {
      return Promise.resolve();
    }
    if (!editingRecord && (!value || value.trim() === "")) {
      return Promise.reject(new Error("Please enter a password"));
    }
    if (value && !passwordMeetsStrengthRules(value)) {
      return Promise.reject(new Error("Password must meet all strength requirements"));
    }
    return Promise.resolve();
  };

  const drawerWidth: number | string = screens.lg ? 720 : screens.md ? 560 : "100%";

  return (
    <Drawer
      title={<DrawerHeading editingRecord={editingRecord} />}
      open={open}
      onClose={onClose}
      styles={{ wrapper: { width: drawerWidth, maxWidth: "100vw" } }}
      destroyOnHidden
      maskClosable={!saving}
      keyboard={!saving}
      footer={
        <Space style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button icon={<ClearOutlined />} onClick={() => restoreInitialFormValues()} disabled={saving}>
            Reset
          </Button>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={saving}
            onClick={() => form.submit()}
          >
            {editingRecord ? "Save changes" : "Create administrator"}
          </Button>
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        scrollToFirstError
        requiredMark="optional"
        onFinish={(values) => onSubmit(values)}
        initialValues={{
          isActive: true,
          isVerified: false,
          isBlocked: false,
        }}
      >
        <Row gutter={[16, 8]}>
          <Col xs={24} sm={12}>
            <FormItemBuilder
              name="fullName"
              label="Full name"
              required
              inputType="text"
              placeholder="Full name"
              icon="username"
            />
          </Col>
          <Col xs={24} sm={12}>
            <FormItemBuilder
              name="username"
              label="Username"
              required
              inputType="text"
              icon="username"
              placeholder="Unique login"
            />
          </Col>
          <Col xs={24} sm={12}>
            <FormItemBuilder
              name="email"
              label="Email"
              required={false}
              inputType="text"
              placeholder="name@company.com"
              icon="email"
            />
          </Col>
          <Col xs={24} sm={12}>
            <FormItemBuilder
              name="phoneNumber"
              label="Phone"
              required={false}
              inputType="text"
              placeholder="+95 …"
              icon="phone"
            />
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              label="Role"
              name="roleId"
              rules={[{ required: true, message: "Select a role" }]}
            >
              <Select
                placeholder="Select a role"
                loading={!!rolesLoading}
                allowClear={false}
                options={roles.map((role) => ({
                  value: role.roleId,
                  label: role.roleName,
                }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Space size="large" wrap>
              <Form.Item name="isActive" label="Active" valuePropName="checked" style={{ marginBottom: 0 }}>
                <Switch />
              </Form.Item>
              <Form.Item name="isVerified" label="Verified" valuePropName="checked" style={{ marginBottom: 0 }}>
                <Switch />
              </Form.Item>
              <Form.Item name="isBlocked" label="Blocked" valuePropName="checked" style={{ marginBottom: 0 }}>
                <Switch />
              </Form.Item>
            </Space>
          </Col>
        </Row>

        <div
          style={{
            borderTop: `1px solid ${token.colorBorderSecondary}`,
            margin: "20px 0 16px",
          }}
        />

        <Alert
          type="info"
          showIcon
          title={editingRecord ? "Password (optional)" : "Password required for new users"}
          description="Use the same strength rules as your profile security screen: length, mixed case, number, and symbol."
          style={{ marginBottom: 16 }}
        />

        <Row gutter={[16, 8]}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Password"
              name="password"
              rules={[{ validator: validatePassword }]}
              extra={editingRecord ? "Leave blank to keep the current password." : undefined}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder={editingRecord ? "New password (optional)" : "Create a strong password"}
                autoComplete="new-password"
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="Confirm password"
              name="confirmPassword"
              dependencies={["password"]}
              rules={[
                ({ getFieldValue }) => ({
                  async validator(_, value: string) {
                    const pw = getFieldValue("password") as string | undefined;
                    if (editingRecord && !pw && !value) return Promise.resolve();
                    if (!editingRecord && !value) {
                      return Promise.reject(new Error("Please confirm the password"));
                    }
                    if (pw && value !== pw) {
                      return Promise.reject(new Error("Passwords do not match"));
                    }
                    return Promise.resolve();
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Repeat password"
                autoComplete="new-password"
              />
            </Form.Item>
          </Col>
        </Row>

        <div style={{ marginBottom: 12 }}>
          <Space size={8} align="center" style={{ marginBottom: 4 }} wrap>
            <Text type="secondary">Strength:</Text>
            <Tag
              color={strength.color === "#d9d9d9" ? "default" : undefined}
              style={{
                background: strength.color,
                color: "#fff",
                border: "none",
              }}
            >
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
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 8,
          }}
        >
          {checklist.map((r) => (
            <Text key={r.label} type={r.ok ? "success" : "secondary"} style={{ fontSize: 12 }}>
              {r.ok ? "✓" : "○"} {r.label}
            </Text>
          ))}
        </div>
      </Form>
    </Drawer>
  );
};

export default AdminUserFormDrawer;
