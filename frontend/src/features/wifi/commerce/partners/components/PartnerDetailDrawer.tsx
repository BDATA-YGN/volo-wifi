"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Button,
  Descriptions,
  Drawer,
  Spin,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { formatWifiDateTime } from "@/features/wifi/shared/format";
import type { PartnerDetail, PartnerPlanEntitlement, PartnerRecord, PartnerStation } from "../types";
import { STATUS_COLOR } from "../constant";
import { formatStatusLabel } from "../utils";

const { Text, Title, Paragraph } = Typography;

type Props = {
  open: boolean;
  partnerId: string | null;
  fallback?: PartnerRecord | null;
  onClose: () => void;
  onEdit: (record: PartnerDetail) => void;
  loadPartner: (id: string) => Promise<PartnerDetail>;
};

const PartnerDetailDrawer: React.FC<Props> = ({
  open,
  partnerId,
  fallback,
  onClose,
  onEdit,
  loadPartner,
}) => {
  const [partner, setPartner] = useState<PartnerDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !partnerId) {
      setPartner(null);
      return;
    }

    if (fallback?.id === partnerId) {
      setPartner(fallback as PartnerDetail);
    }

    setLoading(true);
    void loadPartner(partnerId)
      .then(setPartner)
      .catch(() => {
        if (fallback?.id === partnerId) setPartner(fallback as PartnerDetail);
      })
      .finally(() => setLoading(false));
  }, [open, partnerId, fallback, loadPartner]);

  const row = partner;

  const stationColumns: ColumnsType<PartnerStation> = [
    {
      title: "Site",
      key: "site",
      render: (_, s) => (
        <div>
          <Tag style={{ fontFamily: "monospace", marginRight: 4 }}>{s.code}</Tag>
          <Text>{s.name}</Text>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 100,
      render: (status: string) => <Tag>{status}</Tag>,
    },
  ];

  const planColumns: ColumnsType<PartnerPlanEntitlement> = [
    {
      title: "Plan",
      key: "plan",
      render: (_, pe) => (
        <div>
          <Tag style={{ fontFamily: "monospace", marginRight: 4 }}>{pe.plan.code}</Tag>
          <Text>{pe.plan.name}</Text>
        </div>
      ),
    },
    {
      title: "Sellable",
      dataIndex: "isEnabled",
      width: 90,
      align: "center",
      render: (enabled: boolean) =>
        enabled ? <Tag color="success">Yes</Tag> : <Tag color="default">No</Tag>,
    },
  ];

  const planEntitlements = row?.planEntitlements ?? [];
  const stations = row?.stations ?? [];
  const enabledPlans = planEntitlements.filter((p) => p.isEnabled);

  return (
    <Drawer
      title="Partner details"
      size={600}
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
              <Paragraph type="secondary" style={{ marginBottom: 8, marginTop: 4 }}>
                {row.stationCount} site{row.stationCount === 1 ? "" : "s"} ·{" "}
                {enabledPlans.length} sellable plan{enabledPlans.length === 1 ? "" : "s"}
              </Paragraph>
              <div className="flex flex-wrap gap-2">
                <Tag style={{ fontFamily: "monospace" }}>{row.code}</Tag>
                <Tag color={STATUS_COLOR[row.status]}>{formatStatusLabel(row.status)}</Tag>
              </div>
            </div>

            <Descriptions column={1} size="small" bordered className="mb-4">
              <Descriptions.Item label="Login username">
                {row.portalAccount?.username ?? "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Last login">
                {row.portalAccount?.lastLogin
                  ? formatWifiDateTime(row.portalAccount.lastLogin)
                  : "Never"}
              </Descriptions.Item>
              <Descriptions.Item label="Phone">{row.phone ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Email">{row.email ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Address">{row.address ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Credentials issued">
                {row.credentialCount > 0 ? row.credentialCount : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Sales orders">
                {row.salesCount > 0 ? row.salesCount : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Created">
                {formatWifiDateTime(row.createdAt)}
              </Descriptions.Item>
            </Descriptions>

            {row.stationCount === 0 || enabledPlans.length === 0 ? (
              <Alert
                type="info"
                showIcon
                className="mb-4"
                title="Setup incomplete"
                description={
                  <span>
                    Partners need at least one mapped site and one sellable plan before they can
                    issue tokens.{" "}
                    <Link href="/wifi/catalog/retail-pricing">Configure reseller pricing</Link>
                  </span>
                }
              />
            ) : null}

            <Title level={5} style={{ marginTop: 16 }}>
              Mapped sites
            </Title>
            {stations.length > 0 ? (
              <Table<PartnerStation>
                size="small"
                rowKey="mappingId"
                pagination={false}
                columns={stationColumns}
                dataSource={stations}
                className="mb-4"
              />
            ) : (
              <Paragraph type="secondary">No sites mapped yet.</Paragraph>
            )}

            <Title level={5}>Plan entitlements</Title>
            {planEntitlements.length > 0 ? (
              <Table<PartnerPlanEntitlement>
                size="small"
                rowKey="id"
                pagination={false}
                columns={planColumns}
                dataSource={planEntitlements}
              />
            ) : (
              <Paragraph type="secondary">No plans assigned.</Paragraph>
            )}
          </>
        ) : null}
      </Spin>
    </Drawer>
  );
};

export default PartnerDetailDrawer;
