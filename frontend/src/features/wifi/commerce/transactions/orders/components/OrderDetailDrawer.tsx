"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Descriptions,
  Divider,
  Drawer,
  Spin,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { OrderDetail, OrderItem, OrderPayment, OrderRecord } from "../types";
import { formatWifiDateTime, maskVoucherToken } from "@/features/wifi/shared/format";
import { PAYMENT_METHOD_LABEL, STATUS_COLOR } from "../constant";
import { formatMoney, formatStatusLabel } from "../utils";

const { Text, Title, Paragraph } = Typography;

type Props = {
  open: boolean;
  orderId: string | null;
  fallback?: OrderRecord | null;
  onClose: () => void;
  loadOrder: (id: string) => Promise<OrderDetail>;
};

const OrderDetailDrawer: React.FC<Props> = ({
  open,
  orderId,
  fallback,
  onClose,
  loadOrder,
}) => {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !orderId) {
      setOrder(null);
      return;
    }

    if (fallback?.id === orderId) {
      setOrder(fallback as OrderDetail);
    }

    setLoading(true);
    void loadOrder(orderId)
      .then(setOrder)
      .catch(() => {
        if (fallback?.id === orderId) setOrder(fallback as OrderDetail);
      })
      .finally(() => setLoading(false));
  }, [open, orderId, fallback, loadOrder]);

  const row = order;

  const itemColumns: ColumnsType<OrderItem> = [
    {
      title: "Plan",
      key: "plan",
      render: (_, item) => (
        <div>
          <Tag style={{ fontFamily: "monospace", marginRight: 4 }}>{item.plan.code}</Tag>
          <Text style={{ fontSize: 12 }}>{item.plan.name}</Text>
        </div>
      ),
    },
    {
      title: "Token",
      key: "token",
      width: 160,
      ellipsis: true,
      render: (_, item) =>
        item.credential?.token ? (
          <Text
            code
            copyable={{
              text: item.credential.token,
              tooltips: ["Copy code", "Copied"],
            }}
            style={{ fontSize: 11 }}
          >
            {maskVoucherToken(item.credential.token)}
          </Text>
        ) : (
          "—"
        ),
    },
    {
      title: "Qty",
      dataIndex: "qty",
      width: 50,
      align: "center",
    },
    {
      title: "Line total",
      key: "lineTotal",
      width: 100,
      align: "right",
      render: (_, item) => formatMoney(item.lineTotal, row?.currency ?? "MMK"),
    },
  ];

  const paymentColumns: ColumnsType<OrderPayment> = [
    {
      title: "Method",
      dataIndex: "method",
      render: (method: OrderPayment["method"]) => PAYMENT_METHOD_LABEL[method] ?? method,
    },
    {
      title: "Amount",
      key: "amount",
      align: "right",
      render: (_, p) => formatMoney(p.amount, row?.currency ?? "MMK"),
    },
    {
      title: "Paid",
      dataIndex: "paidAt",
      width: 120,
      render: (value: string) => formatWifiDateTime(value),
    },
  ];

  return (
    <Drawer title="Order details" size={640} open={open} onClose={onClose} destroyOnClose>
      <Spin spinning={loading}>
        {row ? (
          <>
            <div className="mb-4">
              <Title level={5} style={{ margin: 0, fontFamily: "monospace" }}>
                {row.orderNo}
              </Title>
              <Paragraph type="secondary" style={{ marginTop: 4, marginBottom: 8 }}>
                {row.itemCount} item{row.itemCount === 1 ? "" : "s"} ·{" "}
                {formatMoney(row.total, row.currency)}
              </Paragraph>
              <Tag color={STATUS_COLOR[row.status]}>{formatStatusLabel(row.status)}</Tag>
            </div>

            <Descriptions column={1} size="small" bordered className="mb-4">
              <Descriptions.Item label="Partner">
                {row.reseller ? row.reseller.name : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Site">
                {row.station ? `${row.station.code} — ${row.station.name}` : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Subtotal">
                {formatMoney(row.subtotal, row.currency)}
              </Descriptions.Item>
              <Descriptions.Item label="Discount">
                {row.discount > 0 ? formatMoney(row.discount, row.currency) : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Total">
                <Text strong>{formatMoney(row.total, row.currency)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Sold at">
                {row.soldAt ? formatWifiDateTime(row.soldAt) : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Created">
                {formatWifiDateTime(row.createdAt)}
              </Descriptions.Item>
              {row.note ? (
                <Descriptions.Item label="Note">{row.note}</Descriptions.Item>
              ) : null}
            </Descriptions>

            <Title level={5}>Line items</Title>
            {row.items?.length ? (
              <Table<OrderItem>
                size="small"
                rowKey="id"
                pagination={false}
                columns={itemColumns}
                dataSource={row.items}
                className="mb-4"
              />
            ) : (
              <Paragraph type="secondary">No line items.</Paragraph>
            )}

            <Divider style={{ margin: "16px 0" }} />

            <Title level={5}>Payments</Title>
            {row.payments?.length ? (
              <Table<OrderPayment>
                size="small"
                rowKey="id"
                pagination={false}
                columns={paymentColumns}
                dataSource={row.payments}
                className="mb-4"
              />
            ) : (
              <Paragraph type="secondary">No payment records.</Paragraph>
            )}

            <Link href="/wifi/commerce/access-tokens">
              <Text type="secondary" style={{ fontSize: 12 }}>
                Issue more tokens → Access Tokens
              </Text>
            </Link>
          </>
        ) : null}
      </Spin>
    </Drawer>
  );
};

export default OrderDetailDrawer;
