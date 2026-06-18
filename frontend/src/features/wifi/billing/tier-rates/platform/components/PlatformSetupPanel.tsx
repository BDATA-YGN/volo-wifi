"use client";

import React from "react";
import Link from "next/link";
import { Button, Card, Steps, Typography, theme } from "antd";
import { ArrowLeftOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { PLATFORM_SETUP_STEPS } from "../constant";

const { Text, Title } = Typography;

const PlatformSetupPanel: React.FC = () => {
  const { token } = theme.useToken();

  return (
    <Card
      size="small"
      title={
        <div>
          <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6 }}>
            Platform setup
          </Text>
          <Title level={5} style={{ margin: "4px 0 0" }}>
            Step 2 of 3
          </Title>
        </div>
      }
      styles={{ body: { paddingTop: 12 } }}
    >
      <Steps
        orientation="vertical"
        size="small"
        current={1}
        items={PLATFORM_SETUP_STEPS.map((step) => ({
          title: (
            <Text strong={step.active} style={{ fontSize: 13 }}>
              {step.title}
            </Text>
          ),
          content: (
            <Text type="secondary" style={{ fontSize: 12, display: "block", lineHeight: 1.5 }}>
              {step.description}
            </Text>
          ),
        }))}
      />
      <div
        style={{
          marginTop: 16,
          padding: 12,
          borderRadius: token.borderRadius,
          background: token.colorFillAlter,
        }}
      >
        <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.6, display: "block", marginBottom: 12 }}>
          Platform rates apply to all tenants unless overridden on Tenant Tier Rates. Invoices use
          the rate effective on the billing date.
        </Text>
        <div className="flex flex-col gap-1">
          <Link href="/wifi/billing/capacity-tiers">
            <Button type="link" size="small" icon={<ArrowLeftOutlined />} style={{ padding: 0, height: "auto" }}>
              Back to capacity tiers
            </Button>
          </Link>
          <Link href="/wifi/billing/tenant-registration">
            <Button type="link" size="small" icon={<ArrowRightOutlined />} style={{ padding: 0, height: "auto" }}>
              Continue to tenant registration
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
};

export default PlatformSetupPanel;
