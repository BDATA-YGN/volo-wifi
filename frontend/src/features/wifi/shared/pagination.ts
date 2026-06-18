import type { TablePaginationConfig } from "antd/es/table";

export const WIFI_TABLE_PAGE_SIZE_OPTIONS = ["10", "20", "50", "100"] as const;

export type WifiTablePaginationInput = {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number, pageSize: number) => void;
  showTotal?: TablePaginationConfig["showTotal"];
  /** e.g. "order" → "42 orders" */
  itemLabel?: string;
};

export function buildWifiTablePagination({
  page,
  pageSize,
  total,
  onChange,
  showTotal,
  itemLabel,
}: WifiTablePaginationInput): TablePaginationConfig {
  return {
    current: page,
    pageSize,
    total,
    showSizeChanger: true,
    pageSizeOptions: [...WIFI_TABLE_PAGE_SIZE_OPTIONS],
    hideOnSinglePage: false,
    showTotal:
      showTotal ??
      (itemLabel
        ? (count) => `${count} ${itemLabel}${count === 1 ? "" : "s"}`
        : (count, range) => `${range[0]}–${range[1]} of ${count}`),
    onChange,
  };
}
