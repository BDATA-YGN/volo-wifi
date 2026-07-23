"use client";

import React from "react";
import { Descriptions, Drawer, Spin, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import Link from "next/link";
import type { CoverageDetail, UncoveredPaymentRow } from "../types";
import { ELIGIBILITY_COLOR } from "../constant";
import {
  formatEligibility,
  formatGapDays,
  formatMoney,
  formatPaymentMethod,
  truncateHash,
} from "../utils";

const { Text } = Typography;

type Props = {
  open: boolean;
  loading?: boolean;
  detail: CoverageDetail | null;
  currency: string;
  onClose: () => void;
};

const CoverageDetailDrawer: React.FC<Props> = ({
  open,
  loading,
  detail,
  currency,
  onClose,
}) => {
  const paymentColumns: ColumnsType<UncoveredPaymentRow> = [
    {
      title: "Paid at",
      dataIndex: "paidAt",
      key: "paidAt",
      width: 150,
      render: (paidAt: string) => dayjs(paidAt).format("D MMM YYYY, HH:mm"),
    },
    {
      title: "Order",
      dataIndex: "orderNo",
      key: "orderNo",
      render: (orderNo: string | null) => orderNo ?? "—",
    },
    {
      title: "Method",
      dataIndex: "method",
      key: "method",
      render: (method: string) => formatPaymentMethod(method),
    },
    {
      title: "Amount",
      key: "amount",
      align: "right",
      render: (_, row) => formatMoney(row.amount, currency),
    },
  ];

  return (
    <Drawer
      title="Coverage scope detail"
      open={open}
      onClose={onClose}
      size="large"
      destroyOnClose
      extra={
        detail ? (
          <Link href="/wifi/analytics/reconciliation/approvals">
            <Text type="secondary" style={{ fontSize: 12 }}>
              Reconciliation approvals
            </Text>
          </Link>
        ) : null
      }
    >
      {loading && !detail ? (
        <div className="flex justify-center py-12">
          <Spin />
        </div>
      ) : detail ? (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-2">
            <Tag color={ELIGIBILITY_COLOR[detail.eligibility]}>
              {formatEligibility(detail.eligibility)}
            </Tag>
            {detail.postingSealed ? <Tag color="purple">Sealed posting</Tag> : null}
            {detail.gapDays > 0 ? (
              <Tag color="warning">{formatGapDays(detail.gapDays)} gap</Tag>
            ) : null}
          </div>

          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Partner">
              {detail.resellerName}{" "}
              <Text code style={{ fontSize: 11 }}>
                {detail.resellerCode}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Site">
              {detail.stationName}{" "}
              <Text code style={{ fontSize: 11 }}>
                {detail.stationCode}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Max covered paid at">
              {detail.maxCoveredPaidAt
                ? dayjs(detail.maxCoveredPaidAt).format("D MMM YYYY, HH:mm")
                : "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Latest payment">
              {detail.latestPaymentAt
                ? dayjs(detail.latestPaymentAt).format("D MMM YYYY, HH:mm")
                : "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Payments in scope">
              {detail.paymentCount} total · {detail.uncoveredPaymentCount} uncovered
            </Descriptions.Item>
            <Descriptions.Item label="Last posting">
              {detail.lastPostedAt
                ? dayjs(detail.lastPostedAt).format("D MMM YYYY, HH:mm")
                : "—"}
              {detail.postedBy ? ` · ${detail.postedBy}` : ""}
            </Descriptions.Item>
            {detail.payloadHash ? (
              <Descriptions.Item label="Payload hash">
                <Text code style={{ fontSize: 11 }}>
                  {truncateHash(detail.payloadHash, 24)}
                </Text>
              </Descriptions.Item>
            ) : null}
            <Descriptions.Item label="Updated">
              {detail.updatedAt ? dayjs(detail.updatedAt).format("D MMM YYYY, HH:mm") : "—"}
            </Descriptions.Item>
          </Descriptions>

          {detail.uncoveredPayments.length > 0 ? (
            <div>
              <Text strong style={{ display: "block", marginBottom: 8 }}>
                Uncovered payments (after sealed horizon)
              </Text>
              <Table<UncoveredPaymentRow>
                size="small"
                rowKey="paymentId"
                dataSource={detail.uncoveredPayments}
                columns={paymentColumns}
                pagination={false}
              />
            </div>
          ) : null}

          <div className="rounded-lg border border-dashed p-4" style={{ opacity: 0.85 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Purge eligibility requires a sealed posting and no payments newer than the covered
              horizon. This view is read-only analytics.
            </Text>
          </div>
        </div>
      ) : null}
    </Drawer>
  );
};

export default CoverageDetailDrawer;
