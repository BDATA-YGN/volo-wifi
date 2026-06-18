"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Button,
  Descriptions,
  Divider,
  Drawer,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { formatWifiDate, formatWifiDateTime } from "@/features/wifi/shared/format";
import type { CommissionLine, PayoutDetail, PayoutRecord, PayoutStatus } from "../types";
import { NEXT_ACTIONS, STATUS_COLOR } from "../constant";
import { formatMoney, formatRuleValue, statusLabel } from "../utils";

const { Text, Title, Paragraph } = Typography;

type Props = {
  open: boolean;
  payoutId: string | null;
  currency: string;
  fallback?: PayoutRecord | null;
  onClose: () => void;
  onStatusChange: (id: string, status: PayoutStatus) => Promise<void>;
  loadPayout: (id: string) => Promise<PayoutDetail>;
};

const PayoutDetailDrawer: React.FC<Props> = ({
  open,
  payoutId,
  currency,
  fallback,
  onClose,
  onStatusChange,
  loadPayout,
}) => {
  const [payout, setPayout] = useState<PayoutDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!open || !payoutId) {
      setPayout(null);
      return;
    }

    if (fallback?.id === payoutId) {
      setPayout({ ...fallback, currency, breakdown: null });
    }

    setLoading(true);
    void loadPayout(payoutId)
      .then(setPayout)
      .catch(() => {
        if (fallback?.id === payoutId) {
          setPayout({ ...fallback, currency, breakdown: null });
        }
      })
      .finally(() => setLoading(false));
  }, [open, payoutId, fallback, loadPayout, currency]);

  const row = payout;
  const displayCurrency = row?.currency ?? currency;
  const actions = row ? NEXT_ACTIONS[row.status] ?? [] : [];

  const handleAction = async (status: PayoutStatus) => {
    if (!row) return;
    setActing(true);
    try {
      await onStatusChange(row.id, status);
      const refreshed = await loadPayout(row.id);
      setPayout(refreshed);
    } finally {
      setActing(false);
    }
  };

  const lineColumns: ColumnsType<CommissionLine> = [
    {
      title: "Order",
      key: "order",
      width: 100,
      render: (_, line) => (
        <Tag style={{ fontFamily: "monospace", margin: 0 }}>{line.orderNo}</Tag>
      ),
    },
    {
      title: "Plan",
      key: "plan",
      render: (_, line) => line.planCode,
    },
    {
      title: "Sales",
      key: "sales",
      align: "right",
      width: 90,
      render: (_, line) => formatMoney(line.lineTotal, displayCurrency),
    },
    {
      title: "Rule",
      key: "rule",
      width: 80,
      render: (_, line) => formatRuleValue(line.ruleType, line.ruleValue, displayCurrency),
    },
    {
      title: "Commission",
      key: "commission",
      align: "right",
      width: 100,
      render: (_, line) => (
        <Text strong>{formatMoney(line.commission, displayCurrency)}</Text>
      ),
    },
  ];

  return (
    <Drawer
      title="Commission payout"
      size={640}
      open={open}
      onClose={onClose}
      destroyOnClose
      extra={
        row && actions.length > 0 ? (
          <Space>
            {actions.map((action) => (
              <Button
                key={action.status}
                type={action.status === "PAID" || action.status === "APPROVED" ? "primary" : "default"}
                danger={action.status === "REJECTED"}
                size="small"
                loading={acting}
                onClick={() => void handleAction(action.status)}
              >
                {action.label}
              </Button>
            ))}
          </Space>
        ) : null
      }
    >
      <Spin spinning={loading}>
        {row ? (
          <>
            <div className="mb-4">
              <Title level={5} style={{ margin: 0 }}>
                {formatMoney(row.amount, displayCurrency)}
              </Title>
              <Paragraph type="secondary" style={{ marginTop: 4, marginBottom: 8 }}>
                {row.reseller ? `${row.reseller.code} — ${row.reseller.name}` : "—"} ·{" "}
                {row.periodLabel}
              </Paragraph>
              <Tag color={STATUS_COLOR[row.status]}>{statusLabel(row.status)}</Tag>
            </div>

            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Period">
                {formatWifiDate(row.periodFrom)} – {formatWifiDate(row.periodTo)}
              </Descriptions.Item>
              <Descriptions.Item label="Status">{statusLabel(row.status)}</Descriptions.Item>
              <Descriptions.Item label="Paid at">
                {row.paidAt ? formatWifiDateTime(row.paidAt) : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Note">{row.note || "—"}</Descriptions.Item>
              <Descriptions.Item label="Created">
                {formatWifiDateTime(row.createdAt)}
              </Descriptions.Item>
            </Descriptions>

            {row.breakdown && row.breakdown.lines.length > 0 ? (
              <>
                <Divider style={{ fontSize: 13 }}>
                  <span style={{ fontSize: 13 }}>Sales breakdown</span>
                </Divider>
                <Descriptions column={3} size="small" className="mb-3">
                  <Descriptions.Item label="Orders">{row.breakdown.orderCount}</Descriptions.Item>
                  <Descriptions.Item label="Gross sales">
                    {formatMoney(row.breakdown.grossSales, displayCurrency)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Calculated">
                    {formatMoney(row.breakdown.commissionAmount, displayCurrency)}
                  </Descriptions.Item>
                </Descriptions>
                <Table<CommissionLine>
                  rowKey={(r) => `${r.orderId}-${r.planId}`}
                  size="small"
                  pagination={false}
                  columns={lineColumns}
                  dataSource={row.breakdown.lines}
                  scroll={{ x: 480 }}
                />
              </>
            ) : null}

            <Paragraph type="secondary" style={{ marginTop: 16, fontSize: 12 }}>
              Commission rules are configured in{" "}
              <Link href="/wifi/commerce/commissions/rules">Commission Rules</Link>. Source orders
              appear in <Link href="/wifi/commerce/transactions/orders">Orders</Link>.
            </Paragraph>
          </>
        ) : null}
      </Spin>
    </Drawer>
  );
};

export default PayoutDetailDrawer;
