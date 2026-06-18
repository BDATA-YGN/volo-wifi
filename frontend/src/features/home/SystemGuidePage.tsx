"use client";

import React from "react";
import {
  Card,
  Col,
  Collapse,
  Flex,
  Row,
  Space,
  Tag,
  Typography,
  theme,
} from "antd";
import {
  BookOutlined,
  CheckCircleOutlined,
  HomeOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { useSystemGuide } from "./useSystemGuide";

const { Title, Paragraph, Text } = Typography;

const SystemGuidePage: React.FC = () => {
  const { token } = theme.useToken();
  const guide = useSystemGuide();

  return (
    <div style={{ padding: "20px 24px", maxWidth: 1200, margin: "0 auto" }}>
      <Card
        variant="borderless"
        style={{
          marginBottom: 24,
          borderRadius: token.borderRadiusLG,
          boxShadow: token.boxShadowTertiary,
          background: `linear-gradient(135deg, ${token.colorPrimaryBg} 0%, ${token.colorBgContainer} 55%)`,
        }}
      >
        <Space orientation="vertical" size={8} style={{ width: "100%" }}>
          <Space align="center">
            <HomeOutlined style={{ fontSize: 28, color: token.colorPrimary }} />
            <Title level={3} style={{ margin: 0 }}>
              {guide.title}
            </Title>
          </Space>
          <Paragraph type="secondary" style={{ marginBottom: 0, fontSize: 15 }}>
            {guide.subtitle}
          </Paragraph>
          <Paragraph style={{ marginBottom: 0 }}>{guide.welcome}</Paragraph>
        </Space>
      </Card>

      <Title level={4} style={{ marginBottom: 16 }}>
        <BookOutlined style={{ marginRight: 8, color: token.colorPrimary }} />
        {guide.modulesTitle}
      </Title>
      <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
        {guide.modules.map((mod) => (
          <Col xs={24} sm={12} lg={8} key={mod.key}>
            <Card
              size="small"
              variant="borderless"
              style={{
                height: "100%",
                borderRadius: token.borderRadiusLG,
                boxShadow: token.boxShadowTertiary,
              }}
              title={
                <Space>
                  {React.createElement(mod.icon, { style: { color: token.colorPrimary } })}
                  <Text strong>{mod.title}</Text>
                </Space>
              }
            >
              <Paragraph type="secondary" style={{ fontSize: 13, minHeight: 40 }}>
                {mod.summary}
              </Paragraph>
              <Flex vertical gap={8}>
                {mod.features.map((item, index) => (
                  <Space key={`${mod.key}-f${index}`} align="start">
                    <CheckCircleOutlined style={{ color: token.colorSuccess, marginTop: 4 }} />
                    <Text style={{ fontSize: 13 }}>{item}</Text>
                  </Space>
                ))}
              </Flex>
            </Card>
          </Col>
        ))}
      </Row>

      <Title level={4} style={{ marginBottom: 16 }}>
        {guide.workflowsTitle}
      </Title>
      <Collapse
        style={{ marginBottom: 32 }}
        items={guide.workflows.map((flow) => ({
          key: flow.key,
          label: <Text strong>{flow.title}</Text>,
          children: (
            <Paragraph style={{ marginBottom: 0, whiteSpace: "pre-line" }}>{flow.steps}</Paragraph>
          ),
        }))}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card
            variant="borderless"
            title={
              <Space>
                <SafetyCertificateOutlined style={{ color: token.colorWarning }} />
                <span>{guide.rulesTitle}</span>
              </Space>
            }
            style={{
              borderRadius: token.borderRadiusLG,
              boxShadow: token.boxShadowTertiary,
              height: "100%",
            }}
          >
            <Flex vertical gap={12}>
              {guide.rules.map((item, index) => (
                <Space key={`rule-${index}`} align="start">
                  <Tag color="blue">{index + 1}</Tag>
                  <Text>{item}</Text>
                </Space>
              ))}
            </Flex>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card
            variant="borderless"
            title={
              <Space>
                <TeamOutlined style={{ color: token.colorPrimary }} />
                <span>{guide.rolesTitle}</span>
              </Space>
            }
            style={{
              borderRadius: token.borderRadiusLG,
              boxShadow: token.boxShadowTertiary,
              height: "100%",
            }}
          >
            <Flex vertical gap={16}>
              {guide.roles.map((role) => (
                <div key={role.key}>
                  <Text strong>{role.title}</Text>
                  <Paragraph type="secondary" style={{ marginBottom: 0, marginTop: 4 }}>
                    {role.description}
                  </Paragraph>
                </div>
              ))}
            </Flex>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SystemGuidePage;
