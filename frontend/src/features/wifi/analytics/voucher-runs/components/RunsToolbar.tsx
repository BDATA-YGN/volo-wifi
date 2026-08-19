"use client";

import React from "react";
import { Button, DatePicker, Select, Space } from "antd";
import { WifiMutedText } from "@/features/wifi/shared/components/WifiMutedText";
import { ReloadOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import type { PlanOption, SiteOption } from "../types";

type Props = {
  month: string;
  stations: SiteOption[];
  plans: PlanOption[];
  stationId?: string;
  planId?: string;
  loading?: boolean;
  onMonthChange: (month: string) => void;
  onStationChange: (value: string | undefined) => void;
  onPlanChange: (value: string | undefined) => void;
  onRefresh: () => void;
};

const RunsToolbar: React.FC<Props> = ({
  month,
  stations,
  plans,
  stationId,
  planId,
  loading,
  onMonthChange,
  onStationChange,
  onPlanChange,
  onRefresh,
}) => {
  const thisMonth = dayjs().startOf("month");

  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <Space wrap size="middle" align="center">
        <DatePicker
          picker="month"
          allowClear={false}
          value={dayjs(`${month}-01`)}
          format="MMM YYYY"
          disabledDate={(current: Dayjs) => current.startOf("month").isAfter(thisMonth)}
          onChange={(value) => {
            if (value) onMonthChange(value.format("YYYY-MM"));
          }}
        />
        <Select
          allowClear
          showSearch
          placeholder="All sites"
          style={{ minWidth: 200 }}
          loading={loading}
          value={stationId}
          optionFilterProp="label"
          onChange={(v) => onStationChange(v)}
          options={stations.map((s) => ({
            value: s.id,
            label: `${s.name} (${s.code})`,
          }))}
        />
        <Select
          allowClear
          showSearch
          placeholder="All plans"
          style={{ minWidth: 200 }}
          loading={loading}
          value={planId}
          optionFilterProp="label"
          onChange={(v) => onPlanChange(v)}
          options={plans.map((p) => ({
            value: p.id,
            label: `${p.name} (${p.code})`,
          }))}
        />
      </Space>
      <Space>
        <WifiMutedText style={{ fontSize: 12 }}>
          Batches created in month · vs previous month
        </WifiMutedText>
        <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
          Refresh
        </Button>
      </Space>
    </div>
  );
};

export default RunsToolbar;
