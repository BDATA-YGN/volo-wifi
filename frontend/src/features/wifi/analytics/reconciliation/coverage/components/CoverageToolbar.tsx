"use client";

import React from "react";
import { Button, Typography } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const { Text } = Typography;

type Props = {
  generatedAt?: string;
  loading?: boolean;
  onRefresh: () => void;
};

const CoverageToolbar: React.FC<Props> = ({ generatedAt, loading, onRefresh }) => (
  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
    <Text type="secondary" style={{ fontSize: 12 }}>
      {generatedAt
        ? `Coverage snapshot as of ${dayjs(generatedAt).format("D MMM YYYY, HH:mm")}`
        : "Sealed period and purge eligibility report"}
    </Text>
    <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
      Refresh
    </Button>
  </div>
);

export default CoverageToolbar;
