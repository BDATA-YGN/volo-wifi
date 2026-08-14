"use client";

import React from "react";
import { Button, Checkbox, DatePicker, Segmented, Space, Tag } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import type { SiteAnalyticsTab } from "../types";
import { SITE_ANALYTICS_TABS, dateRangePresets, todayRange } from "../constant";

const { RangePicker } = DatePicker;

type Props = {
  tab: SiteAnalyticsTab;
  customRange: [Dayjs | null, Dayjs | null] | null;
  dataSource?: "aggregated" | "live";
  hideZeroSales?: boolean;
  loading?: boolean;
  onTabChange: (tab: SiteAnalyticsTab) => void;
  onCustomRangeChange: (range: [Dayjs | null, Dayjs | null] | null) => void;
  onHideZeroSalesChange: (hide: boolean) => void;
  onRefresh: () => void;
};

const SitesToolbar: React.FC<Props> = ({
  tab,
  customRange,
  dataSource,
  hideZeroSales = false,
  loading,
  onTabChange,
  onCustomRangeChange,
  onHideZeroSalesChange,
  onRefresh,
}) => (
  <div className="flex flex-wrap items-center justify-between gap-3">
    <div className="flex flex-wrap items-center gap-3">
      <Segmented
        value={tab}
        options={SITE_ANALYTICS_TABS.map((item) => ({
          value: item.key,
          label: item.label,
        }))}
        onChange={(value) => onTabChange(value as SiteAnalyticsTab)}
      />
      {tab !== "stats" ? (
        <Checkbox
          checked={hideZeroSales}
          onChange={() => onHideZeroSalesChange(!hideZeroSales)}
        >
          Hide zero sales
        </Checkbox>
      ) : null}
    </div>
    <Space wrap align="center" size={8}>
      <RangePicker
        allowClear={false}
        value={customRange ?? todayRange()}
        onChange={(dates) => onCustomRangeChange(dates)}
        format="D MMM YYYY"
        placeholder={["From", "To"]}
        presets={dateRangePresets()}
        disabledDate={(current) => current.isAfter(dayjs(), "day")}
        style={{ width: 260 }}
      />
      {dataSource ? (
        <Tag color={dataSource === "aggregated" ? "blue" : "orange"} style={{ marginInlineEnd: 0 }}>
          {dataSource === "aggregated" ? "Daily stats" : "Live"}
        </Tag>
      ) : null}
      <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading} />
    </Space>
  </div>
);

export default SitesToolbar;
