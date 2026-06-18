"use client";

import React from "react";
import { Card, Steps, Typography, theme } from "antd";
import { ONBOARDING_LIFECYCLE } from "../constant";

const { Text, Title } = Typography;

const OnboardingContextPanel: React.FC = () => {
  const { token } = theme.useToken();

  return (
    <Card
      size="small"
      title={
        <div>
          <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6 }}>
            Onboarding lifecycle
          </Text>
          <Title level={5} style={{ margin: "4px 0 0" }}>
            Step 1 of 5
          </Title>
        </div>
      }
      styles={{ body: { paddingTop: 12 } }}
    >
      <Steps
        orientation="vertical"
        size="small"
        current={0}
        items={ONBOARDING_LIFECYCLE.map((item) => ({
          title: (
            <Text strong={item.active} style={{ fontSize: 13 }}>
              {item.title}
            </Text>
          ),
          content: item.active ? (
            <Text type="secondary" style={{ fontSize: 12 }}>
              You are here — create org, license, and owner in one flow.
            </Text>
          ) : (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Unlocks after prior steps
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
        <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.6 }}>
          No public self-signup or external invites. The platform admin provisions the tenant owner
          account internally.
        </Text>
      </div>
    </Card>
  );
};

export default OnboardingContextPanel;
