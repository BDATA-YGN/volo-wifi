"use client";

import React from "react";
import { Descriptions, Drawer, Spin, Tag, Timeline, Typography } from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileProtectOutlined,
  LockOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import Link from "next/link";
import type { ApprovalDetail } from "../types";
import { NEXT_ACTION_COLOR, STATUS_COLOR } from "../constant";
import {
  formatAttestationKind,
  formatMoney,
  formatStatusLabel,
  formatVariance,
} from "../utils";
import type { WorkflowStatus } from "../types";

const { Text, Paragraph } = Typography;

type Props = {
  open: boolean;
  loading?: boolean;
  detail: ApprovalDetail | null;
  currency: string;
  onClose: () => void;
};

const ApprovalDetailDrawer: React.FC<Props> = ({
  open,
  loading,
  detail,
  currency,
  onClose,
}) => (
  <Drawer
    title="Approval workflow"
    open={open}
    onClose={onClose}
    size="large"
    destroyOnClose
    extra={
      detail ? (
        <Link href={`/wifi/analytics/reconciliation/settlements`}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Open settlements
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
          <Tag color={STATUS_COLOR[detail.status as WorkflowStatus]}>
            {formatStatusLabel(detail.status)}
          </Tag>
          <Tag color={NEXT_ACTION_COLOR[detail.nextAction] ?? "default"}>{detail.nextAction}</Tag>
          <Tag color={detail.stationAttested ? "success" : "default"}>
            Station {detail.stationAttested ? "signed" : "pending"}
          </Tag>
          <Tag color={detail.orgAttested ? "success" : "default"}>
            Org {detail.orgAttested ? "signed" : "pending"}
          </Tag>
          {detail.hasPosting ? <Tag color="purple">Posted</Tag> : null}
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
          </Descriptions.Item>
          <Descriptions.Item label="Declared total">
            {detail.declaredTotal != null
              ? formatMoney(detail.declaredTotal, detail.systemCurrency || currency)
              : "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Variance">
            {formatVariance(detail.variance, detail.systemCurrency || currency)}
          </Descriptions.Item>
        </Descriptions>

        <div>
          <Text strong style={{ display: "block", marginBottom: 12 }}>
            Attestation timeline
          </Text>
          {detail.timeline.length === 0 ? (
            <Text type="secondary">No attestation or posting events yet.</Text>
          ) : (
            <Timeline
              items={detail.timeline.map((item) => ({
                color:
                  item.type === "posting"
                    ? "purple"
                    : item.kind === "ORGANIZATION"
                      ? "green"
                      : "blue",
                dot:
                  item.type === "posting" ? (
                    <LockOutlined />
                  ) : item.actorId ? (
                    <CheckCircleOutlined />
                  ) : (
                    <ClockCircleOutlined />
                  ),
                children: (
                  <div>
                    <Text strong style={{ fontSize: 13 }}>
                      {item.type === "posting" ? item.label : formatAttestationKind(item.kind)}
                    </Text>
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {dayjs(item.at).format("D MMM YYYY, HH:mm")}
                        {item.actorId ? ` · ${item.actorId}` : ""}
                        {item.sealed != null ? (item.sealed ? " · Sealed" : " · Unsealed") : ""}
                      </Text>
                    </div>
                    {item.note ? (
                      <Paragraph
                        type="secondary"
                        style={{ fontSize: 12, marginTop: 4, marginBottom: 0 }}
                      >
                        {item.note}
                      </Paragraph>
                    ) : null}
                  </div>
                ),
              }))}
            />
          )}
        </div>

        <div className="rounded-lg border border-dashed p-4" style={{ opacity: 0.85 }}>
          <FileProtectOutlined style={{ marginRight: 8, color: "#1677ff" }} />
          <Text type="secondary" style={{ fontSize: 12 }}>
            This view is read-only analytics. Perform attestations and postings from the
            reconciliation operations console when available.
          </Text>
        </div>
      </div>
    ) : null}
  </Drawer>
);

export default ApprovalDetailDrawer;
