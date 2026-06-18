"use client";

import React from "react";
import { Button, Card, Result, Space, Typography } from "antd";
import { ArrowRightOutlined, TeamOutlined, UserAddOutlined } from "@ant-design/icons";
import Link from "next/link";
import type { TenantRegistrationResult } from "../types";

const { Text } = Typography;

interface Props {
  result: TenantRegistrationResult;
  onRegisterAnother: () => void;
}

const RegistrationSuccess: React.FC<Props> = ({ result, onRegisterAnother }) => (
  <Card>
    <Result
      status="success"
      title="Tenant registered successfully"
      subTitle={
        <Space orientation="vertical" size={4}>
          <Text>
            <Text strong>{result.orgName}</Text> ({result.orgCode}) is ready for Step 2.
          </Text>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Organization, active license, and owner account were created atomically.
          </Text>
        </Space>
      }
      extra={
        <Space wrap>
          <Link href="/wifi/tenant/access-control">
            <Button type="primary" icon={<UserAddOutlined />}>
              Access Control (Step 2)
            </Button>
          </Link>
          <Link href="/wifi/tenants">
            <Button icon={<TeamOutlined />}>Tenant Directory</Button>
          </Link>
          <Button icon={<ArrowRightOutlined />} onClick={onRegisterAnother}>
            Register another tenant
          </Button>
        </Space>
      }
    />
  </Card>
);

export default RegistrationSuccess;
