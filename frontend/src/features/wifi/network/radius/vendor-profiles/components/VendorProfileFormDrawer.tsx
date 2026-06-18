"use client";

import React, { useEffect } from "react";
import {
  Button,
  Divider,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Tabs,
  Typography,
} from "antd";
import type { CatalogAttribute, VendorProfileFormValues, VendorProfileRecord } from "../types";
import { VENDOR_SUGGESTIONS } from "../constant";
import SupportedAttributesEditor from "./SupportedAttributesEditor";

const { TextArea } = Input;
const { Text } = Typography;

type Props = {
  open: boolean;
  saving: boolean;
  editing: VendorProfileRecord | null;
  catalog: CatalogAttribute[];
  onClose: () => void;
  onSubmit: (values: VendorProfileFormValues) => Promise<void>;
};

const VendorProfileFormDrawer: React.FC<Props> = ({
  open,
  saving,
  editing,
  catalog,
  onClose,
  onSubmit,
}) => {
  const [form] = Form.useForm<VendorProfileFormValues>();
  const supportsCoA = Form.useWatch("supportsCoA", form);
  const supportedAttributes = Form.useWatch("supportedAttributes", form) ?? [];

  useEffect(() => {
    if (!open) return;

    if (editing) {
      form.setFieldsValue({
        name: editing.name,
        vendor: editing.vendor,
        model: editing.model ?? "",
        description: editing.description ?? "",
        supportsCoA: editing.supportsCoA,
        coaPort: editing.coaPort ?? 3799,
        supportedAttributes:
          editing.supportedAttributeRows?.map((row) => ({
            attributeId: row.attribute.id,
            requirement: row.requirement,
          })) ?? [],
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        vendor: "Ruijie",
        supportsCoA: true,
        coaPort: 3799,
        supportedAttributes: [],
      });
    }
  }, [open, editing, form]);

  const handleFinish = async (values: VendorProfileFormValues) => {
    await onSubmit({
      ...values,
      coaPort: values.supportsCoA ? values.coaPort ?? 3799 : null,
      supportedAttributes: values.supportedAttributes ?? [],
    });
  };

  const generalTab = (
    <>
      <Form.Item name="name" label="Profile name" rules={[{ required: true, message: "Name is required" }]}>
        <Input placeholder="e.g. Ruijie RG-EG1510XS" />
      </Form.Item>

      <div className="grid grid-cols-2 gap-3">
        <Form.Item name="vendor" label="Vendor" rules={[{ required: true }]}>
          <Select
            showSearch
            options={VENDOR_SUGGESTIONS.map((v) => ({ value: v, label: v }))}
          />
        </Form.Item>
        <Form.Item name="model" label="Model">
          <Input placeholder="Hardware model" />
        </Form.Item>
      </div>

      <Form.Item name="description" label="Description">
        <TextArea rows={2} maxLength={1000} placeholder="Capability notes for operators…" />
      </Form.Item>

      <Form.Item name="supportsCoA" label="RFC 3576 CoA / Disconnect" valuePropName="checked">
        <Switch />
      </Form.Item>

      {supportsCoA ? (
        <Form.Item name="coaPort" label="CoA port">
          <InputNumber min={1} max={65535} style={{ width: "100%" }} />
        </Form.Item>
      ) : null}
    </>
  );

  const attributesTab = (
    <Form.Item name="supportedAttributes" noStyle>
      <SupportedAttributesEditor
        value={supportedAttributes}
        catalog={catalog}
        onChange={(v) => form.setFieldValue("supportedAttributes", v)}
      />
    </Form.Item>
  );

  return (
    <Drawer
      title={editing ? "Edit vendor profile" : "New vendor profile"}
      size={640}
      open={open}
      onClose={onClose}
      destroyOnHidden
    >
      <Text type="secondary" style={{ display: "block", marginBottom: 16, fontSize: 13 }}>
        Define which FreeRADIUS attributes a NAS vendor/model supports. WiFi sites and plan policies
        reference these profiles.
      </Text>

      <Form form={form} layout="vertical" requiredMark="optional" onFinish={(v) => void handleFinish(v)}>
        <Tabs
          items={[
            { key: "general", label: "General", children: generalTab },
            {
              key: "attributes",
              label: `Attributes (${supportedAttributes.length})`,
              children: attributesTab,
            },
          ]}
        />

        <Divider style={{ margin: "16px 0" }} />

        <Space className="flex justify-end">
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="primary" htmlType="submit" loading={saving}>
            {editing ? "Save changes" : "Create profile"}
          </Button>
        </Space>
      </Form>
    </Drawer>
  );
};

export default VendorProfileFormDrawer;
