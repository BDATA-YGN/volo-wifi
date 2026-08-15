"use client";

import React from "react";
import { Button, Checkbox, DatePicker, Segmented, Select, Space, Tag } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import type { SiteAnalyticsTab, SiteOption, StationSizeOption } from "../types";
import { SITE_ANALYTICS_TABS, dateRangePresets, todayRange } from "../constant";

const { RangePicker } = DatePicker;

type Props = {
  tab: SiteAnalyticsTab;
  customRange: [Dayjs | null, Dayjs | null] | null;
  dataSource?: "aggregated" | "live";
  hideZeroSales?: boolean;
  stations?: SiteOption[];
  stationSizes?: StationSizeOption[];
  selectedSiteIds?: string[];
  selectedTierIds?: string[];
  loading?: boolean;
  onTabChange: (tab: SiteAnalyticsTab) => void;
  onCustomRangeChange: (range: [Dayjs | null, Dayjs | null] | null) => void;
  onHideZeroSalesChange: (hide: boolean) => void;
  onSiteIdsChange: (ids: string[]) => void;
  onTierIdsChange: (ids: string[]) => void;
  onRefresh: () => void;
};

const SitesToolbar: React.FC<Props> = ({
  tab,
  customRange,
  dataSource,
  hideZeroSales = false,
  stations = [],
  stationSizes = [],
  selectedSiteIds = [],
  selectedTierIds = [],
  loading,
  onTabChange,
  onCustomRangeChange,
  onHideZeroSalesChange,
  onSiteIdsChange,
  onTierIdsChange,
  onRefresh,
}) => {
  const siteOptions = stations
    .filter((site) => selectedTierIds.length === 0 || selectedTierIds.includes(site.stationSizeId))
    .map((site) => ({
      value: site.id,
      label: site.name,
    }));

  return (
    <div className="flex flex-col gap-3">
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

      {tab !== "stats" ? (
        <div className="flex flex-wrap items-center gap-2">
          <Select
            mode="multiple"
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="All sites"
            value={selectedSiteIds}
            onChange={(ids) => onSiteIdsChange(ids)}
            options={siteOptions}
            maxTagCount="responsive"
            style={{ minWidth: 220, flex: "1 1 220px", maxWidth: 420 }}
          />
          <Select
            mode="multiple"
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="All tiers"
            value={selectedTierIds}
            onChange={(ids) => onTierIdsChange(ids)}
            options={stationSizes.map((tier) => ({
              value: tier.id,
              label: `${tier.name} (${tier.code})`,
            }))}
            maxTagCount="responsive"
            style={{ minWidth: 200, flex: "1 1 200px", maxWidth: 360 }}
          />
        </div>
      ) : null}
    </div>
  );
};

export default SitesToolbar;
