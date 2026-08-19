"use client";

import React from "react";
import { Button, DatePicker, Select, Space } from "antd";
import { WifiMutedText } from "@/features/wifi/shared/components/WifiMutedText";
import { ReloadOutlined } from "@ant-design/icons";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { dateRangePresets } from "../constant";
import type { PlanOption, SiteOption } from "../types";

const { RangePicker } = DatePicker;

type Props = {
  customRange: [Dayjs | null, Dayjs | null] | null;
  stations: SiteOption[];
  plans: PlanOption[];
  stationId?: string;
  planId?: string;
  loading?: boolean;
  dataSource?: "aggregated" | "live";
  onCustomRangeChange: (range: [Dayjs | null, Dayjs | null] | null) => void;
  onStationChange: (value: string | undefined) => void;
  onPlanChange: (value: string | undefined) => void;
  onRefresh: () => void;
};

const TrafficToolbar: React.FC<Props> = ({
  customRange,
  stations,
  plans,
  stationId,
  planId,
  loading,
  dataSource,
  onCustomRangeChange,
  onStationChange,
  onPlanChange,
  onRefresh,
}) => (
  <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
    <Space wrap size="middle" align="center">
      <RangePicker
        allowClear
        value={customRange}
        onChange={(dates) => onCustomRangeChange(dates)}
        format="D MMM YYYY"
        placeholder={["From", "To"]}
        presets={dateRangePresets()}
        disabledDate={(current) => Boolean(current && current.isAfter(dayjs().endOf("day")))}
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
        {dataSource === "live" ? "Live session data" : "Aggregated stats"} · vs prior period
      </WifiMutedText>
      <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
        Refresh
      </Button>
    </Space>
  </div>
);

export default TrafficToolbar;
