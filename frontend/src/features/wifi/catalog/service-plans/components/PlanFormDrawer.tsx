"use client";

import React from "react";
import {
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  Radio,
  Select,
  Space,
  Switch,
  Typography,
} from "antd";
import type { PlanQuotaType, ServicePlanFormValues, ServicePlanRecord } from "../types";
import {
  PLAN_CODE_PATTERN,
  QUOTA_TYPE_OPTIONS,
  TIME_UNIT_OPTIONS,
  TIME_USAGE_MODE_OPTIONS,
} from "../constant";

const { TextArea } = Input;
const { Text, Paragraph } = Typography;

type Props = {
  open: boolean;
  saving?: boolean;
  editing: ServicePlanRecord | null;
  onClose: () => void;
  onCreate: (values: ServicePlanFormValues) => Promise<void>;
  onUpdate: (id: string, values: ServicePlanFormValues) => Promise<void>;
};

const PlanFormDrawer: React.FC<Props> = ({
  open,
  saving,
  editing,
  onClose,
  onCreate,
  onUpdate,
}) => {
  const [form] = Form.useForm<ServicePlanFormValues>();
  const quotaType = Form.useWatch("quotaType", form) as PlanQuotaType | undefined;
  const codeLocked = Boolean(editing && (editing._count?.credentials ?? 0) > 0);

  const needsTime = quotaType === "TIME_ONLY" || quotaType === "TIME_AND_DATA";
  const needsData = quotaType === "DATA_ONLY" || quotaType === "TIME_AND_DATA";

  const initialValues: ServicePlanFormValues = editing
    ? {
        code: editing.code,
        name: editing.name,
        description: editing.description ?? undefined,
        quotaType: editing.quotaType,
        timeAmount: editing.timeAmount,
        timeUnit: editing.timeUnit,
        dataMb: editing.dataMb,
        validityDays: editing.validityDays ?? 1,
        maxDevices: editing.maxDevices ?? 1,
        timeUsageMode: editing.timeUsageMode,
        isActive: editing.isActive,
      }
    : {
        code: "",
        name: "",
        quotaType: "TIME_ONLY",
        validityDays: 1,
        maxDevices: 1,
        timeUsageMode: "CUMULATIVE_SESSIONS",
        isActive: true,
        timeAmount: 1,
        timeUnit: "HOUR",
      };

  const handleFinish = async (values: ServicePlanFormValues) => {
    if (editing) {
      await onUpdate(editing.id, values);
    } else {
      await onCreate(values);
    }
  };

  return (
    <Drawer
      title={editing ? `Edit ${editing.name}` : "New service plan"}
      size={520}
      open={open}
      onClose={onClose}
      destroyOnClose={false}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="primary" loading={saving} onClick={() => form.submit()}>
            {editing ? "Save changes" : "Create plan"}
          </Button>
        </div>
      }
    >
      {open ? (
        <Form<ServicePlanFormValues>
          form={form}
          layout="vertical"
          requiredMark="optional"
          initialValues={initialValues}
          key={editing?.id ?? "create"}
          onFinish={(v) => void handleFinish(v)}
        >
          <Paragraph type="secondary" style={{ marginBottom: 16, fontSize: 13 }}>
            Define a retail internet product — quota, validity, and device limits used when issuing
            tokens and vouchers.
          </Paragraph>

          <Form.Item
            name="code"
            label="Plan code"
            rules={[
              { required: true, message: "Code is required" },
              { pattern: PLAN_CODE_PATTERN, message: "Use uppercase letters, numbers, _ or -" },
            ]}
            extra={
              codeLocked ? (
                <Text type="warning" style={{ fontSize: 12 }}>
                  Code is locked while credentials reference this plan.
                </Text>
              ) : (
                "Unique per tenant — e.g. WIFI_1H, DATA_500MB"
              )
            }
          >
            <Input
              placeholder="WIFI_1H"
              disabled={codeLocked}
              onChange={(e) =>
                form.setFieldValue(
                  "code",
                  e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "")
                )
              }
            />
          </Form.Item>

          <Form.Item
            name="name"
            label="Display name"
            rules={[{ required: true, message: "Name is required" }, { min: 2 }]}
          >
            <Input placeholder="1 Hour WiFi" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <TextArea rows={2} placeholder="Optional customer-facing description" />
          </Form.Item>

          <Form.Item
            name="quotaType"
            label="Quota type"
            rules={[{ required: true }]}
          >
            <Radio.Group>
              {QUOTA_TYPE_OPTIONS.map((opt) => (
                <Radio key={opt.value} value={opt.value} style={{ display: "block", marginBottom: 8 }}>
                  <Text strong>{opt.label}</Text>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {opt.description}
                    </Text>
                  </div>
                </Radio>
              ))}
            </Radio.Group>
          </Form.Item>

          {needsTime ? (
            <>
              <div className="flex gap-3">
                <Form.Item
                  name="timeAmount"
                  label="Time amount"
                  className="flex-1"
                  rules={[{ required: true, message: "Required" }]}
                >
                  <InputNumber min={1} max={999999} className="w-full" />
                </Form.Item>
                <Form.Item
                  name="timeUnit"
                  label="Unit"
                  className="flex-1"
                  rules={[{ required: true, message: "Required" }]}
                >
                  <Select options={TIME_UNIT_OPTIONS} />
                </Form.Item>
              </div>
              <Form.Item name="timeUsageMode" label="Time usage mode">
                <Select options={TIME_USAGE_MODE_OPTIONS} />
              </Form.Item>
            </>
          ) : null}

          {needsData ? (
            <Form.Item label="Data quota" required>
              <Space.Compact block>
                <Form.Item
                  name="dataMb"
                  noStyle
                  rules={[{ required: true, message: "Data quota is required" }]}
                >
                  <InputNumber min={1} max={9999999} style={{ width: "100%" }} />
                </Form.Item>
                <Button disabled>MB</Button>
              </Space.Compact>
            </Form.Item>
          ) : null}

          <div className="flex gap-3">
            <Form.Item
              label="Validity"
              className="flex-1"
              required
              extra="Days from first activation"
            >
              <Space.Compact block>
                <Form.Item name="validityDays" noStyle rules={[{ required: true }]}>
                  <InputNumber min={1} max={3650} style={{ width: "100%" }} />
                </Form.Item>
                <Button disabled>days</Button>
              </Space.Compact>
            </Form.Item>
            <Form.Item
              name="maxDevices"
              label="Max devices"
              className="flex-1"
              rules={[{ required: true }]}
            >
              <InputNumber min={1} max={99} className="w-full" />
            </Form.Item>
          </div>

          <Form.Item name="isActive" label="Active" valuePropName="checked">
            <Switch checkedChildren="Yes" unCheckedChildren="No" />
          </Form.Item>
        </Form>
      ) : null}
    </Drawer>
  );
};

export default PlanFormDrawer;
