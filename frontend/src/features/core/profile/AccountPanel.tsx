"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Alert, App, Button, Card, Col, Form, Input, Row, Space, Tooltip, Typography } from "antd";
import { CopyOutlined, MailOutlined, PhoneOutlined, SaveOutlined, UserOutlined } from "@ant-design/icons";
import { UserProfile } from "./profile";

const { Text } = Typography;

interface Props {
  profile: UserProfile;
  saving?: boolean;
  onSubmit: (values: Partial<UserProfile>) => Promise<void> | void;
}

const AccountPanel: React.FC<Props> = ({ profile, saving, onSubmit }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm<Partial<UserProfile>>();
  const initial = useMemo(
    () => ({
      username: profile.username,
      fullName: profile.fullName,
      email: profile.email,
      phoneNumber: profile.phoneNumber,
    }),
    [profile.username, profile.fullName, profile.email, profile.phoneNumber]
  );

  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    form.setFieldsValue(initial);
    setDirty(false);
  }, [form, initial]);

  const handleCopyUsername = async () => {
    try {
      await navigator.clipboard.writeText(profile.username);
      message.success("Username copied");
    } catch {
      message.error("Could not copy");
    }
  };

  return (
    <Card
      variant="borderless"
      title={
        <Space orientation="vertical" size={0}>
          <span style={{ fontWeight: 600 }}>Account details</span>
          <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
            Update how your name, email and phone appear across the app.
          </Text>
        </Space>
      }
      extra={
        dirty ? (
          <Space>
            <Button onClick={() => form.resetFields()} disabled={saving}>
              Discard
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={() => form.submit()}
            >
              Save changes
            </Button>
          </Space>
        ) : null
      }
    >
      <Form
        layout="vertical"
        form={form}
        initialValues={initial}
        onFinish={async (values) => {
          await onSubmit(values);
          setDirty(false);
        }}
        onValuesChange={() => setDirty(true)}
      >
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Username"
              name="username"
              extra="Used to sign in. This cannot be changed."
            >
              <Input
                disabled
                prefix={<UserOutlined />}
                suffix={
                  <Tooltip title="Copy username">
                    <Button
                      type="text"
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={handleCopyUsername}
                    />
                  </Tooltip>
                }
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="Full name"
              name="fullName"
              rules={[
                { required: true, message: "Please enter your full name" },
                { min: 2, message: "Use at least 2 characters" },
              ]}
            >
              <Input prefix={<UserOutlined />} placeholder="e.g. Ye Lin Aung" maxLength={80} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: "Please enter your email" },
                { type: "email", message: "Enter a valid email address" },
              ]}
            >
              <Input prefix={<MailOutlined />} placeholder="you@example.com" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="Phone number"
              name="phoneNumber"
              rules={[
                { pattern: /^[+\-\d\s()]{6,20}$/, message: "Enter a valid phone number", required: false },
              ]}
            >
              <Input prefix={<PhoneOutlined />} placeholder="+95 ..." allowClear />
            </Form.Item>
          </Col>
        </Row>

        {!dirty ? (
          <Alert
            type="info"
            showIcon
            title="Edit any field to enable saving."
            style={{ marginTop: 4 }}
          />
        ) : (
          <Button
            type="primary"
            htmlType="submit"
            icon={<SaveOutlined />}
            loading={saving}
            style={{ marginTop: 4 }}
          >
            Save changes
          </Button>
        )}
      </Form>
    </Card>
  );
};

export default AccountPanel;
