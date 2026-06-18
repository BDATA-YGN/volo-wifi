"use client";

import React from "react";
import { Descriptions, Drawer, Spin, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import type { SettlementDetail, SettlementLineRow } from "../types";
import { STATUS_COLOR } from "../constant";
import {
  formatMoney,
  formatPaymentMethod,
  formatStatusLabel,
  formatVariance,
} from "../utils";
import type { SettlementStatus } from "../types";

const { Text, Paragraph } = Typography;

type Props = {
  open: boolean;
  loading?: boolean;
  detail: SettlementDetail | null;
  currency: string;
  onClose: () => void;
};

const SettlementDetailDrawer: React.FC<Props> = ({
  open,
  loading,
  detail,
  currency,
  onClose,
}) => {
  const lineColumns: ColumnsType<SettlementLineRow> = [
    {
      title: "Tender",
      dataIndex: "paymentMethod",
      key: "paymentMethod",
      render: (method: string) => (
        <Text strong={method === "CASH"}>{formatPaymentMethod(method)}</Text>
      ),
    },
    {
      title: "System",
      key: "systemAmount",
      align: "right",
      render: (_, row) => formatMoney(row.systemAmount, currency),
    },
    {
      title: "Declared",
      key: "declaredAmount",
      align: "right",
      render: (_, row) =>
        row.declaredAmount != null ? formatMoney(row.declaredAmount, currency) : "—",
    },
    {
      title: "Variance",
      key: "varianceAmount",
      align: "right",
      render: (_, row) => (
        <Text
          type={
            row.varianceAmount != null && Math.abs(row.varianceAmount) > 0.009
              ? "warning"
              : "secondary"
          }
        >
          {formatVariance(row.varianceAmount, currency)}
        </Text>
      ),
    },
    {
      title: "Payments",
      dataIndex: "systemPaymentsCount",
      key: "systemPaymentsCount",
      width: 80,
      align: "right",
    },
  ];

  return (
    <Drawer
      title="Settlement detail"
      open={open}
      onClose={onClose}
      size="large"
      destroyOnClose
    >
      {loading && !detail ? (
        <div className="flex justify-center py-12">
          <Spin />
        </div>
      ) : detail ? (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-2">
            <Tag color={STATUS_COLOR[detail.status as SettlementStatus]}>
              {formatStatusLabel(detail.status)}
            </Tag>
            {detail.hasPosting ? <Tag color="purple">Posted</Tag> : null}
            <Text type="secondary" style={{ fontSize: 12 }}>
              {detail.attestationCount} attestation(s)
            </Text>
          </div>

          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Period">
              {dayjs(detail.periodStart).format("D MMM YYYY HH:mm")} –{" "}
              {dayjs(detail.periodEnd).format("D MMM YYYY HH:mm")}
            </Descriptions.Item>
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
            <Descriptions.Item label="System total">
              {formatMoney(detail.systemTotal, detail.systemCurrency || currency)}
              <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                {detail.systemPaymentsCount} payments · {detail.systemOrdersCount} orders
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Declared total">
              {detail.declaredTotal != null
                ? formatMoney(detail.declaredTotal, detail.declaredCurrency || currency)
                : "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Variance">
              {formatVariance(detail.variance, detail.systemCurrency || currency)}
            </Descriptions.Item>
            <Descriptions.Item label="Updated">
              {dayjs(detail.updatedAt).format("D MMM YYYY, HH:mm")}
            </Descriptions.Item>
          </Descriptions>

          {detail.declaredNote ? (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Partner note
              </Text>
              <Paragraph style={{ marginTop: 4, marginBottom: 0 }}>{detail.declaredNote}</Paragraph>
            </div>
          ) : null}

          <div>
            <Text strong style={{ display: "block", marginBottom: 8 }}>
              Tender breakdown
            </Text>
            <Table<SettlementLineRow>
              size="small"
              rowKey="paymentMethod"
              dataSource={detail.lines}
              columns={lineColumns}
              pagination={false}
            />
          </div>
        </div>
      ) : null}
    </Drawer>
  );
};

export default SettlementDetailDrawer;
