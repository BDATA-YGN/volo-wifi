"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Alert, Button, Descriptions, Drawer, Spin, Tag, Typography } from "antd";
import dayjs from "dayjs";
import type { SiteRecord } from "../types";
import { STATUS_COLOR, TIER_CODE_COLORS } from "../constant";
import { formatStatusLabel } from "../utils";

const { Text, Title } = Typography;

type Props = {
  open: boolean;
  siteId: string | null;
  fallback?: SiteRecord | null;
  onClose: () => void;
  onEdit: (record: SiteRecord) => void;
  loadSite: (id: string) => Promise<SiteRecord>;
};

const SiteDetailDrawer: React.FC<Props> = ({
  open,
  siteId,
  fallback,
  onClose,
  onEdit,
  loadSite,
}) => {
  const [site, setSite] = useState<SiteRecord | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !siteId) {
      setSite(null);
      return;
    }

    if (fallback?.id === siteId) {
      setSite(fallback);
    }

    setLoading(true);
    void loadSite(siteId)
      .then(setSite)
      .catch(() => {
        if (fallback?.id === siteId) setSite(fallback);
      })
      .finally(() => setLoading(false));
  }, [open, siteId, fallback, loadSite]);

  const row = site;

  return (
    <Drawer
      title="Site details"
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
                <Tag color={STATUS_COLOR[row.status]}>{formatStatusLabel(row.status)}</Tag>
                <Tag color={TIER_CODE_COLORS[row.stationSize.code] ?? "default"}>
                  {row.stationSize.name} ({row.stationSize.code})
                </Tag>
                {row.isBillable ? <Tag color="success">Billable</Tag> : null}
              </div>
            </div>

            {row.status === "ACTIVE" ? (
              <Alert
                type="info"
                showIcon
                className="mb-4"
                message="Counts toward subscription license"
                description="Active sites consume one licensed slot and are billed at this capacity tier."
              />
            ) : null}

            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Location">{row.location ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Address">{row.address ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Capacity tier">
                {row.stationSize.name} ({row.stationSize.code})
              </Descriptions.Item>
              <Descriptions.Item label="Portal URL">
                {row.portalBaseUrl ? (
                  <a href={row.portalBaseUrl} target="_blank" rel="noreferrer">
                    {row.portalBaseUrl}
                  </a>
                ) : (
                  "—"
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Vendor profile">
                {row.radiusVendorProfile
                  ? `${row.radiusVendorProfile.name} (${row.radiusVendorProfile.vendor})`
                  : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="NAS-Identifier">{row.nasIdentifier ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="RADIUS client IP">
                {row.radiusClientIp ?? "—"}
              </Descriptions.Item>
              <Descriptions.Item label="VLAN">{row.vlanId ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="RADIUS secret">
                {row.hasRadiusSecret ? "Configured" : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Devices">{row._count?.devices ?? 0}</Descriptions.Item>
              <Descriptions.Item label="Credentials">{row._count?.credentials ?? 0}</Descriptions.Item>
              <Descriptions.Item label="Site ID">
                <Text code copyable>
                  {row.id}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Created">
                {dayjs(row.createdAt).format("YYYY-MM-DD HH:mm")}
              </Descriptions.Item>
            </Descriptions>

            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/wifi/network/nas-devices">NAS devices</Link>
              <Link href="/wifi/catalog/retail-pricing">Retail pricing</Link>
              <Link href="/wifi/billing/subscription/sites">Licensed sites</Link>
            </div>
          </>
        ) : (
          !loading && <Text type="secondary">Site not found.</Text>
        )}
      </Spin>
    </Drawer>
  );
};

export default SiteDetailDrawer;
