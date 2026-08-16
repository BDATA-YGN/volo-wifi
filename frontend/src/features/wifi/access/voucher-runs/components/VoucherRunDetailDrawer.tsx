"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Col, Descriptions, Drawer, Row, Spin, Tag, Typography, theme } from "antd";
import { formatWifiDateTime } from "@/features/wifi/shared/format";
import { formatStatusLabel } from "@/features/wifi/commerce/access-tokens/utils";
import type { VoucherBatchDetail, VoucherBatchRecord } from "../types";
import {
  CREDENTIAL_STATUS_BAR,
  CREDENTIAL_STATUS_COLOR,
  CREDENTIAL_STATUS_ORDER,
} from "../constant";
import { canCancelVoucherRun, redemptionPercent } from "../utils";

const { Text, Title, Paragraph } = Typography;

type StatusBucket = {
  key: string;
  label: string;
  count: number;
  share: number;
  color: string;
  bar: string;
};

function buildStatusBuckets(
  quantity: number,
  remaining: number,
  stats: Record<string, number> | undefined
): StatusBucket[] {
  const issued = Math.max(quantity, 1);
  const buckets: StatusBucket[] = [];

  if (remaining > 0) {
    buckets.push({
      key: "AVAILABLE",
      label: "Available",
      count: remaining,
      share: Math.round((remaining / issued) * 1000) / 10,
      color: CREDENTIAL_STATUS_COLOR.AVAILABLE,
      bar: CREDENTIAL_STATUS_BAR.AVAILABLE,
    });
  }

  const entries = Object.entries(stats ?? {}).filter(([, count]) => count > 0);
  entries.sort((a, b) => {
    const ai = CREDENTIAL_STATUS_ORDER.indexOf(a[0] as (typeof CREDENTIAL_STATUS_ORDER)[number]);
    const bi = CREDENTIAL_STATUS_ORDER.indexOf(b[0] as (typeof CREDENTIAL_STATUS_ORDER)[number]);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || b[1] - a[1];
  });

  for (const [status, count] of entries) {
    buckets.push({
      key: status,
      label: formatStatusLabel(status),
      count,
      share: Math.round((count / issued) * 1000) / 10,
      color: CREDENTIAL_STATUS_COLOR[status] ?? "default",
      bar: CREDENTIAL_STATUS_BAR[status] ?? "#8c8c8c",
    });
  }

  return buckets;
}

type Props = {
  open: boolean;
  runId: string | null;
  fallback?: VoucherBatchRecord | null;
  onClose: () => void;
  onCancel: (record: VoucherBatchRecord) => void;
  loadRun: (id: string) => Promise<VoucherBatchDetail>;
};

const VoucherRunDetailDrawer: React.FC<Props> = ({
  open,
  runId,
  fallback,
  onClose,
  onCancel,
  loadRun,
}) => {
  const { token } = theme.useToken();
  const [run, setRun] = useState<VoucherBatchDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !runId) {
      setRun(null);
      return;
    }

    if (fallback?.id === runId) {
      setRun(fallback as VoucherBatchDetail);
    }

    setLoading(true);
    void loadRun(runId)
      .then(setRun)
      .catch(() => {
        if (fallback?.id === runId) setRun(fallback as VoucherBatchDetail);
      })
      .finally(() => setLoading(false));
  }, [open, runId, fallback, loadRun]);

  const row = run;
  const pct = row ? redemptionPercent(row.issued, row.remainingQuantity) : 0;
  const buckets = useMemo(
    () =>
      row
        ? buildStatusBuckets(row.quantity, row.remainingQuantity, row.credentialStats)
        : [],
    [row]
  );

  return (
    <Drawer
      title="Voucher run details"
      size={640}
      open={open}
      onClose={onClose}
      destroyOnClose
      extra={
        row && canCancelVoucherRun(row) ? (
          <Button danger size="small" onClick={() => onCancel(row)}>
            Cancel run
          </Button>
        ) : null
      }
    >
      <Spin spinning={loading}>
        {row ? (
          <>
            <div className="mb-4">
              <Title level={5} style={{ margin: 0, fontFamily: "monospace" }}>
                {row.batchNo}
              </Title>
              <Paragraph type="secondary" style={{ marginBottom: 8, marginTop: 4 }}>
                {row.plan.name} · {row.quantity} vouchers · {pct}% redeemed
              </Paragraph>
              <div className="flex flex-wrap gap-2">
                <Tag color="blue">{row.remainingQuantity} available</Tag>
                {row.station ? <Tag>{row.station.code}</Tag> : <Tag>Any site</Tag>}
              </div>
            </div>

            {row.note ? (
              <Alert type="info" showIcon className="mb-4" title={row.note} />
            ) : null}

            <Descriptions column={1} size="small" bordered className="mb-4">
              <Descriptions.Item label="Token key">
                <Text code>{row.tokenKey}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Plan">
                {row.plan.name} ({row.plan.code})
              </Descriptions.Item>
              <Descriptions.Item label="Site">
                {row.station ? `${row.station.name} (${row.station.code})` : "Any site"}
              </Descriptions.Item>
              <Descriptions.Item label="Created by">
                {row.createdByAdmin
                  ? `${row.createdByAdmin.fullName} (@${row.createdByAdmin.username})`
                  : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Issued">{row.quantity}</Descriptions.Item>
              <Descriptions.Item label="Remaining">{row.remainingQuantity}</Descriptions.Item>
              <Descriptions.Item label="Created">
                {formatWifiDateTime(row.createdAt)}
              </Descriptions.Item>
            </Descriptions>

            <div className="mb-1">
              <Text strong>Status breakdown</Text>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  How this run’s {row.quantity.toLocaleString()} vouchers are used
                </Text>
              </div>
            </div>

            {buckets.length > 0 ? (
              <>
                <div
                  className="mb-3 mt-2 flex overflow-hidden"
                  style={{ height: 12, borderRadius: token.borderRadiusSM, background: token.colorFillSecondary }}
                >
                  {buckets.map((bucket) => (
                    <div
                      key={bucket.key}
                      title={`${bucket.label}: ${bucket.count.toLocaleString()} (${bucket.share}%)`}
                      style={{
                        width: `${Math.max(bucket.share, bucket.count > 0 ? 1.5 : 0)}%`,
                        background: bucket.bar,
                      }}
                    />
                  ))}
                </div>

                <Row gutter={[8, 8]}>
                  {buckets.map((bucket) => (
                    <Col xs={12} sm={8} key={bucket.key}>
                      <Card size="small" styles={{ body: { padding: "10px 12px" } }}>
                        <div className="flex items-center justify-between gap-2">
                          <Tag color={bucket.color} style={{ marginInlineEnd: 0 }}>
                            {bucket.label}
                          </Tag>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {bucket.share}%
                          </Text>
                        </div>
                        <Title level={4} style={{ margin: "6px 0 0" }}>
                          {bucket.count.toLocaleString()}
                        </Title>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </>
            ) : (
              <Text type="secondary" style={{ fontSize: 12 }}>
                No tokens have been sold from this run yet.
              </Text>
            )}
          </>
        ) : (
          !loading && <Text type="secondary">Run not found.</Text>
        )}
      </Spin>
    </Drawer>
  );
};

export default VoucherRunDetailDrawer;
