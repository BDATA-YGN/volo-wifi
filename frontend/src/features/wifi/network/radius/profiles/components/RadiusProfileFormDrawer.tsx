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
  Typography,
} from "antd";
import type { RadiusProfileFormValues, RadiusProfileRecord } from "../types";
import { NAS_TYPE_SUGGESTIONS } from "../constant";

const { TextArea } = Input;
const { Text } = Typography;

type Props = {
  open: boolean;
  saving: boolean;
  editing: RadiusProfileRecord | null;
  onClose: () => void;
  onSubmit: (values: RadiusProfileFormValues) => Promise<void>;
};

const RadiusProfileFormDrawer: React.FC<Props> = ({
  open,
  saving,
  editing,
  onClose,
  onSubmit,
}) => {
  const [form] = Form.useForm<RadiusProfileFormValues>();

  useEffect(() => {
    if (!open) return;

    if (editing) {
      form.setFieldsValue({
        name: editing.name,
        sharedSecret: "",
        serverHost: editing.serverHost ?? "",
        nasType: editing.nasType ?? "other",
        nasPorts: editing.nasPorts ?? undefined,
        community: editing.community ?? "",
        note: editing.note ?? "",
        isActive: editing.isActive,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        nasType: "other",
        isActive: true,
      });
    }
  }, [open, editing, form]);

  return (
    <Drawer
      title={editing ? "Edit FreeRADIUS server" : "Add FreeRADIUS server"}
      size={480}
      open={open}
      onClose={onClose}
      destroyOnHidden
    >
      <Text type="secondary" style={{ display: "block", marginBottom: 16, fontSize: 13 }}>
        Org-scoped FreeRADIUS server endpoint. NAS devices select which server to use.
      </Text>

      <Form
        form={form}
        layout="vertical"
        requiredMark="optional"
        onFinish={(values) => void onSubmit(values)}
      >
        <Form.Item
          name="name"
          label="Server name"
          rules={[{ required: true, message: "Name is required" }]}
        >
          <Input placeholder="e.g. Primary / Secondary" />
        </Form.Item>

        <Form.Item
          name="sharedSecret"
          label="Default shared secret"
          extra={
            editing?.hasSharedSecret
              ? "Optional default for devices without their own secret. Leave blank to keep existing."
              : "Optional. Most tenants keep secrets on each NAS device instead."
          }
        >
          <Input.Password
            placeholder={editing?.hasSharedSecret ? "Leave blank to keep existing" : "Optional"}
          />
        </Form.Item>

        <Form.Item name="serverHost" label="Server host / IP">
          <Input placeholder="e.g. 10.0.0.10" />
        </Form.Item>

        <div className="grid grid-cols-2 gap-3">
          <Form.Item name="nasType" label="Default NAS type">
            <Select
              showSearch
              options={NAS_TYPE_SUGGESTIONS.map((v) => ({ value: v, label: v }))}
            />
          </Form.Item>
          <Form.Item name="nasPorts" label="NAS ports">
            <InputNumber min={0} max={65535} style={{ width: "100%" }} />
          </Form.Item>
        </div>

        <Form.Item name="community" label="SNMP community">
          <Input />
        </Form.Item>

        <Form.Item name="note" label="Notes">
          <TextArea rows={2} maxLength={500} />
        </Form.Item>

        <Form.Item name="isActive" label="Active" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Divider style={{ margin: "16px 0" }} />

        <Space className="flex justify-end">
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="primary" htmlType="submit" loading={saving}>
            {editing ? "Save changes" : "Add server"}
          </Button>
        </Space>
      </Form>
    </Drawer>
  );
};

export default RadiusProfileFormDrawer;
