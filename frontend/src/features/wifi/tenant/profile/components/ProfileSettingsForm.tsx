"use client";

import React from "react";
import { Button, Card, Form, Input, Switch, Typography } from "antd";
import type { TenantProfile, TenantProfileFormValues } from "../types";

const { Text, Paragraph } = Typography;

type Props = {
  profile: TenantProfile;
  saving?: boolean;
  onSubmit: (values: TenantProfileFormValues) => Promise<void>;
};

const ProfileSettingsForm: React.FC<Props> = ({ profile, saving, onSubmit }) => {
  const [form] = Form.useForm<TenantProfileFormValues>();

  return (
    <Form
      key={profile.id}
      form={form}
      layout="vertical"
      disabled={saving}
      initialValues={{
        name: profile.name,
        description: profile.description ?? undefined,
        timezone: profile.timezone,
        currency: profile.currency,
        enableAnnouncement: profile.enableAnnouncement,
        announcement: profile.announcement ?? undefined,
        stationCodePrefix: profile.stationCodePrefix || undefined,
        planCodePrefix: profile.planCodePrefix || undefined,
        resellerCodePrefix: profile.resellerCodePrefix || undefined,
      }}
      onFinish={onSubmit}
    >
      <div className="flex flex-col gap-4">
        <Card title="Organization identity" size="small">
          <div className="mb-4">
            <Text type="secondary">Organization code</Text>
            <div>
              <Text code>{profile.code}</Text>
            </div>
            <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 0, marginTop: 8 }}>
              Tenant code is assigned at registration and cannot be changed here.
            </Paragraph>
          </div>
          <div className="mb-4">
            <Text type="secondary">Platform status</Text>
            <div>
              <Text>{profile.isActive ? "Active" : "Inactive"}</Text>
              <Text type="secondary" className="ml-2" style={{ fontSize: 12 }}>
                (managed by platform admin)
              </Text>
            </div>
          </div>
          <Form.Item
            name="name"
            label="Display name"
            rules={[{ required: true, message: "Name is required" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} placeholder="Internal notes about this tenant" />
          </Form.Item>
        </Card>

        <Card title="Regional settings" size="small">
          <Form.Item
            name="timezone"
            label="Timezone"
            rules={[{ required: true, message: "Timezone is required" }]}
          >
            <Input placeholder="Asia/Yangon" />
          </Form.Item>
          <Form.Item
            name="currency"
            label="Default currency"
            rules={[
              { required: true, message: "Currency is required" },
              { len: 3, message: "Use 3-letter ISO code" },
            ]}
          >
            <Input maxLength={3} style={{ textTransform: "uppercase", maxWidth: 120 }} />
          </Form.Item>
        </Card>

        <Card title="Captive portal announcement" size="small">
          <Form.Item name="enableAnnouncement" label="Show announcement" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="announcement" label="Announcement text">
            <Input.TextArea rows={4} placeholder="Message shown to end users on the captive portal" />
          </Form.Item>
        </Card>

        <Card title="Code prefixes" size="small">
          <Paragraph type="secondary" style={{ fontSize: 13 }}>
            Prefixes are prepended when generating site, plan, and partner codes across this tenant.
          </Paragraph>
          <div className="grid gap-4 sm:grid-cols-3">
            <Form.Item name="stationCodePrefix" label="Site prefix">
              <Input placeholder="e.g. YGN" />
            </Form.Item>
            <Form.Item name="planCodePrefix" label="Plan prefix">
              <Input placeholder="e.g. PLN" />
            </Form.Item>
            <Form.Item name="resellerCodePrefix" label="Partner prefix">
              <Input placeholder="e.g. PTR" />
            </Form.Item>
          </div>
        </Card>

        <div className="flex flex-wrap gap-2">
          <Button type="primary" htmlType="submit" loading={saving}>
            Save changes
          </Button>
          <Button onClick={() => form.resetFields()} disabled={saving}>
            Reset
          </Button>
        </div>
      </div>
    </Form>
  );
};

export default ProfileSettingsForm;
