"use client";

import React, { useEffect } from "react";
import { Button, Drawer, Form, Input, InputNumber, Space, Switch, Typography } from "antd";
import type { CapacityTierFormValues, CapacityTierRecord } from "../types";
import { TIER_CODE_PATTERN } from "../constant";

const { TextArea } = Input;
const { Text } = Typography;

type Props = {
  open: boolean;
  saving: boolean;
  editing: CapacityTierRecord | null;
  onClose: () => void;
  onSubmit: (values: CapacityTierFormValues) => Promise<void>;
};

const CapacityTierFormDrawer: React.FC<Props> = ({
  open,
  saving,
  editing,
  onClose,
  onSubmit,
}) => {
  const [form] = Form.useForm<CapacityTierFormValues>();
  const codeLocked = Boolean(editing && (editing._count?.stations ?? 0) > 0);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.setFieldsValue({
        code: editing.code,
        name: editing.name,
        description: editing.description ?? "",
        sortOrder: editing.sortOrder,
        isActive: editing.isActive,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ sortOrder: 0, isActive: true });
    }
  }, [open, editing, form]);

  const handleFinish = async (values: CapacityTierFormValues) => {
    await onSubmit({
      ...values,
      code: values.code.trim().toUpperCase(),
      description: values.description?.trim(),
    });
  };

  return (
    <Drawer
      title={editing ? "Edit capacity tier" : "New capacity tier"}
      size={440}
      open={open}
      onClose={onClose}
      destroyOnHidden
      footer={null}
      styles={{ body: { paddingBottom: 24 } }}
    >
      <Text type="secondary" style={{ display: "block", marginBottom: 20, fontSize: 13 }}>
        {editing
          ? "Update the site size type used for license billing and site assignment."
          : "Add a platform-wide site capacity type (e.g. SMALL, MEDIUM, LARGE)."}
      </Text>

      <Form form={form} layout="vertical" requiredMark="optional" onFinish={(v) => void handleFinish(v)}>
        <Form.Item
          name="code"
          label="Tier code"
          rules={[
            { required: true, message: "Code is required" },
            {
              pattern: TIER_CODE_PATTERN,
              message: "Use SCREAMING_SNAKE_CASE (e.g. SMALL, MEDIUM, XL)",
            },
          ]}
          extra={
            codeLocked ? (
              <Text type="warning" style={{ fontSize: 12 }}>
                Code is locked while licensed sites reference this tier.
              </Text>
            ) : (
              "Unique identifier — uppercase letters, numbers, and underscores."
            )
          }
        >
          <Input
            placeholder="SMALL"
            disabled={codeLocked}
            onChange={(e) => form.setFieldValue("code", e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))}
          />
        </Form.Item>

        <Form.Item
          name="name"
          label="Display name"
          rules={[{ required: true, message: "Name is required" }, { min: 2 }]}
        >
          <Input placeholder="Small Site" />
        </Form.Item>

        <Form.Item name="description" label="Description">
          <TextArea rows={3} placeholder="Low-capacity venue (e.g. café, small office)" maxLength={500} showCount />
        </Form.Item>

        <Form.Item
          name="sortOrder"
          label="Sort order"
          rules={[{ required: true, message: "Sort order is required" }]}
          extra="Lower numbers appear first in lists and billing summaries."
        >
          <InputNumber min={0} max={9999} style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item name="isActive" label="Active" valuePropName="checked">
          <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
        </Form.Item>

        <Space className="flex justify-end pt-2">
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="primary" htmlType="submit" loading={saving}>
            {editing ? "Save changes" : "Create tier"}
          </Button>
        </Space>
      </Form>
    </Drawer>
  );
};

export default CapacityTierFormDrawer;
