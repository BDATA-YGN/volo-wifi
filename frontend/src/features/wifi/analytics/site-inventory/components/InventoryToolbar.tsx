"use client";

import React from "react";
import { Button, Space } from "antd";
import { WifiMutedText } from "@/features/wifi/shared/components/WifiMutedText";
import { ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";


type Props = {
  generatedAt?: string;
  loading?: boolean;
  onRefresh: () => void;
};

const InventoryToolbar: React.FC<Props> = ({ generatedAt, loading, onRefresh }) => (
  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
    <WifiMutedText style={{ fontSize: 12 }}>
      {generatedAt
        ? `Snapshot as of ${dayjs(generatedAt).format("D MMM YYYY, HH:mm")}`
        : "Live site and device inventory"}
    </WifiMutedText>
    <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
      Refresh
    </Button>
  </div>
);

export default InventoryToolbar;
