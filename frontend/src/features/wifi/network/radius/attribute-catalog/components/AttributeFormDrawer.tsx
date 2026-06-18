"use client";

import React, { useEffect } from "react";
import {
  Alert,
  Button,
  Drawer,
  Form,
  Input,
  Select,
  Space,
  Typography,
} from "antd";
import type { AttributeFormValues, CatalogAttributeRecord } from "../types";
import {
  COMMON_ATTRIBUTES,
  OP_OPTIONS,
  VALUE_TYPE_FORM_OPTIONS,
} from "../constant";

const { TextArea } = Input;
const { Text } = Typography;

type Props = {
  open: boolean;
  saving: boolean;
  editing: CatalogAttributeRecord | null;
  onClose: () => void;
  onSubmit: (values: AttributeFormValues) => Promise<void>;
};

const AttributeFormDrawer: React.FC<Props> = ({
  open,
  saving,
  editing,
  onClose,
  onSubmit,
}) => {
  const [form] = Form.useForm<AttributeFormValues>();
  const nameLocked = Boolean(editing && editing._count.vendorProfileLinks > 0);

  useEffect(() => {
    if (!open) return;

    if (editing) {
      form.setFieldsValue({
        freeradiusName: editing.freeradiusName,
        displayName: editing.displayName,
        op: editing.op,
        defaultValue: editing.defaultValue ?? "",
        valueType: editing.valueType,
        note: editing.note ?? "",
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ op: ":=", valueType: "STRING" });
    }
  }, [open, editing, form]);

  const applyPreset = (preset: (typeof COMMON_ATTRIBUTES)[number]) => {
    form.setFieldsValue({
      freeradiusName: preset.freeradiusName,
      displayName: preset.displayName,
      valueType: preset.valueType,
      op: preset.op ?? ":=",
    });
  };

  const handleFinish = async (values: AttributeFormValues) => {
    await onSubmit({
      ...values,
      freeradiusName: values.freeradiusName.trim(),
      displayName: values.displayName.trim(),
    });
  };

  return (
    <Drawer
      title={editing ? "Edit attribute" : "Add attribute"}
      size={480}
      open={open}
      onClose={onClose}
      destroyOnHidden
    >
      <Text type="secondary" style={{ display: "block", marginBottom: 16, fontSize: 13 }}>
        Platform dictionary of FreeRADIUS attributes. Vendor profiles and plan policies reference
        these definitions.
      </Text>

      {!editing ? (
        <div className="mb-4">
          <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 8 }}>
            Quick add common attributes:
          </Text>
          <div className="flex flex-wrap gap-2">
            {COMMON_ATTRIBUTES.map((preset) => (
              <Button key={preset.freeradiusName} size="small" onClick={() => applyPreset(preset)}>
                {preset.freeradiusName}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      {editing && editing._count.vendorProfileLinks > 0 ? (
        <Alert
          type="info"
          showIcon
          className="mb-4"
          message={`Linked to ${editing._count.vendorProfileLinks} vendor profile(s)`}
          description="FreeRADIUS name is locked while the attribute is in use."
        />
      ) : null}

      <Form form={form} layout="vertical" requiredMark="optional" onFinish={(v) => void handleFinish(v)}>
        <Form.Item
          name="freeradiusName"
          label="FreeRADIUS name"
          rules={[{ required: true, message: "Name is required" }]}
          extra="Exact attribute name as in dictionaries (e.g. Session-Timeout)"
        >
          <Input disabled={nameLocked} placeholder="Session-Timeout" />
        </Form.Item>

        <Form.Item
          name="displayName"
          label="Display name"
          rules={[{ required: true, message: "Display name is required" }]}
        >
          <Input placeholder="Session Timeout" />
        </Form.Item>

        <div className="grid grid-cols-2 gap-3">
          <Form.Item name="op" label="Operator" rules={[{ required: true }]}>
            <Select options={OP_OPTIONS} />
          </Form.Item>
          <Form.Item name="valueType" label="Value type" rules={[{ required: true }]}>
            <Select options={VALUE_TYPE_FORM_OPTIONS} />
          </Form.Item>
        </div>

        <Form.Item name="defaultValue" label="Default value (optional)">
          <Input placeholder="Used when plan policy does not override" />
        </Form.Item>

        <Form.Item name="note" label="Notes">
          <TextArea rows={3} maxLength={2000} placeholder="Usage notes for operators…" />
        </Form.Item>

        <Space className="flex justify-end pt-2">
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="primary" htmlType="submit" loading={saving}>
            {editing ? "Save changes" : "Add attribute"}
          </Button>
        </Space>
      </Form>
    </Drawer>
  );
};

export default AttributeFormDrawer;
