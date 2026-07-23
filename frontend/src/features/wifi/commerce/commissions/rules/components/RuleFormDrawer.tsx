"use client";

import React from "react";
import {
  Alert,
  Button,
  Drawer,
  Form,
  InputNumber,
  Radio,
  Select,
  Space,
  Switch,
  Typography,
} from "antd";
import type { CommissionRuleFormValues, CommissionRuleRecord, RulesFormOptions } from "../types";
import { TYPE_OPTIONS } from "../constant";
import { formValuesFromRecord } from "../utils";
import { useDrawerFormSync } from "@/features/wifi/shared/hooks";

const { Paragraph, Text } = Typography;

type Props = {
  open: boolean;
  saving?: boolean;
  editing: CommissionRuleRecord | null;
  formOptions: RulesFormOptions;
  onClose: () => void;
  onCreate: (values: CommissionRuleFormValues) => Promise<void>;
  onUpdate: (id: string, values: CommissionRuleFormValues) => Promise<void>;
};

const RuleFormDrawer: React.FC<Props> = ({
  open,
  saving,
  editing,
  formOptions,
  onClose,
  onCreate,
  onUpdate,
}) => {
  const [form] = Form.useForm<CommissionRuleFormValues>();
  const type = Form.useWatch("type", form);
  const currency = formOptions.currency;

  const formValues: CommissionRuleFormValues = editing
    ? formValuesFromRecord(editing)
    : {
        resellerId: null,
        planId: null,
        type: "PERCENT",
        percentValue: 10,
        fixedValue: 0,
        isActive: true,
      };
  useDrawerFormSync(form, open, formValues, editing?.id ?? "create");

  const handleFinish = async (values: CommissionRuleFormValues) => {
    if (editing) {
      await onUpdate(editing.id, values);
    } else {
      await onCreate(values);
    }
  };

  return (
    <Drawer
      title={editing ? "Edit commission rule" : "New commission rule"}
      size={480}
      open={open}
      onClose={onClose}
      destroyOnHidden
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="primary" loading={saving} onClick={() => form.submit()}>
            {editing ? "Save changes" : "Create rule"}
          </Button>
        </div>
      }
    >
      <Alert
        type="info"
        showIcon
        className="mb-4"
        message="Rule precedence"
        description="More specific rules (partner + plan) override broader defaults. Leave partner and plan empty for a tenant-wide default."
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        key={editing?.id ?? "create"}
      >
        <Form.Item name="resellerId" label="Partner scope">
          <Select
            allowClear
            showSearch
            placeholder="All partners (tenant default)"
            optionFilterProp="label"
            options={formOptions.resellers.map((r) => ({
              value: r.id,
              label: `${r.code} — ${r.name}`,
            }))}
          />
        </Form.Item>

        <Form.Item name="planId" label="Plan scope">
          <Select
            allowClear
            showSearch
            placeholder="All plans"
            optionFilterProp="label"
            options={formOptions.plans.map((p) => ({
              value: p.id,
              label: `${p.code} — ${p.name}`,
            }))}
          />
        </Form.Item>

        <Form.Item name="type" label="Commission type" rules={[{ required: true }]}>
          <Radio.Group options={TYPE_OPTIONS} optionType="button" buttonStyle="solid" />
        </Form.Item>

        {type === "PERCENT" ? (
          <Form.Item
            name="percentValue"
            label="Commission rate"
            rules={[
              { required: true, message: "Rate is required" },
              { type: "number", min: 0.01, max: 100 },
            ]}
            extra="Percentage of each sale total paid to the partner"
          >
            <Space.Compact style={{ width: "100%" }}>
              <InputNumber min={0.01} max={100} step={0.5} style={{ width: "100%" }} />
              <Button disabled>%</Button>
            </Space.Compact>
          </Form.Item>
        ) : (
          <Form.Item
            name="fixedValue"
            label="Fixed commission"
            rules={[
              { required: true, message: "Amount is required" },
              { type: "number", min: 1 },
            ]}
            extra="Flat amount per completed sale"
          >
            <Space.Compact style={{ width: "100%" }}>
              <InputNumber min={1} style={{ width: "100%" }} />
              <Button disabled>{currency}</Button>
            </Space.Compact>
          </Form.Item>
        )}

        <Form.Item name="isActive" label="Active" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 0 }}>
          <Text type="secondary">
            Only one rule per partner + plan combination. Payouts are calculated in Commission
            Payouts (coming soon).
          </Text>
        </Paragraph>
      </Form>
    </Drawer>
  );
};

export default RuleFormDrawer;
