"use client";

import React, { useMemo } from "react";
import { Badge, Card, Table, Tag, Typography } from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import type { SitePlanBreakdown, SitePlanColumn, SiteRow } from "../types";
import { STATION_STATUS_COLOR, formatMoney } from "../utils";
import { resolveTierColor } from "@/features/wifi/shared/tier-colors";

const { Text } = Typography;

type Props = {
  rows: SiteRow[];
  plans: SitePlanColumn[];
  planTotals?: SitePlanBreakdown[];
  currency: string;
  loading?: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number, pageSize: number) => void;
  onSelectSite?: (stationId: string) => void;
  selectedStationId?: string | null;
};

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
  currency,
  loading,
  page,
  pageSize,
  total,
  onPageChange,
  onSelectSite,
  selectedStationId,
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

  const columns: ColumnsType<SiteRow> = useMemo(() => {
    const planColumns: ColumnsType<SiteRow> = plans.map((plan) => ({
      title: (
        <div>
          <div>{plan.name}</div>
          <Text type="secondary" style={{ fontSize: 11, fontFamily: "monospace" }}>
            {plan.code}
          </Text>
        </div>
      ),
      key: `plan-${plan.planId}`,
      align: "right" as const,
      children: [
        {
          title: "Tokens",
          key: `tokens-${plan.planId}`,
          width: 80,
          align: "right" as const,
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
          render: (_: unknown, row: SiteRow) => {
            const value = planMetrics(row, plan.planId).revenue;
            return value > 0 ? (
              formatMoney(value, currency)
            ) : (
              <Text type="secondary">{formatMoney(0, currency)}</Text>
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
        render: (_, row) => (
          <div>
            <Text strong>{row.name}</Text>
            <div className="mt-1 flex flex-wrap gap-1">
              <Tag style={{ fontFamily: "monospace" }}>{row.code}</Tag>
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
      {
        title: "Tier",
        key: "tier",
        width: 120,
        render: (_, row) => (
          <div>
            <Text style={{ fontSize: 13 }}>{row.stationSizeName}</Text>
            <div>
              <Tag
                color={resolveTierColor(row.stationSizeCode, row.stationSizeName)}
                style={{ fontFamily: "monospace", marginTop: 2 }}
              >
                {row.stationSizeCode}
              </Tag>
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
            width: 90,
            align: "right" as const,
            render: (_: unknown, row: SiteRow) => (
              <Text strong>{row.itemsCount.toLocaleString()}</Text>
            ),
          },
          {
            title: "Amount",
            key: "totalAmount",
            width: 130,
            align: "right" as const,
            render: (_: unknown, row: SiteRow) => (
              <Text strong>{formatMoney(row.revenue, currency)}</Text>
            ),
          },
        ],
      },
    ];
  }, [plans, currency]);

  const scrollX = 340 + plans.length * 200 + 220;

  const pagination: TablePaginationConfig = {
    current: page,
    pageSize,
    total,
    showSizeChanger: true,
    pageSizeOptions: [10, 20, 50, 100],
    showTotal: (count, range) =>
      count === 0 ? "0 sites" : `${range[0]}-${range[1]} of ${count} sites`,
    onChange: onPageChange,
    onShowSizeChange: onPageChange,
  };

  return (
    <Card size="small" title="Performance by site" styles={{ body: { padding: 0 } }}>
      <Table<SiteRow>
        rowKey="stationId"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={pagination}
        scroll={{ x: scrollX }}
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}>
                <Text strong>Total</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} />
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
                      <Text strong>
                        {formatMoney(Math.round(planTotal.revenue * 100) / 100, currency)}
                      </Text>
                    </Table.Summary.Cell>
                  </React.Fragment>
                );
              })}
              <Table.Summary.Cell index={2 + plans.length * 2} align="right">
                <Text strong>{totals.tokensCount.toLocaleString()}</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3 + plans.length * 2} align="right">
                <Text strong>{formatMoney(totals.revenue, currency)}</Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
        onRow={(row) => ({
          onClick: onSelectSite ? () => onSelectSite(row.stationId) : undefined,
          style: {
            cursor: onSelectSite ? "pointer" : undefined,
            background:
              selectedStationId === row.stationId ? "rgba(22, 119, 255, 0.06)" : undefined,
          },
        })}
      />
    </Card>
  );
};

export default SitesTable;
