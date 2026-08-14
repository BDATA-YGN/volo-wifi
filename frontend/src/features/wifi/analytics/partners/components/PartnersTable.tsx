"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { STATUS_COLOR } from "@/features/wifi/commerce/partners/constant";
import { formatStatusLabel } from "@/features/wifi/commerce/partners/utils";
import type { PartnerPlanBreakdown, PartnerPlanColumn, PartnerRow } from "../types";
import type { TableExportPayload } from "@/features/wifi/analytics/sites/table-export";
import TableExportButtons from "@/features/wifi/analytics/sites/components/TableExportButtons";
import styles from "@/features/wifi/analytics/sites/components/sitesTable.module.css";

const { Text } = Typography;

type Props = {
  rows: PartnerRow[];
  plans: PartnerPlanColumn[];
  planTotals?: PartnerPlanBreakdown[];
  loading?: boolean;
  exportSubtitle?: string;
  exportFilename?: string;
};

function formatAmount(amount: number): string {
  return Math.round(amount).toLocaleString();
}

function siteNames(row: PartnerRow): string {
  return (row.stations ?? []).map((site) => site.name).join(", ");
}

function planMetrics(row: PartnerRow, planId: string) {
  return (
    row.byPlan?.find((p) => p.planId === planId) ?? {
      tokensCount: 0,
      revenue: 0,
    }
  );
}

const PartnersTable: React.FC<Props> = ({
  rows,
  plans,
  planTotals,
  loading,
  exportSubtitle,
  exportFilename = "partner-performance",
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
  const [exportRows, setExportRows] = useState<PartnerRow[]>(sortedByAmount);

  useEffect(() => {
    setExportRows(sortedByAmount);
  }, [sortedByAmount]);

  const exportPayload = useMemo<TableExportPayload>(() => {
    const columns = [
      { title: "Partner" },
      { title: "Sites" },
      ...plans.flatMap((plan) => [
        { title: `${plan.name} tokens`, align: "right" as const, format: "integer" as const },
        { title: `${plan.name} amount`, align: "right" as const, format: "amount" as const },
      ]),
      { title: "Total tokens", align: "right" as const, format: "integer" as const },
      { title: "Total amount", align: "right" as const, format: "amount" as const },
    ];

    const tableRows = exportRows.map((row) => [
      row.name,
      siteNames(row),
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
      ...plans.flatMap((plan) => {
        const planTotal = totals.byPlan.get(plan.planId) ?? { tokensCount: 0, revenue: 0 };
        return [planTotal.tokensCount, Math.round(planTotal.revenue)];
      }),
      totals.tokensCount,
      Math.round(totals.revenue),
    ];

    return {
      filename: exportFilename,
      title: "Performance by partner",
      subtitle: exportSubtitle,
      columns,
      rows: tableRows,
      footer,
    };
  }, [exportRows, plans, totals, exportFilename, exportSubtitle]);

  const columns: ColumnsType<PartnerRow> = useMemo(() => {
    const planColumns: ColumnsType<PartnerRow> = plans.map((plan) => ({
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
          sorter: (a: PartnerRow, b: PartnerRow) =>
            planMetrics(a, plan.planId).tokensCount - planMetrics(b, plan.planId).tokensCount,
          render: (_: unknown, row: PartnerRow) => {
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
          sorter: (a: PartnerRow, b: PartnerRow) =>
            planMetrics(a, plan.planId).revenue - planMetrics(b, plan.planId).revenue,
          render: (_: unknown, row: PartnerRow) => {
            const value = planMetrics(row, plan.planId).revenue;
            return value > 0 ? formatAmount(value) : <Text type="secondary">0</Text>;
          },
        },
      ],
    }));

    return [
      {
        title: "Partner",
        key: "partner",
        fixed: "left",
        width: 220,
        sorter: (a, b) => a.name.localeCompare(b.name),
        render: (_, row) => (
          <div>
            <Text strong>{row.name}</Text>
            <div className="mt-1">
              <Tag
                color={STATUS_COLOR[row.status as keyof typeof STATUS_COLOR] ?? "default"}
                style={{ marginInlineEnd: 0 }}
              >
                {formatStatusLabel(row.status as "ACTIVE" | "SUSPENDED" | "DISABLED")}
              </Tag>
            </div>
          </div>
        ),
      },
      {
        title: "Sites",
        key: "sites",
        width: 220,
        sorter: (a, b) => siteNames(a).localeCompare(siteNames(b)),
        render: (_, row) => {
          const names = row.stations ?? [];
          if (names.length === 0) return <Text type="secondary">—</Text>;
          return (
            <div className="flex flex-col gap-0.5">
              {names.map((site) => (
                <Text key={site.stationId}>{site.name}</Text>
              ))}
            </div>
          );
        },
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
            sorter: (a: PartnerRow, b: PartnerRow) => a.itemsCount - b.itemsCount,
            render: (_: unknown, row: PartnerRow) => (
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
            sorter: (a: PartnerRow, b: PartnerRow) => a.revenue - b.revenue,
            render: (_: unknown, row: PartnerRow) => (
              <Text strong>{formatAmount(row.revenue)}</Text>
            ),
          },
        ],
      },
    ];
  }, [plans]);

  const scrollX = 440 + plans.length * 216 + 228;

  return (
    <Card
      size="small"
      title="Performance by partner"
      extra={<TableExportButtons payload={exportPayload} disabled={rows.length === 0} />}
      styles={{ body: { padding: 0 } }}
    >
      <Table<PartnerRow>
        className={styles.sitesTable}
        rowKey="resellerId"
        size="middle"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={false}
        showSorterTooltip={false}
        scroll={{ x: scrollX }}
        onChange={(_pagination, _filters, _sorter, extra) => {
          setExportRows(extra.currentDataSource as PartnerRow[]);
        }}
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}>
                <Text strong>Total</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1}>
                <Text type="secondary">—</Text>
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

export default PartnersTable;
