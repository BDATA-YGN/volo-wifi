"use client";

import React from "react";
import {
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Typography,
} from "antd";
import type { ServicePlanFormValues, ServicePlanRecord } from "../types";
import {
  PLAN_CODE_PATTERN,
  TIME_UNIT_OPTIONS,
  TIME_USAGE_MODE_OPTIONS,
} from "../constant";
import { useDrawerFormSync } from "@/features/wifi/shared/hooks";

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

function toFormLimits(editing: ServicePlanRecord): Pick<
  ServicePlanFormValues,
  "timeAmount" | "timeUnit" | "dataMb" | "timeUsageMode"
> {
  // Legacy null = unused dimension → treat as unlimited (0).
  const timeAmount = editing.timeAmount ?? 0;
  const dataMb = editing.dataMb ?? 0;
  return {
    timeAmount,
    timeUnit: editing.timeUnit ?? (timeAmount > 0 ? "HOUR" : "HOUR"),
    dataMb,
    timeUsageMode: editing.timeUsageMode,
  };
}

const PlanFormDrawer: React.FC<Props> = ({
  open,
  saving,
  editing,
  onClose,
  onCreate,
  onUpdate,
}) => {
  const [form] = Form.useForm<ServicePlanFormValues>();
  const timeAmount = Form.useWatch("timeAmount", form) as number | undefined;
  const codeLocked = Boolean(editing && (editing._count?.credentials ?? 0) > 0);
  const hasTimeLimit = (timeAmount ?? 0) > 0;

  const formValues: ServicePlanFormValues = editing
    ? {
        code: editing.code,
        name: editing.name,
        description: editing.description ?? undefined,
        ...toFormLimits(editing),
        validityDays: editing.validityDays ?? 1,
        maxDevices: editing.maxDevices ?? 1,
        isActive: editing.isActive,
      }
    : {
        code: "",
        name: "",
        validityDays: 1,
        maxDevices: 1,
        timeUsageMode: "CUMULATIVE_SESSIONS",
        isActive: true,
        timeAmount: 1,
        timeUnit: "HOUR",
        dataMb: 0,
      };
  useDrawerFormSync(form, open, formValues, editing?.id ?? "create");

  const handleFinish = async (values: ServicePlanFormValues) => {
    const payload: ServicePlanFormValues = {
      ...values,
      timeAmount: values.timeAmount ?? 0,
      dataMb: values.dataMb ?? 0,
      timeUnit: (values.timeAmount ?? 0) > 0 ? values.timeUnit ?? "HOUR" : null,
      timeUsageMode:
        (values.timeAmount ?? 0) > 0
          ? values.timeUsageMode
          : "CUMULATIVE_SESSIONS",
    };
    if (editing) {
      await onUpdate(editing.id, payload);
    } else {
      await onCreate(payload);
    }
  };

  return (
    <Drawer
      title={editing ? `Edit ${editing.name}` : "New service plan"}
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
          key={editing?.id ?? "create"}
          onFinish={(v) => void handleFinish(v)}
        >
          <Paragraph type="secondary" style={{ marginBottom: 16, fontSize: 13 }}>
            Define a retail internet product — allow-time, data limit, validity, and device
            limits used when issuing tokens and vouchers. Set 0 for unlimited.
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

          <div className="flex gap-3">
            <Form.Item
              name="timeAmount"
              label="Allow time"
              className="flex-1"
              rules={[{ required: true, message: "Required" }]}
              extra="0 = unlimited"
            >
              <InputNumber min={0} max={999999} className="w-full" />
            </Form.Item>
            <Form.Item
              name="timeUnit"
              label="Unit"
              className="flex-1"
              rules={
                hasTimeLimit ? [{ required: true, message: "Required" }] : undefined
              }
            >
              <Select options={TIME_UNIT_OPTIONS} disabled={!hasTimeLimit} />
            </Form.Item>
          </div>

          {hasTimeLimit ? (
            <Form.Item name="timeUsageMode" label="Time usage mode">
              <Select options={TIME_USAGE_MODE_OPTIONS} />
            </Form.Item>
          ) : null}

          <Form.Item label="Data limit" required extra="0 = unlimited">
            <Space.Compact block>
              <Form.Item
                name="dataMb"
                noStyle
                rules={[{ required: true, message: "Data limit is required" }]}
              >
                <InputNumber min={0} max={9999999} style={{ width: "100%" }} />
              </Form.Item>
              <Button disabled>MB</Button>
            </Space.Compact>
          </Form.Item>

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
