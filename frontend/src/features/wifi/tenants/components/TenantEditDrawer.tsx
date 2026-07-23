"use client";

import React from "react";
import { Button, Drawer, Form, Input, Switch } from "antd";
import type { TenantDetailRecord, TenantEditFormValues } from "../types";
import { useDrawerFormSync } from "@/features/wifi/shared/hooks";

type Props = {
  open: boolean;
  saving?: boolean;
  tenant: TenantDetailRecord | null;
  onClose: () => void;
  onSubmit: (values: TenantEditFormValues) => Promise<void>;
};

function buildTenantFormValues(tenant: TenantDetailRecord): TenantEditFormValues {
  return {
    name: tenant.name,
    description: tenant.description ?? undefined,
    isActive: tenant.isActive,
    timezone: tenant.timezone,
    currency: tenant.currency,
    enableAnnouncement: tenant.enableAnnouncement ?? false,
    announcement: tenant.announcement ?? undefined,
  };
}

const TenantEditDrawer: React.FC<Props> = ({
  open,
  saving,
  tenant,
  onClose,
  onSubmit,
}) => {
  const [form] = Form.useForm<TenantEditFormValues>();
  const formValues = tenant ? buildTenantFormValues(tenant) : ({} as TenantEditFormValues);
  useDrawerFormSync(form, open && Boolean(tenant), formValues, tenant?.id);

  return (
    <Drawer
      title={tenant ? `Edit ${tenant.name}` : "Edit tenant"}
      size={480}
      open={open}
      onClose={onClose}
      destroyOnHidden
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="primary"
            loading={saving}
            disabled={!tenant}
            onClick={() => form.submit()}
          >
            Save changes
          </Button>
        </div>
      }
    >
      {tenant ? (
        <Form
          key={tenant.id}
          form={form}
          layout="vertical"
          onFinish={onSubmit}
          disabled={saving}
        >
          <Form.Item
            name="name"
            label="Organization name"
            rules={[{ required: true, message: "Name is required" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="isActive" label="Organization active" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item
            name="timezone"
            label="Timezone"
            rules={[{ required: true, message: "Timezone is required" }]}
          >
            <Input placeholder="Asia/Yangon" />
          </Form.Item>
          <Form.Item
            name="currency"
            label="Currency"
            rules={[
              { required: true, message: "Currency is required" },
              { len: 3, message: "Use 3-letter ISO code" },
            ]}
          >
            <Input maxLength={3} style={{ textTransform: "uppercase" }} />
          </Form.Item>
          <Form.Item name="enableAnnouncement" label="Portal announcement" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="announcement" label="Announcement text">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      ) : null}
    </Drawer>
  );
};

export default TenantEditDrawer;
