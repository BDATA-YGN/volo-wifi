"use client";

import React, { useEffect, useMemo } from "react";
import {
  Alert,
  Button,
  Drawer,
  Form,
  Input,
  Progress,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import { LockOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import {
  getPasswordStrengthChecklist,
  passwordMeetsStrengthRules,
  scorePassword,
} from "@/lib/passwordStrength";
import type { PartnerDetail, PartnerFormValues, PartnersFormOptions, PlanOption } from "../types";
import { STATUS_OPTIONS } from "../constant";
import {
  buildPlanEntitlementsFromForm,
  enabledPlanIdsFromEntitlements,
  generateUniquePartnerCode,
} from "../utils";

const { TextArea } = Input;
const { Text, Paragraph } = Typography;

type PartnerFormFields = PartnerFormValues & {
  enabledPlanIds: string[];
  confirmPassword?: string;
};

type Props = {
  open: boolean;
  saving?: boolean;
  editing: PartnerDetail | null;
  formOptions: PartnersFormOptions;
  onClose: () => void;
  onCreate: (values: PartnerFormValues) => Promise<void>;
  onUpdate: (id: string, values: PartnerFormValues) => Promise<void>;
};

type PlanRow = PlanOption & { key: string };

const PartnerFormDrawer: React.FC<Props> = ({
  open,
  saving,
  editing,
  formOptions,
  onClose,
  onCreate,
  onUpdate,
}) => {
  const [form] = Form.useForm<PartnerFormFields>();
  const isCreate = !editing;

  const loginPassword = Form.useWatch("loginPassword", form) ?? "";
  const confirmPassword = Form.useWatch("confirmPassword", form) ?? "";
  const passwordStrength = useMemo(() => scorePassword(loginPassword), [loginPassword]);
  const passwordRules = useMemo(
    () => getPasswordStrengthChecklist(loginPassword),
    [loginPassword]
  );

  const validatePassword = async (_: unknown, value: string) => {
    if (!value || value.trim() === "") {
      return Promise.reject(new Error("Password is required"));
    }
    if (!passwordMeetsStrengthRules(value)) {
      return Promise.reject(new Error("Password must meet all strength requirements"));
    }
    return Promise.resolve();
  };

  const initialEnabledPlanIds = useMemo(() => {
    if (editing) {
      return enabledPlanIdsFromEntitlements(editing.planEntitlements);
    }
    return [];
  }, [editing]);

  const applyGeneratedCode = () => {
    const code = generateUniquePartnerCode(formOptions.existingCodes ?? []);
    form.setFieldsValue({
      code,
      loginUsername: code.toLowerCase(),
    });
    return code;
  };

  useEffect(() => {
    if (!open || editing) return;
    const code = generateUniquePartnerCode(formOptions.existingCodes ?? []);
    form.setFieldsValue({
      code,
      loginUsername: code.toLowerCase(),
    });
  }, [open, editing, formOptions.existingCodes, form]);

  const initialValues = editing
    ? {
        code: editing.code,
        name: editing.name,
        phone: editing.phone ?? undefined,
        email: editing.email ?? undefined,
        address: editing.address ?? undefined,
        status: editing.status,
        stationIds: editing.stationIds,
        enabledPlanIds: initialEnabledPlanIds,
      }
    : {
        code: "",
        name: "",
        status: "ACTIVE" as const,
        stationIds: [] as string[],
        enabledPlanIds: [] as string[],
        loginUsername: "",
        loginPassword: "",
        confirmPassword: "",
      };

  const handleFinish = async (values: PartnerFormFields) => {
    const payload: PartnerFormValues = {
      code: values.code,
      name: values.name,
      phone: values.phone,
      email: values.email,
      address: values.address,
      status: values.status,
      stationIds: values.stationIds ?? [],
      planEntitlements: buildPlanEntitlementsFromForm(
        formOptions.plans,
        values.enabledPlanIds ?? []
      ),
    };

    if (isCreate) {
      payload.loginUsername = values.loginUsername?.trim();
      payload.loginPassword = values.loginPassword;
      await onCreate(payload);
    } else {
      await onUpdate(editing!.id, payload);
    }
  };

  const enabledPlanIds = Form.useWatch("enabledPlanIds", form) ?? [];

  const planColumns: ColumnsType<PlanRow> = [
    {
      title: "Plan",
      key: "plan",
      render: (_, row) => (
        <div>
          <Tag style={{ fontFamily: "monospace", marginRight: 6 }}>{row.code}</Tag>
          <Text>{row.name}</Text>
          {!row.isActive ? (
            <Tag color="default" style={{ marginLeft: 6 }}>
              Inactive
            </Tag>
          ) : null}
        </div>
      ),
    },
    {
      title: "Sellable",
      key: "enabled",
      width: 100,
      align: "center",
      render: (_, row) => (
        <Switch
          size="small"
          checked={enabledPlanIds.includes(row.id)}
          disabled={!row.isActive}
          onChange={(checked) => {
            const current: string[] = form.getFieldValue("enabledPlanIds") ?? [];
            const next = checked
              ? [...new Set([...current, row.id])]
              : current.filter((id) => id !== row.id);
            form.setFieldValue("enabledPlanIds", next);
          }}
        />
      ),
    },
  ];

  const planData: PlanRow[] = formOptions.plans.map((p) => ({ ...p, key: p.id }));

  const generalTab = (
    <>
      {isCreate ? (
        <Alert
          type="info"
          showIcon
          className="mb-4"
          title="Partner profile & console login"
          description="Creates the reseller record and a PARTNER-role login in one step. Display name is used for both the partner and the login account."
        />
      ) : null}

      <Form.Item
        label="Partner code"
        required
        extra={
          isCreate
            ? "Auto-generated 8-character code — unique per tenant"
            : "Partner code cannot be changed after creation"
        }
      >
        {isCreate ? (
          <Space.Compact style={{ width: "100%" }}>
            <Form.Item
              name="code"
              noStyle
              rules={[{ required: true, message: "Code is required" }]}
            >
              <Input
                readOnly
                style={{ fontFamily: "monospace", letterSpacing: "0.06em" }}
              />
            </Form.Item>
            <Button onClick={applyGeneratedCode}>Regenerate</Button>
          </Space.Compact>
        ) : (
          <Form.Item name="code" noStyle rules={[{ required: true, message: "Code is required" }]}>
            <Input disabled style={{ fontFamily: "monospace" }} />
          </Form.Item>
        )}
      </Form.Item>

      <Form.Item
        name="name"
        label="Display name"
        rules={[{ required: true, message: "Name is required" }, { min: 2 }]}
        extra={
          isCreate
            ? "Used for the partner listing and the console login account"
            : undefined
        }
      >
        <Input placeholder="Downtown reseller" />
      </Form.Item>

      {isCreate ? (
        <>
          <Form.Item
            name="loginUsername"
            label="Username"
            rules={[
              { required: true, message: "Username is required" },
              { min: 3, message: "At least 3 characters" },
            ]}
            extra="Suggested from partner code — editable before create"
          >
            <Input placeholder="a3k9m2x7" autoComplete="off" />
          </Form.Item>

          <Form.Item
            name="loginPassword"
            label="Password"
            rules={[{ validator: validatePassword }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Create a strong password"
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Confirm password"
            dependencies={["loginPassword"]}
            rules={[
              { required: true, message: "Please confirm the password" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("loginPassword") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("Passwords do not match"));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Re-enter password"
              autoComplete="new-password"
            />
          </Form.Item>

          {loginPassword ? (
            <>
              <div style={{ marginBottom: 12 }}>
                <Space size={8} align="center" style={{ marginBottom: 4 }} wrap>
                  <Text type="secondary">Strength:</Text>
                  <Tag
                    color={passwordStrength.color === "#d9d9d9" ? "default" : undefined}
                    style={{
                      background: passwordStrength.color,
                      color: "#fff",
                      border: "none",
                    }}
                  >
                    {passwordStrength.label}
                  </Tag>
                </Space>
                <Progress
                  percent={passwordStrength.percent}
                  strokeColor={passwordStrength.color}
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
            </>
          ) : null}

          {confirmPassword && loginPassword !== confirmPassword ? (
            <Text type="danger" style={{ fontSize: 12, display: "block", marginBottom: 16 }}>
              Passwords do not match
            </Text>
          ) : null}
        </>
      ) : null}

      <Form.Item name="phone" label="Phone">
        <Input placeholder="+95 9 …" />
      </Form.Item>

      <Form.Item name="email" label="Email" rules={[{ type: "email" }]}>
        <Input placeholder="partner@example.com" />
      </Form.Item>

      <Form.Item name="address" label="Address">
        <TextArea rows={2} placeholder="Optional business address" />
      </Form.Item>

      <Form.Item name="status" label="Status" rules={[{ required: true }]}>
        <Select options={STATUS_OPTIONS} />
      </Form.Item>
    </>
  );

  const sitesTab = (
    <>
      <Paragraph type="secondary" style={{ marginBottom: 12 }}>
        Sites this partner can sell at. Only mapped sites appear in their POS workspace.
      </Paragraph>
      {formOptions.stations.length === 0 ? (
        <Alert
          type="warning"
          showIcon
          message="No sites configured"
          description="Add sites in Site Directory before mapping partners."
        />
      ) : (
        <Form.Item name="stationIds" label="Mapped sites">
          <Select
            mode="multiple"
            showSearch
            optionFilterProp="label"
            placeholder="Select one or more sites"
            options={formOptions.stations.map((s) => ({
              value: s.id,
              label: `${s.code} — ${s.name}`,
              disabled: s.status === "DISABLED",
            }))}
          />
        </Form.Item>
      )}
    </>
  );

  const plansTab = (
    <>
      <Paragraph type="secondary" style={{ marginBottom: 12 }}>
        Plans this partner is allowed to sell. Configure retail prices under{" "}
        <Text strong>Retail Pricing</Text> (RESELLER scope).
      </Paragraph>
      <Form.Item name="enabledPlanIds" hidden>
        <Input />
      </Form.Item>
      {formOptions.plans.length === 0 ? (
        <Alert
          type="warning"
          showIcon
          message="No service plans"
          description="Create plans in Service Plans before assigning entitlements."
        />
      ) : (
        <Table<PlanRow>
          size="small"
          pagination={false}
          columns={planColumns}
          dataSource={planData}
          scroll={{ y: 280 }}
        />
      )}
    </>
  );

  const tabItems = [
    { key: "general", label: "General", children: generalTab },
    { key: "sites", label: "Sites", children: sitesTab },
    { key: "plans", label: "Plans", children: plansTab },
  ];

  return (
    <Drawer
      title={editing ? `Edit ${editing.name}` : "New partner"}
      size={560}
      open={open}
      onClose={onClose}
      destroyOnClose={false}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="primary" loading={saving} onClick={() => form.submit()}>
            {editing ? "Save changes" : "Create partner & login"}
          </Button>
        </div>
      }
    >
      {editing?.portalAccount ? (
        <Alert
          type="info"
          showIcon
          className="mb-4"
          message={`Login: ${editing.portalAccount.username}`}
          description="Partner login credentials cannot be changed here."
        />
      ) : null}

      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onFinish={handleFinish}
        preserve={false}
        key={editing?.id ?? "create"}
      >
        <Tabs items={tabItems} />
      </Form>
    </Drawer>
  );
};

export default PartnerFormDrawer;
