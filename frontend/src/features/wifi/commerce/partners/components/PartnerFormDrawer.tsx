"use client";

import React, { useMemo } from "react";
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
  Transfer,
  Typography,
} from "antd";
import type { TransferProps } from "antd";
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
import { useDrawerFormSync } from "@/features/wifi/shared/hooks";

const { TextArea } = Input;
const { Text, Paragraph } = Typography;

type SiteTransferItem = {
  key: string;
  title: string;
  description?: string;
  disabled?: boolean;
};

type SitesTransferProps = {
  value?: string[];
  onChange?: (next: string[]) => void;
  dataSource: SiteTransferItem[];
};

const SitesTransfer: React.FC<SitesTransferProps> = ({ value, onChange, dataSource }) => {
  const handleChange: TransferProps["onChange"] = (nextTargetKeys) => {
    onChange?.(nextTargetKeys.map(String));
  };

  return (
    <Transfer
      dataSource={dataSource}
      titles={["Available sites", "Mapped sites"]}
      targetKeys={value ?? []}
      onChange={handleChange}
      render={(item) => item.title}
      showSearch
      filterOption={(input, item) =>
        (item.title ?? "").toLowerCase().includes(input.toLowerCase()) ||
        (item.description ?? "").toLowerCase().includes(input.toLowerCase())
      }
      styles={{ section: { width: 260, height: 320 } }}
      oneWay={false}
    />
  );
};

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

  const formValues: PartnerFormFields = editing
    ? {
        code: editing.code,
        name: editing.name,
        phone: editing.phone ?? undefined,
        email: editing.email ?? undefined,
        address: editing.address ?? undefined,
        status: editing.status,
        stationIds: editing.stationIds.filter((id) =>
          formOptions.stations.length === 0
            ? true
            : formOptions.stations.some((s) => s.id === id)
        ),
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
  useDrawerFormSync(form, open, formValues, editing?.id ?? "create");

  const handleFinish = async (values: PartnerFormFields) => {
    // Include values from inactive tabs (Ant Form omits unmounted fields from `values`
    // when preserve is false — that wiped sites when saving from Plans, and vice versa).
    const allValues = form.getFieldsValue(true) as PartnerFormFields;
    const stationIds = allValues.stationIds ?? values.stationIds ?? [];
    const enabledPlanIds = allValues.enabledPlanIds ?? values.enabledPlanIds ?? [];

    const payload: PartnerFormValues = {
      code:
        values.code?.trim() ||
        (isCreate ? generateUniquePartnerCode(formOptions.existingCodes ?? []) : values.code),
      name: values.name,
      phone: values.phone,
      email: values.email,
      address: values.address,
      status: values.status,
      stationIds,
      planEntitlements: buildPlanEntitlementsFromForm(formOptions.plans, enabledPlanIds),
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
        required={!isCreate}
        extra={
          isCreate
            ? "Assigned automatically when you save"
            : "Partner code cannot be changed after creation"
        }
      >
        <Form.Item name="code" noStyle rules={isCreate ? [] : [{ required: true, message: "Code is required" }]}>
          <Input
            disabled
            placeholder={isCreate ? "Assigned on save" : undefined}
            style={{ fontFamily: "monospace", letterSpacing: isCreate ? "0.06em" : undefined }}
          />
        </Form.Item>
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
            extra="Choose a login username — it is not tied to the partner code"
          >
            <Input placeholder="partner.login" autoComplete="off" />
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

  const siteTransferData: SiteTransferItem[] = useMemo(() => {
    const byId = new Map(formOptions.stations.map((s) => [s.id, s]));
    const allowedIds = new Set(formOptions.stations.map((s) => s.id));
    for (const s of editing?.stations ?? []) {
      if (allowedIds.size === 0 || allowedIds.has(s.id)) byId.set(s.id, s);
    }
    return [...byId.values()].map((s) => ({
      key: s.id,
      title: `${s.code} — ${s.name}`,
      description: s.status,
      disabled: s.status === "DISABLED",
    }));
  }, [formOptions.stations, editing?.stations]);

  const sitesTab = (
    <>
      <Paragraph type="secondary" style={{ marginBottom: 12 }}>
        Sites this partner can sell at. Move sites to the right to map them — only mapped sites
        appear in their POS workspace.
      </Paragraph>
      {formOptions.stations.length === 0 && (editing?.stations?.length ?? 0) === 0 ? (
        <Alert
          type="warning"
          showIcon
          message="No sites available"
          description={
            <span>No sites are available to map for this partner.</span>
          }
        />
      ) : (
        <Form.Item
          name="stationIds"
          label="Mapped sites"
          extra="Left = available · Right = assigned to this partner"
        >
          <SitesTransfer dataSource={siteTransferData} />
        </Form.Item>
      )}
    </>
  );

  const plansTab = (
    <>
      <Paragraph type="secondary" style={{ marginBottom: 12 }}>
        Plans this partner is allowed to sell.
      </Paragraph>
      <Form.Item name="enabledPlanIds" hidden>
        <Input />
      </Form.Item>
      {formOptions.plans.length === 0 ? (
        <Alert
          type="warning"
          showIcon
          message="No service plans"
          description={
            <span>No service plans are available to enable for this partner.</span>
          }
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
    { key: "general", label: "General", forceRender: true, children: generalTab },
    { key: "sites", label: "Sites", forceRender: true, children: sitesTab },
    { key: "plans", label: "Plans", forceRender: true, children: plansTab },
  ];

  return (
    <Drawer
      title={editing ? `Edit ${editing.name}` : "New partner"}
      size={720}
      open={open}
      onClose={onClose}
      destroyOnHidden
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
          title={`Login: ${editing.portalAccount.username}`}
          description="Partner login credentials cannot be changed here."
        />
      ) : null}

      <Form
        form={form}
        layout="vertical"
        onFinish={(v) => void handleFinish(v)}
        preserve
        key={editing?.id ?? "create"}
      >
        <Tabs items={tabItems} />
      </Form>
    </Drawer>
  );
};

export default PartnerFormDrawer;
