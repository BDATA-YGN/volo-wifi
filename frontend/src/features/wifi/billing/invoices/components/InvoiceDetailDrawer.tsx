"use client";

import React from "react";
import {
  Button,
  Descriptions,
  Divider,
  Drawer,
  Space,
  Tag,
  Typography,
} from "antd";
import { DollarOutlined } from "@ant-design/icons";
import type { InvoiceDetail } from "../types";
import { INVOICE_STATUS_COLOR } from "../constant";
import { formatDate, formatDateTime, formatMoney } from "../../tier-rates/platform/utils";
import InvoiceItemsTable from "./InvoiceItemsTable";
import InvoicePaymentsPanel from "./InvoicePaymentsPanel";

const { Text, Title } = Typography;

type Props = {
  open: boolean;
  invoice: InvoiceDetail | null;
  loading?: boolean;
  onClose: () => void;
  onRecordPayment: () => void;
};

const InvoiceDetailDrawer: React.FC<Props> = ({
  open,
  invoice,
  loading,
  onClose,
  onRecordPayment,
}) => {
  const canPay =
    invoice &&
    Number(invoice.balanceDue) > 0 &&
    invoice.status !== "CANCELLED" &&
    invoice.status !== "PAID";

  return (
    <Drawer
      title={invoice ? `Invoice ${invoice.invoiceNo}` : "Invoice"}
      size={720}
      open={open}
      onClose={onClose}
      destroyOnHidden
      extra={
        canPay ? (
          <Button type="primary" icon={<DollarOutlined />} onClick={onRecordPayment}>
            Record payment
          </Button>
        ) : null
      }
    >
      {invoice ? (
        <div className="flex flex-col gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Title level={5} style={{ margin: 0 }}>
                {invoice.org.name}
              </Title>
              <Text type="secondary" code>
                {invoice.org.code}
              </Text>
              <Tag color={invoice.isOverdue ? "error" : INVOICE_STATUS_COLOR[invoice.status]}>
                {invoice.isOverdue && invoice.status !== "OVERDUE"
                  ? "OVERDUE"
                  : invoice.status.replace(/_/g, " ")}
              </Tag>
            </div>
            <Text type="secondary">
              {formatDate(invoice.billingPeriodFrom)} – {formatDate(invoice.billingPeriodTo)} ·{" "}
              {invoice.billingCycle}
            </Text>
          </div>

          <Descriptions
            column={{ xs: 1, sm: 2 }}
            size="small"
            items={[
              {
                key: "issued",
                label: "Issued",
                children: invoice.issuedAt ? formatDateTime(invoice.issuedAt) : "—",
              },
              {
                key: "due",
                label: "Due date",
                children: formatDate(invoice.dueDate),
              },
              {
                key: "paid",
                label: "Paid at",
                children: invoice.paidAt ? formatDateTime(invoice.paidAt) : "—",
              },
              {
                key: "pricing",
                label: "Pricing",
                children: invoice.pricingSource.replace(/_/g, " "),
              },
            ]}
          />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Subtotal", value: invoice.subtotalAmount },
              { label: "Tax", value: invoice.taxAmount },
              { label: "Total", value: invoice.totalAmount, strong: true },
              { label: "Balance due", value: invoice.balanceDue, danger: Number(invoice.balanceDue) > 0 },
            ].map((row) => (
              <div key={row.label}>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {row.label}
                </Text>
                <div>
                  <Text strong={row.strong} type={row.danger ? "danger" : undefined}>
                    {formatMoney(row.value, invoice.currency)}
                  </Text>
                </div>
              </div>
            ))}
          </div>

          {invoice.notes ? (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {invoice.notes}
              </Text>
            </div>
          ) : null}

          <Divider titlePlacement="left" style={{ margin: "8px 0" }}>
            Line items by site tier
          </Divider>
          <InvoiceItemsTable items={invoice.items} currency={invoice.currency} loading={loading} />

          <Divider titlePlacement="left" style={{ margin: "8px 0" }}>
            Payments
          </Divider>
          <InvoicePaymentsPanel
            payments={invoice.payments}
            currency={invoice.currency}
            loading={loading}
          />

          <Space>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Paid: {formatMoney(invoice.paidAmount, invoice.currency)}
            </Text>
          </Space>
        </div>
      ) : null}
    </Drawer>
  );
};

export default InvoiceDetailDrawer;
