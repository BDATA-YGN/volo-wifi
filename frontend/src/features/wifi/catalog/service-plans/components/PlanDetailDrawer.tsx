"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Alert, Button, Descriptions, Drawer, Spin, Tag, Typography } from "antd";
import dayjs from "dayjs";
import type { ServicePlanRecord } from "../types";
import { QUOTA_TYPE_COLOR, TIME_USAGE_MODE_OPTIONS } from "../constant";
import {
  formatQuotaLabel,
  formatQuotaTypeLabel,
  formatValidity,
  planHasTimeLimit,
} from "../utils";

const { Text, Title, Paragraph } = Typography;

type Props = {
  open: boolean;
  planId: string | null;
  fallback?: ServicePlanRecord | null;
  onClose: () => void;
  onEdit: (record: ServicePlanRecord) => void;
  loadPlan: (id: string) => Promise<ServicePlanRecord>;
};

const PlanDetailDrawer: React.FC<Props> = ({
  open,
  planId,
  fallback,
  onClose,
  onEdit,
  loadPlan,
}) => {
  const [plan, setPlan] = useState<ServicePlanRecord | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !planId) {
      setPlan(null);
      return;
    }

    if (fallback?.id === planId) {
      setPlan(fallback);
    }

    setLoading(true);
    void loadPlan(planId)
      .then(setPlan)
      .catch(() => {
        if (fallback?.id === planId) setPlan(fallback);
      })
      .finally(() => setLoading(false));
  }, [open, planId, fallback, loadPlan]);

  const row = plan;
  const timeModeLabel =
    TIME_USAGE_MODE_OPTIONS.find((o) => o.value === row?.timeUsageMode)?.label ??
    row?.timeUsageMode;

  return (
    <Drawer
      title="Plan details"
      size={520}
      open={open}
      onClose={onClose}
      destroyOnClose
      extra={
        row ? (
          <Button type="primary" size="small" onClick={() => onEdit(row)}>
            Edit
          </Button>
        ) : null
      }
    >
      <Spin spinning={loading}>
        {row ? (
          <>
            <div className="mb-4">
              <Title level={5} style={{ margin: 0 }}>
                {row.name}
              </Title>
              <div className="mt-2 flex flex-wrap gap-2">
                <Tag style={{ fontFamily: "monospace" }}>{row.code}</Tag>
                <Tag color={QUOTA_TYPE_COLOR[row.quotaType]}>
                  {formatQuotaTypeLabel(row.quotaType)}
                </Tag>
                {row.isActive ? (
                  <Tag color="success">Active</Tag>
                ) : (
                  <Tag color="default">Inactive</Tag>
                )}
              </div>
            </div>

            {row.description ? (
              <Paragraph type="secondary" style={{ marginBottom: 16 }}>
                {row.description}
              </Paragraph>
            ) : null}

            {(row._count?.prices ?? 0) === 0 ? (
              <Alert
                type="info"
                showIcon
                className="mb-4"
                title="No retail price configured"
                description={
                  <span>
                    Add this plan to a price book on{" "}
                    <Link href="/wifi/catalog/retail-pricing">Retail Pricing</Link> before selling.
                  </span>
                }
              />
            ) : null}

            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Allowances">{formatQuotaLabel(row)}</Descriptions.Item>
              <Descriptions.Item label="Validity">{formatValidity(row.validityDays)}</Descriptions.Item>
              <Descriptions.Item label="Max devices">{row.maxDevices ?? "—"}</Descriptions.Item>
              {planHasTimeLimit(row) && (
                <Descriptions.Item label="Time usage">{timeModeLabel}</Descriptions.Item>
              )}
              <Descriptions.Item label="Retail prices">{row._count?.prices ?? 0}</Descriptions.Item>
              <Descriptions.Item label="Credentials">{row._count?.credentials ?? 0}</Descriptions.Item>
              <Descriptions.Item label="Voucher batches">
                {row._count?.voucherBatches ?? 0}
              </Descriptions.Item>
              <Descriptions.Item label="RADIUS attributes">
                {row._count?.planAttributes ?? 0}
              </Descriptions.Item>
              <Descriptions.Item label="Plan ID">
                <Text code copyable>
                  {row.id}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Created">
                {dayjs(row.createdAt).format("YYYY-MM-DD HH:mm")}
              </Descriptions.Item>
              <Descriptions.Item label="Updated">
                {dayjs(row.updatedAt).format("YYYY-MM-DD HH:mm")}
              </Descriptions.Item>
            </Descriptions>
          </>
        ) : (
          !loading && <Text type="secondary">Plan not found.</Text>
        )}
      </Spin>
    </Drawer>
  );
};

export default PlanDetailDrawer;
