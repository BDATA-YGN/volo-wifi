"use client";

import React from "react";
import { Col, DatePicker, Form, Input, InputNumber, Row, Typography } from "antd";
import type { StationTierPrerequisite } from "../types";
import TierRatePreviewTable from "./TierRatePreviewTable";

const { Paragraph } = Typography;

interface Props {
  tiers: StationTierPrerequisite[];
  currency: string;
}

const StepSubscription: React.FC<Props> = ({ tiers, currency }) => (
  <div>
    <Paragraph type="secondary" style={{ marginBottom: 20 }}>
      Set the licensed site envelope. Per-site capacity tiers are assigned later when sites are created.
    </Paragraph>
    <Row gutter={[16, 0]}>
      <Col xs={24} md={8}>
        <Form.Item
          label="Licensed site limit"
          name="stationLimit"
          rules={[
            { required: true, message: "Site limit is required" },
            { type: "number", min: 1, message: "At least 1 site" },
          ]}
        >
          <InputNumber min={1} max={10000} className="w-full" size="large" />
        </Form.Item>
      </Col>
      <Col xs={24} md={8}>
        <Form.Item name="billingCycle" hidden>
          <Input />
        </Form.Item>
        <Form.Item label="Billing cycle">
          <Input disabled value="Monthly" size="large" />
        </Form.Item>
      </Col>
      <Col xs={24} md={8}>
        <Form.Item
          label="Effective from"
          name="effectiveFrom"
          rules={[{ required: true, message: "Start date is required" }]}
        >
          <DatePicker className="w-full" size="large" />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item label="Expires at (optional)" name="expiresAt">
          <DatePicker className="w-full" size="large" allowClear />
        </Form.Item>
      </Col>
      <Col span={24}>
        <Form.Item label="Internal notes" name="licenseNotes">
          <Input.TextArea rows={2} placeholder="Optional — contract reference or provisioning notes" />
        </Form.Item>
      </Col>
    </Row>

    <TierRatePreviewTable tiers={tiers} currency={currency} readOnly />
  </div>
);

export default StepSubscription;
