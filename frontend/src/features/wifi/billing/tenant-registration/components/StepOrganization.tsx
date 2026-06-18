"use client";

import React from "react";
import { Col, Form, Input, Row, Select, Typography } from "antd";
import { CURRENCY_OPTIONS, TIMEZONE_OPTIONS } from "../constant";

const { Text, Paragraph } = Typography;

const StepOrganization: React.FC = () => (
  <div>
    <Paragraph type="secondary" style={{ marginBottom: 20 }}>
      Define the tenant identity used across billing, sites, and partner commerce.
    </Paragraph>
    <Row gutter={[16, 0]}>
      <Col xs={24} md={12}>
        <Form.Item
          label="Organization name"
          name="orgName"
          rules={[
            { required: true, message: "Organization name is required" },
            { min: 2, message: "At least 2 characters" },
          ]}
        >
          <Input placeholder="e.g. Acme Hospitality Group" size="large" />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item
          label="Tenant code"
          name="orgCode"
          tooltip="Unique identifier for invoices, codes, and internal references. Uppercase letters, numbers, and underscores."
          rules={[
            { required: true, message: "Tenant code is required" },
            {
              pattern: /^[A-Z0-9_]{2,32}$/,
              message: "Use 2–32 uppercase letters, numbers, or underscores",
            },
          ]}
        >
          <Input placeholder="ACME_WIFI" size="large" style={{ fontFamily: "monospace" }} />
        </Form.Item>
      </Col>
      <Col span={24}>
        <Form.Item label="Description" name="orgDescription">
          <Input.TextArea rows={2} placeholder="Optional — industry, region, or notes for operators" />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item label="Timezone" name="timezone" rules={[{ required: true }]}>
          <Select options={TIMEZONE_OPTIONS} size="large" />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item label="Billing currency" name="currency" rules={[{ required: true }]}>
          <Select options={CURRENCY_OPTIONS} size="large" />
        </Form.Item>
      </Col>
      <Col span={24}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Code prefixes (optional)
        </Text>
      </Col>
      <Col xs={24} md={8}>
        <Form.Item label="Site prefix" name="stationCodePrefix">
          <Input placeholder="STN" maxLength={16} />
        </Form.Item>
      </Col>
      <Col xs={24} md={8}>
        <Form.Item label="Plan prefix" name="planCodePrefix">
          <Input placeholder="PLN" maxLength={16} />
        </Form.Item>
      </Col>
      <Col xs={24} md={8}>
        <Form.Item label="Partner prefix" name="resellerCodePrefix">
          <Input placeholder="RSL" maxLength={16} />
        </Form.Item>
      </Col>
    </Row>
  </div>
);

export default StepOrganization;
