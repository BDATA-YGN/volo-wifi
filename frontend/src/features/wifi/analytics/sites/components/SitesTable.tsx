"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Badge, Card, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { SitePlanBreakdown, SitePlanColumn, SiteRow } from "../types";
import { STATION_STATUS_COLOR } from "../utils";
import { resolveTierColor } from "@/features/wifi/shared/tier-colors";
import type { TableExportPayload } from "../table-export";
import TableExportButtons from "./TableExportButtons";
import styles from "./sitesTable.module.css";

const { Text } = Typography;

type Props = {
  rows: SiteRow[];
  plans: SitePlanColumn[];
  planTotals?: SitePlanBreakdown[];
  loading?: boolean;
  exportSubtitle?: string;
  exportFilename?: string;
  onSiteClick?: (row: SiteRow) => void;
};

function formatAmount(amount: number): string {
  return Math.round(amount).toLocaleString();
}

function planMetrics(row: SiteRow, planId: string) {
  return (
    row.byPlan?.find((p) => p.planId === planId) ?? {
      tokensCount: 0,
      revenue: 0,
    }
  );
}

const SitesTable: React.FC<Props> = ({
  rows,
  plans,
  planTotals,
  loading,
  exportSubtitle,
  exportFilename = "site-performance",
  onSiteClick,
}) => {
  const totals = useMemo(() => {
    if (planTotals && planTotals.length > 0) {
      return {
        tokensCount: planTotals.reduce((sum, p) => sum + p.tokensCount, 0),
        revenue: Math.round(planTotals.reduce((sum, p) => sum + p.revenue, 0) * 100) / 100,
        byPlan: new Map(planTotals.map((p) => [p.planId, p])),
      };
    }
    const byPlan = new Map<string, { tokensCount: number; revenue: number }>();
    let tokensCount = 0;
    let revenue = 0;
    for (const row of rows) {
      tokensCount += row.itemsCount;
      revenue += row.revenue;
      for (const plan of row.byPlan ?? []) {
        const current = byPlan.get(plan.planId) ?? { tokensCount: 0, revenue: 0 };
        current.tokensCount += plan.tokensCount;
        current.revenue += plan.revenue;
        byPlan.set(plan.planId, current);
      }
    }
    return {
      tokensCount,
      revenue: Math.round(revenue * 100) / 100,
      byPlan,
    };
  }, [rows, planTotals]);

  const sortedByAmount = useMemo(
    () => [...rows].sort((a, b) => b.revenue - a.revenue),
    [rows]
  );
  const [exportRows, setExportRows] = useState<SiteRow[]>(sortedByAmount);

  useEffect(() => {
    setExportRows(sortedByAmount);
  }, [sortedByAmount]);

  const exportPayload = useMemo<TableExportPayload>(() => {
    const columns = [
      { title: "Site" },
      { title: "Tier" },
      { title: "Status" },
      ...plans.flatMap((plan) => [
        { title: `${plan.name} tokens`, align: "right" as const, format: "integer" as const },
        { title: `${plan.name} amount`, align: "right" as const, format: "amount" as const },
      ]),
      { title: "Total tokens", align: "right" as const, format: "integer" as const },
      { title: "Total amount", align: "right" as const, format: "amount" as const },
    ];

    const tableRows = exportRows.map((row) => [
      row.name,
      row.stationSizeCode,
      row.status,
      ...plans.flatMap((plan) => {
        const metrics = planMetrics(row, plan.planId);
        return [metrics.tokensCount, Math.round(metrics.revenue)];
      }),
      row.itemsCount,
      Math.round(row.revenue),
    ]);

    const footer = [
      "Total",
      "",
      "",
      ...plans.flatMap((plan) => {
        const planTotal = totals.byPlan.get(plan.planId) ?? { tokensCount: 0, revenue: 0 };
        return [planTotal.tokensCount, Math.round(planTotal.revenue)];
      }),
      totals.tokensCount,
      Math.round(totals.revenue),
    ];

    return {
      filename: exportFilename,
      title: "Performance by site",
      subtitle: exportSubtitle,
      columns,
      rows: tableRows,
      footer,
    };
  }, [exportRows, plans, totals, exportFilename, exportSubtitle]);

  const columns: ColumnsType<SiteRow> = useMemo(() => {
    const planColumns: ColumnsType<SiteRow> = plans.map((plan) => ({
      title: plan.name,
      key: `plan-${plan.planId}`,
      align: "right" as const,
      children: [
        {
          title: "Tokens",
          key: `tokens-${plan.planId}`,
          width: 96,
          align: "right" as const,
          sortDirections: ["descend", "ascend"],
          sorter: (a: SiteRow, b: SiteRow) =>
            planMetrics(a, plan.planId).tokensCount - planMetrics(b, plan.planId).tokensCount,
          render: (_: unknown, row: SiteRow) => {
            const value = planMetrics(row, plan.planId).tokensCount;
            return value > 0 ? value.toLocaleString() : <Text type="secondary">0</Text>;
          },
        },
        {
          title: "Amount",
          key: `amount-${plan.planId}`,
          width: 120,
          align: "right" as const,
          sortDirections: ["descend", "ascend"],
          sorter: (a: SiteRow, b: SiteRow) =>
            planMetrics(a, plan.planId).revenue - planMetrics(b, plan.planId).revenue,
          render: (_: unknown, row: SiteRow) => {
            const value = planMetrics(row, plan.planId).revenue;
            return value > 0 ? (
              formatAmount(value)
            ) : (
              <Text type="secondary">0</Text>
            );
          },
        },
      ],
    }));

    return [
      {
        title: "Site",
        key: "site",
        fixed: "left",
        width: 220,
        sorter: (a, b) => a.name.localeCompare(b.name),
        render: (_, row) => (
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Text strong style={onSiteClick ? { color: "var(--ant-color-primary)" } : undefined}>
                {row.name}
              </Text>
              <Tag
                color={resolveTierColor(row.stationSizeCode, row.stationSizeName)}
                title={row.stationSizeName}
                style={{ marginInlineEnd: 0, fontFamily: "monospace" }}
              >
                {row.stationSizeCode}
              </Tag>
            </div>
            <div className="mt-1">
              <Badge
                status={
                  (STATION_STATUS_COLOR[row.status] as
                    | "success"
                    | "warning"
                    | "error"
                    | "default") ?? "default"
                }
                text={row.status}
                style={{ fontSize: 12 }}
              />
            </div>
          </div>
        ),
      },
      ...planColumns,
      {
        title: "Total",
        key: "total",
        fixed: "right",
        children: [
          {
            title: "Tokens",
            key: "totalTokens",
            width: 100,
            align: "right" as const,
            sortDirections: ["descend", "ascend"],
            sorter: (a: SiteRow, b: SiteRow) => a.itemsCount - b.itemsCount,
            render: (_: unknown, row: SiteRow) => (
              <Text strong>{row.itemsCount.toLocaleString()}</Text>
            ),
          },
          {
            title: "Amount",
            key: "totalAmount",
            width: 128,
            align: "right" as const,
            defaultSortOrder: "descend" as const,
            sortDirections: ["descend", "ascend"],
            sorter: (a: SiteRow, b: SiteRow) => a.revenue - b.revenue,
            render: (_: unknown, row: SiteRow) => (
              <Text strong>{formatAmount(row.revenue)}</Text>
            ),
          },
        ],
      },
    ];
  }, [plans, onSiteClick]);

  const scrollX = 220 + plans.length * 216 + 228;

  return (
    <Card
      size="small"
      title="Performance by site"
      extra={<TableExportButtons payload={exportPayload} disabled={rows.length === 0} />}
      styles={{ body: { padding: 0 } }}
    >
      <Table<SiteRow>
        className={styles.sitesTable}
        rowKey="stationId"
        size="middle"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={false}
        showSorterTooltip={false}
        scroll={{ x: scrollX }}
        onRow={
          onSiteClick
            ? (row) => ({
                onClick: () => onSiteClick(row),
                style: { cursor: "pointer" },
              })
            : undefined
        }
        onChange={(_pagination, _filters, _sorter, extra) => {
          setExportRows(extra.currentDataSource as SiteRow[]);
        }}
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}>
                <Text strong>Total</Text>
              </Table.Summary.Cell>
              {plans.map((plan, idx) => {
                const planTotal = totals.byPlan.get(plan.planId) ?? {
                  tokensCount: 0,
                  revenue: 0,
                };
                return (
                  <React.Fragment key={plan.planId}>
                    <Table.Summary.Cell index={1 + idx * 2} align="right">
                      <Text strong>{planTotal.tokensCount.toLocaleString()}</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2 + idx * 2} align="right">
                      <Text strong>
                        {formatAmount(Math.round(planTotal.revenue * 100) / 100)}
                      </Text>
                    </Table.Summary.Cell>
                  </React.Fragment>
                );
              })}
              <Table.Summary.Cell index={1 + plans.length * 2} align="right">
                <Text strong>{totals.tokensCount.toLocaleString()}</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2 + plans.length * 2} align="right">
                <Text strong>{formatAmount(totals.revenue)}</Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />
    </Card>
  );
};

export default SitesTable;
