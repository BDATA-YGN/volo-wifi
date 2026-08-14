"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { SitePlanBreakdown, SitePlanColumn, SiteTierRow } from "../types";
import { resolveTierColor } from "@/features/wifi/shared/tier-colors";
import type { TableExportPayload } from "../table-export";
import TableExportButtons from "./TableExportButtons";
import styles from "./sitesTable.module.css";

const { Text } = Typography;

type Props = {
  rows: SiteTierRow[];
  plans: SitePlanColumn[];
  planTotals?: SitePlanBreakdown[];
  loading?: boolean;
  exportSubtitle?: string;
  exportFilename?: string;
};

function formatAmount(amount: number): string {
  return Math.round(amount).toLocaleString();
}

function planMetrics(row: SiteTierRow, planId: string) {
  return (
    row.byPlan?.find((p) => p.planId === planId) ?? {
      tokensCount: 0,
      revenue: 0,
    }
  );
}

const SitesTierTable: React.FC<Props> = ({
  rows,
  plans,
  planTotals,
  loading,
  exportSubtitle,
  exportFilename = "tier-performance",
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
  const [exportRows, setExportRows] = useState<SiteTierRow[]>(sortedByAmount);

  useEffect(() => {
    setExportRows(sortedByAmount);
  }, [sortedByAmount]);

  const exportPayload = useMemo<TableExportPayload>(() => {
    const columns = [
      { title: "Tier" },
      { title: "Sites", align: "right" as const, format: "integer" as const },
      ...plans.flatMap((plan) => [
        { title: `${plan.name} tokens`, align: "right" as const, format: "integer" as const },
        { title: `${plan.name} amount`, align: "right" as const, format: "amount" as const },
      ]),
      { title: "Total tokens", align: "right" as const, format: "integer" as const },
      { title: "Total amount", align: "right" as const, format: "amount" as const },
    ];

    const tableRows = exportRows.map((row) => [
      row.code,
      row.siteCount,
      ...plans.flatMap((plan) => {
        const metrics = planMetrics(row, plan.planId);
        return [metrics.tokensCount, Math.round(metrics.revenue)];
      }),
      row.itemsCount,
      Math.round(row.revenue),
    ]);

    const footer = [
      "Total",
      exportRows.reduce((sum, row) => sum + row.siteCount, 0),
      ...plans.flatMap((plan) => {
        const planTotal = totals.byPlan.get(plan.planId) ?? { tokensCount: 0, revenue: 0 };
        return [planTotal.tokensCount, Math.round(planTotal.revenue)];
      }),
      totals.tokensCount,
      Math.round(totals.revenue),
    ];

    return {
      filename: exportFilename,
      title: "Performance by tier",
      subtitle: exportSubtitle,
      columns,
      rows: tableRows,
      footer,
    };
  }, [exportRows, plans, totals, exportFilename, exportSubtitle]);

  const columns: ColumnsType<SiteTierRow> = useMemo(() => {
    const planColumns: ColumnsType<SiteTierRow> = plans.map((plan) => ({
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
          sorter: (a: SiteTierRow, b: SiteTierRow) =>
            planMetrics(a, plan.planId).tokensCount - planMetrics(b, plan.planId).tokensCount,
          render: (_: unknown, row: SiteTierRow) => {
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
          sorter: (a: SiteTierRow, b: SiteTierRow) =>
            planMetrics(a, plan.planId).revenue - planMetrics(b, plan.planId).revenue,
          render: (_: unknown, row: SiteTierRow) => {
            const value = planMetrics(row, plan.planId).revenue;
            return value > 0 ? formatAmount(value) : <Text type="secondary">0</Text>;
          },
        },
      ],
    }));

    return [
      {
        title: "Tier",
        key: "tier",
        fixed: "left",
        width: 88,
        sorter: (a, b) => a.code.localeCompare(b.code),
        render: (_, row) => (
          <Tag
            color={resolveTierColor(row.code, row.name)}
            title={row.name}
            style={{ fontFamily: "monospace", marginInlineEnd: 0 }}
          >
            {row.code}
          </Tag>
        ),
      },
      {
        title: "Sites",
        key: "sites",
        width: 88,
        align: "right",
        sorter: (a, b) => a.siteCount - b.siteCount,
        render: (_, row) => (
          <span>
            {row.activeSiteCount}
            <Text type="secondary"> / {row.siteCount}</Text>
          </span>
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
            sorter: (a: SiteTierRow, b: SiteTierRow) => a.itemsCount - b.itemsCount,
            render: (_: unknown, row: SiteTierRow) => (
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
            sorter: (a: SiteTierRow, b: SiteTierRow) => a.revenue - b.revenue,
            render: (_: unknown, row: SiteTierRow) => (
              <Text strong>{formatAmount(row.revenue)}</Text>
            ),
          },
        ],
      },
    ];
  }, [plans]);

  const scrollX = 176 + plans.length * 216 + 228;

  return (
    <Card
      size="small"
      title="Performance by tier"
      extra={<TableExportButtons payload={exportPayload} disabled={rows.length === 0} />}
      styles={{ body: { padding: 0 } }}
    >
      <Table<SiteTierRow>
        className={styles.sitesTable}
        rowKey="stationSizeId"
        size="middle"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={false}
        showSorterTooltip={false}
        scroll={{ x: scrollX }}
        onChange={(_pagination, _filters, _sorter, extra) => {
          setExportRows(extra.currentDataSource as SiteTierRow[]);
        }}
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}>
                <Text strong>Total</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">
                <Text strong>
                  {rows.reduce((sum, row) => sum + row.activeSiteCount, 0)}
                  <Text type="secondary">
                    {" "}
                    / {rows.reduce((sum, row) => sum + row.siteCount, 0)}
                  </Text>
                </Text>
              </Table.Summary.Cell>
              {plans.map((plan, idx) => {
                const planTotal = totals.byPlan.get(plan.planId) ?? {
                  tokensCount: 0,
                  revenue: 0,
                };
                return (
                  <React.Fragment key={plan.planId}>
                    <Table.Summary.Cell index={2 + idx * 2} align="right">
                      <Text strong>{planTotal.tokensCount.toLocaleString()}</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3 + idx * 2} align="right">
                      <Text strong>{formatAmount(Math.round(planTotal.revenue * 100) / 100)}</Text>
                    </Table.Summary.Cell>
                  </React.Fragment>
                );
              })}
              <Table.Summary.Cell index={2 + plans.length * 2} align="right">
                <Text strong>{totals.tokensCount.toLocaleString()}</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3 + plans.length * 2} align="right">
                <Text strong>{formatAmount(totals.revenue)}</Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />
    </Card>
  );
};

export default SitesTierTable;
