"use client";

import React, { useMemo } from "react";
import {
  Button,
  Drawer,
  Form,
  Input,
  Progress,
  Select,
  Switch,
  Tag,
  Typography,
} from "antd";
import type {
  AccessControlFormOptions,
  MemberCreateFormValues,
  OrgMemberRecord,
  ProvisionMemberRoleCode,
} from "../types";
import {
  formatMemberRoleLabel,
  isLockedMemberRoleCode,
  isProvisionMemberRoleCode,
  normalizeMemberRoleCode,
  PROVISION_ROLE_OPTIONS,
} from "../constant";
import {
  getPasswordStrengthChecklist,
  passwordMeetsStrengthRules,
  scorePassword,
} from "@/lib/passwordStrength";
import { useDrawerFormSync } from "@/features/wifi/shared/hooks";

const { Text } = Typography;

type Props = {
  open: boolean;
  saving?: boolean;
  editing: OrgMemberRecord | null;
  formOptions: AccessControlFormOptions;
  onClose: () => void;
  onCreate: (values: MemberCreateFormValues) => Promise<void>;
  onUpdate: (id: string, values: MemberCreateFormValues) => Promise<void>;
};

function provisionRoleCodesFromMember(record: OrgMemberRecord): ProvisionMemberRoleCode[] {
  return [
    ...new Set(
      record.roles
        .map((role) => normalizeMemberRoleCode(role.roleCode))
        .filter((code): code is ProvisionMemberRoleCode => code != null && isProvisionMemberRoleCode(code))
    ),
  ];
}

function buildMemberFormValues(editing: OrgMemberRecord | null): MemberCreateFormValues {
  if (editing) {
    return {
      username: editing.admin.username,
      fullName: editing.admin.fullName,
      email: editing.admin.email ?? "",
      phoneNumber: editing.admin.phoneNumber ?? "",
      title: editing.title ?? undefined,
      status: editing.status,
      isPrimary: editing.isPrimary,
      roleCodes: provisionRoleCodesFromMember(editing),
      stationIds: editing.stationScopes.map((s) => s.stationId),
      password: "",
      confirmPassword: "",
    };
  }

  return {
    username: "",
    fullName: "",
    email: "",
    phoneNumber: "",
    title: undefined,
    status: "ACTIVE",
    isPrimary: false,
    roleCodes: ["ORG_VIEWER"],
    stationIds: [],
    password: "",
    confirmPassword: "",
  };
}

const MemberFormDrawer: React.FC<Props> = ({
  open,
  saving,
  editing,
  formOptions,
  onClose,
  onCreate,
  onUpdate,
}) => {
  const [form] = Form.useForm<MemberCreateFormValues>();
  const password = Form.useWatch("password", form) ?? "";
  const confirmPassword = Form.useWatch("confirmPassword", form) ?? "";
  const passwordStrength = useMemo(() => scorePassword(password), [password]);
  const passwordRules = useMemo(() => getPasswordStrengthChecklist(password), [password]);
  useDrawerFormSync(form, open, buildMemberFormValues(editing), editing?.id ?? "create");

  const validatePassword = async (_: unknown, value: string | undefined) => {
    // Create: required. Edit: optional unless filled.
    if (editing) {
      if (!value || value.trim() === "") return Promise.resolve();
    } else if (!value || value.trim() === "") {
      return Promise.reject(new Error("Password is required"));
    }
    if (!passwordMeetsStrengthRules(value)) {
      return Promise.reject(new Error("Password must meet all strength requirements"));
    }
    return Promise.resolve();
  };

  const roleOptions = PROVISION_ROLE_OPTIONS.filter((option) =>
    formOptions.roleCodes.length
      ? formOptions.roleCodes.includes(option.value as ProvisionMemberRoleCode)
      : true
  );

  const lockedRoleLabels = editing
    ? [
        ...new Set(
          editing.roles
            .map((role) => normalizeMemberRoleCode(role.roleCode))
            .filter((code): code is NonNullable<typeof code> => code != null && isLockedMemberRoleCode(code))
            .map((code) => formatMemberRoleLabel(code))
        ),
      ]
    : [];

  const handleFinish = async (values: MemberCreateFormValues) => {
    const { confirmPassword: _confirm, password: nextPassword, ...rest } = values;
    const payload: MemberCreateFormValues = {
      ...rest,
      ...(nextPassword && nextPassword.trim() ? { password: nextPassword.trim() } : {}),
    };
    if (editing) {
      await onUpdate(editing.id, payload);
    } else {
      await onCreate(payload);
    }
  };

  const passwordFields = (
    <>
      <Form.Item
        name="password"
        label={editing ? "New password (optional)" : "Password"}
        rules={[{ validator: validatePassword }]}
      >
        <Input.Password autoComplete="new-password" placeholder={editing ? "Leave blank to keep current" : undefined} />
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
          ({ getFieldValue }) => ({
            validator(_, value) {
              const pwd = getFieldValue("password");
              if (!pwd || String(pwd).trim() === "") return Promise.resolve();
              if (!value) return Promise.reject(new Error("Please confirm the password"));
              if (pwd === value) return Promise.resolve();
              return Promise.reject(new Error("Passwords do not match"));
            },
          }),
        ]}
      >
        <Input.Password autoComplete="new-password" />
      </Form.Item>

      {confirmPassword && password && password !== confirmPassword ? (
        <Text type="danger" style={{ fontSize: 12, display: "block", marginBottom: 16 }}>
          Passwords do not match
        </Text>
      ) : null}
    </>
  );

  return (
    <Drawer
      title={editing ? `Edit ${editing.admin.fullName}` : "Provision team member"}
      size={520}
      open={open}
      onClose={onClose}
      destroyOnHidden
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="primary" loading={saving} onClick={() => form.submit()}>
            {editing ? "Save changes" : "Provision member"}
          </Button>
        </div>
      }
    >
      {open ? (
        <Form
          key={editing?.id ?? "create"}
          form={form}
          layout="vertical"
          disabled={saving}
          onFinish={handleFinish}
        >
          {!editing ? (
            <Form.Item
              name="fullName"
              label="Full name"
              rules={[{ required: true, message: "Full name is required" }]}
            >
              <Input autoComplete="name" />
            </Form.Item>
          ) : null}

          <Form.Item
            name="username"
            label="Username"
            rules={[
              { required: true, message: "Username is required" },
              { min: 3, message: "At least 3 characters" },
            ]}
          >
            <Input disabled={Boolean(editing)} autoComplete="off" />
          </Form.Item>

          {passwordFields}

          {!editing ? (
            <>
              <Form.Item name="email" label="Email" rules={[{ type: "email" }]}>
                <Input type="email" autoComplete="email" />
              </Form.Item>
              <Form.Item name="phoneNumber" label="Phone">
                <Input autoComplete="tel" />
              </Form.Item>
            </>
          ) : null}

          <Form.Item name="title" label="Job title">
            <Input placeholder="e.g. Network Administrator" />
          </Form.Item>

          <Form.Item name="status" label="Membership status">
            <Select
              options={[
                { value: "ACTIVE", label: "Active" },
                { value: "SUSPENDED", label: "Suspended" },
                { value: "DISABLED", label: "Disabled" },
              ]}
            />
          </Form.Item>

          <Form.Item name="isPrimary" label="Primary membership" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item
            name="roleCodes"
            label="Roles"
            rules={[{ required: true, message: "Select at least one role" }]}
          >
            <Select
              mode="multiple"
              optionFilterProp="label"
              placeholder="Admin, Site operations, Finance, Viewer"
              options={roleOptions.map((option) => ({
                value: option.value,
                label: option.label,
                title: option.description,
              }))}
            />
          </Form.Item>

          {lockedRoleLabels.length > 0 ? (
            <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 16 }}>
              Locked: {lockedRoleLabels.join(", ")}. Partner is managed from the Partners menu and
              cannot be changed here.
            </Text>
          ) : null}

          <Form.Item name="stationIds" label="Site allow-list">
            <Select
              mode="multiple"
              allowClear
              placeholder="All sites (no restriction)"
              optionFilterProp="label"
              options={formOptions.stations.map((s) => ({
                value: s.id,
                label: `${s.name} (${s.code})`,
              }))}
            />
          </Form.Item>

          <Text type="secondary" style={{ fontSize: 12 }}>
            Leave site allow-list empty to grant org-wide site access according to role.
          </Text>
        </Form>
      ) : null}
    </Drawer>
  );
};

export default MemberFormDrawer;
