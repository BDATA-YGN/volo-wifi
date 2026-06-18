"use client";

import React from "react";
import { Button } from "antd";
import { WifiMutedText } from "@/features/wifi/shared/components/WifiMutedText";
import { ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";


type Props = {
  generatedAt?: string;
  loading?: boolean;
  onRefresh: () => void;
};

const NasToolbar: React.FC<Props> = ({ generatedAt, loading, onRefresh }) => (
  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
    <WifiMutedText style={{ fontSize: 12 }}>
      {generatedAt
        ? `Fleet snapshot as of ${dayjs(generatedAt).format("D MMM YYYY, HH:mm")}`
        : "Live NAS device fleet report"}
    </WifiMutedText>
    <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
      Refresh
    </Button>
  </div>
);

export default NasToolbar;
