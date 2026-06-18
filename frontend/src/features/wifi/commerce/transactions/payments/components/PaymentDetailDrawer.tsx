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
import type { PaymentDetail, PaymentOrderItem, PaymentRecord } from "../types";
import { formatWifiDateTime, maskVoucherToken } from "@/features/wifi/shared/format";
import { METHOD_COLOR, STATUS_COLOR } from "../constant";
import type { SaleStatus } from "../types";
import { formatMethodLabel, formatMoney, formatStatusLabel } from "../utils";

const { Text, Title, Paragraph } = Typography;

type Props = {
  open: boolean;
  paymentId: string | null;
  currency: string;
  fallback?: PaymentRecord | null;
  onClose: () => void;
  loadPayment: (id: string) => Promise<PaymentDetail>;
};

const PaymentDetailDrawer: React.FC<Props> = ({
  open,
  paymentId,
  currency,
  fallback,
  onClose,
  loadPayment,
}) => {
  const [payment, setPayment] = useState<PaymentDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !paymentId) {
      setPayment(null);
      return;
    }

    if (fallback?.id === paymentId) {
      setPayment(fallback as PaymentDetail);
    }

    setLoading(true);
    void loadPayment(paymentId)
      .then(setPayment)
      .catch(() => {
        if (fallback?.id === paymentId) setPayment(fallback as PaymentDetail);
      })
      .finally(() => setLoading(false));
  }, [open, paymentId, fallback, loadPayment]);

  const row = payment;
  const orderCurrency = row?.order?.currency ?? currency;

  const itemColumns: ColumnsType<PaymentOrderItem> = [
    {
      title: "Plan",
      key: "plan",
      render: (_, item) => (
        <Tag style={{ fontFamily: "monospace" }}>{item.plan.code}</Tag>
      ),
    },
    {
      title: "Token",
      key: "token",
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
      title: "Line total",
      key: "lineTotal",
      width: 100,
      align: "right",
      render: (_, item) => formatMoney(item.lineTotal, orderCurrency),
    },
  ];

  return (
    <Drawer title="Payment details" size={560} open={open} onClose={onClose} destroyOnClose>
      <Spin spinning={loading}>
        {row ? (
          <>
            <div className="mb-4">
              <Title level={5} style={{ margin: 0 }}>
                {formatMoney(row.amount, orderCurrency)}
              </Title>
              <Paragraph type="secondary" style={{ marginTop: 4, marginBottom: 8 }}>
                {formatMethodLabel(row.method)} · {formatWifiDateTime(row.paidAt)}
              </Paragraph>
              <Tag color={METHOD_COLOR[row.method]}>{formatMethodLabel(row.method)}</Tag>
            </div>

            <Descriptions column={1} size="small" bordered className="mb-4">
              <Descriptions.Item label="Amount">
                <Text strong>{formatMoney(row.amount, orderCurrency)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Method">
                {formatMethodLabel(row.method)}
              </Descriptions.Item>
              <Descriptions.Item label="Reference">{row.refNo ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Paid at">
                {formatWifiDateTime(row.paidAt)}
              </Descriptions.Item>
              <Descriptions.Item label="Recorded">
                {formatWifiDateTime(row.createdAt)}
              </Descriptions.Item>
              {row.note ? <Descriptions.Item label="Note">{row.note}</Descriptions.Item> : null}
            </Descriptions>

            {row.order ? (
              <>
                <Title level={5}>Linked order</Title>
                <Descriptions column={1} size="small" bordered className="mb-4">
                  <Descriptions.Item label="Order no">
                    <Link href="/wifi/commerce/transactions/orders">
                      <Text code>{row.order.orderNo}</Text>
                    </Link>
                  </Descriptions.Item>
                  <Descriptions.Item label="Partner">
                    {row.order.reseller
                      ? row.order.reseller.name
                      : "—"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Site">
                    {row.order.station
                      ? `${row.order.station.code} — ${row.order.station.name}`
                      : "—"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Order total">
                    {formatMoney(row.order.total, orderCurrency)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Status">
                    <Tag color={STATUS_COLOR[row.order.status as SaleStatus] ?? "default"}>
                      {formatStatusLabel(row.order.status)}
                    </Tag>
                  </Descriptions.Item>
                </Descriptions>

                {row.order.items?.length ? (
                  <>
                    <Divider style={{ margin: "12px 0" }} />
                    <Title level={5}>Order line items</Title>
                    <Table<PaymentOrderItem>
                      size="small"
                      rowKey="id"
                      pagination={false}
                      columns={itemColumns}
                      dataSource={row.order.items}
                    />
                  </>
                ) : null}
              </>
            ) : (
              <Paragraph type="secondary">No linked sales order.</Paragraph>
            )}
          </>
        ) : null}
      </Spin>
    </Drawer>
  );
};

export default PaymentDetailDrawer;
