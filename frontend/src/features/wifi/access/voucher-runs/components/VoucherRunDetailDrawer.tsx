"use client";

import React, { useEffect, useState } from "react";
import { Alert, Button, Descriptions, Drawer, Spin, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { formatWifiDateTime, maskVoucherToken } from "@/features/wifi/shared/format";
import type { VoucherBatchDetail, VoucherBatchRecord, VoucherCredentialPreview } from "../types";
import { CREDENTIAL_STATUS_COLOR } from "../constant";
import { canCancelVoucherRun, redemptionPercent } from "../utils";

const { Text, Title, Paragraph } = Typography;

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

  const credentialColumns: ColumnsType<VoucherCredentialPreview> = [
    {
      title: "Token",
      dataIndex: "token",
      render: (token: string) => (
        <Text copyable={token ? { text: token, tooltips: ["Copy code", "Copied"] } : false} code>
          {maskVoucherToken(token)}
        </Text>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 100,
      render: (status: string) => (
        <Tag color={CREDENTIAL_STATUS_COLOR[status] ?? "default"}>{status}</Tag>
      ),
    },
  ];

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

            {row.credentialStats ? (
              <div className="mb-3 flex flex-wrap gap-2">
                {Object.entries(row.credentialStats).map(([status, count]) => (
                  <Tag key={status} color={CREDENTIAL_STATUS_COLOR[status] ?? "default"}>
                    {status}: {count}
                  </Tag>
                ))}
              </div>
            ) : null}

            <Paragraph strong style={{ fontSize: 13 }}>
              Issued voucher codes
              {row.credentialsTruncated ? (
                <Text type="secondary">
                  {" "}
                  (showing first {row.credentials.length} of {row.credentialsTotal})
                </Text>
              ) : null}
            </Paragraph>

            {(row.credentials ?? []).length === 0 ? (
              <Text type="secondary" style={{ fontSize: 12 }}>
                No codes sold yet — partners issue 6-character codes from Access Tokens when this
                run has available capacity.
              </Text>
            ) : (
              <Table<VoucherCredentialPreview>
                rowKey="id"
                size="small"
                pagination={false}
                columns={credentialColumns}
                dataSource={row.credentials ?? []}
                scroll={{ y: 280 }}
              />
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
