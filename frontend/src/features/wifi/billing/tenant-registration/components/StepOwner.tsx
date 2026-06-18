"use client";

import React, { useMemo } from "react";
import { Alert, Col, Form, Input, Progress, Row, Typography } from "antd";
import {
  getPasswordStrengthChecklist,
  passwordMeetsStrengthRules,
  scorePassword,
} from "@/lib/passwordStrength";

const { Paragraph, Text } = Typography;

const StepOwner: React.FC = () => {
  const passwordWatch = Form.useWatch("ownerPassword") || "";
  const strength = useMemo(() => scorePassword(passwordWatch), [passwordWatch]);
  const checklist = useMemo(
    () => getPasswordStrengthChecklist(passwordWatch),
    [passwordWatch]
  );

  return (
    <div>
      {/* <Alert
        type="info"
        showIcon
        className="mb-5"
        title="Internal provisioning only"
        description="The owner receives console access with ORG_ADMIN membership (primary contact). No external email invite is sent."
      /> */}
      <Paragraph type="secondary" style={{ marginBottom: 20 }}>
        Create the primary administrator for this tenant. They can add more users in Access Control (Step 2).
      </Paragraph>
      <Row gutter={[16, 0]}>
        <Col xs={24} md={12}>
          <Form.Item
            label="Full name"
            name="ownerFullName"
            rules={[{ required: true, message: "Full name is required" }]}
          >
            <Input placeholder="Jane Doe" size="large" />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            label="Username"
            name="ownerUsername"
            rules={[
              { required: true, message: "Username is required" },
              { min: 3, message: "At least 3 characters" },
            ]}
          >
            <Input placeholder="jane.doe" size="large" autoComplete="off" />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item label="Email (optional)" name="ownerEmail" rules={[{ type: "email" }]}>
            <Input placeholder="jane@tenant.com" size="large" />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item label="Phone (optional)" name="ownerPhone">
            <Input placeholder="+95 9 …" size="large" />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            label="Password"
            name="ownerPassword"
            rules={[
              { required: true, message: "Password is required" },
              {
                validator: async (_, value) => {
                  if (!value || !passwordMeetsStrengthRules(value)) {
                    throw new Error("Password must meet all strength requirements");
                  }
                },
              },
            ]}
          >
            <Input.Password placeholder="Strong password" size="large" autoComplete="new-password" />
          </Form.Item>
          {passwordWatch ? (
            <div className="mb-4 -mt-2">
              <Progress percent={strength.score} size="small" showInfo={false} strokeColor={strength.color} />
              <ul className="mt-2 space-y-0.5 pl-4 text-xs text-gray-500">
                {checklist.map((item) => (
                  <li key={item.label} style={{ color: item.met ? "#16a34a" : undefined }}>
                    {item.label}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            label="Confirm password"
            name="ownerConfirmPassword"
            dependencies={["ownerPassword"]}
            rules={[
              { required: true, message: "Please confirm the password" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("ownerPassword") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("Passwords do not match"));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Repeat password" size="large" autoComplete="new-password" />
          </Form.Item>
        </Col>
      </Row>
      {/* <Text type="secondary" style={{ fontSize: 12 }}>
        Console role: <Text code>ORG_ADMIN</Text> with primary membership role <Text code>ORG_ADMIN</Text>
      </Text> */}
    </div>
  );
};

export default StepOwner;
