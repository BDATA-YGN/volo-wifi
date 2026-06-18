"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Descriptions, Drawer, Spin, Tag, Typography } from "antd";
import { EditOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { TenantDetailRecord, TenantsMeta } from "../types";
import { STATUS_COLOR } from "../constant";

const { Text, Title } = Typography;

type Props = {
  open: boolean;
  tenantId: string | null;
  fallback?: TenantDetailRecord | null;
  onClose: () => void;
  onEdit: (tenant: TenantDetailRecord) => void;
  loadTenant: (id: string) => Promise<{ tenant: TenantDetailRecord; meta?: TenantsMeta }>;
};

const TenantDetailDrawer: React.FC<Props> = ({
  open,
  tenantId,
  fallback,
  onClose,
  onEdit,
  loadTenant,
}) => {
  const [tenant, setTenant] = useState<TenantDetailRecord | null>(null);
  const [extraMeta, setExtraMeta] = useState<TenantsMeta | undefined>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !tenantId) {
      setTenant(null);
      setExtraMeta(undefined);
      return;
    }

    if (fallback?.id === tenantId) {
      setTenant(fallback);
    }

    setLoading(true);
    void loadTenant(tenantId)
      .then(({ tenant: row, meta }) => {
        setTenant(row);
        setExtraMeta(meta);
      })
      .catch(() => {
        if (fallback?.id === tenantId) setTenant(fallback);
      })
      .finally(() => setLoading(false));
  }, [open, tenantId, fallback, loadTenant]);

  const row = tenant;
  const license = row?.orgLicense;

  return (
    <Drawer
      title="Tenant profile"
      size={520}
      open={open}
      onClose={onClose}
      destroyOnHidden
      extra={
        row ? (
          <Button type="primary" icon={<EditOutlined />} onClick={() => onEdit(row)}>
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
                <Text code>{row.code}</Text>
                <Tag color={row.isActive ? "success" : "default"}>
                  {row.isActive ? "Active org" : "Inactive org"}
                </Tag>
                {license ? (
                  <Tag color={STATUS_COLOR[license.status]}>{license.status}</Tag>
                ) : (
                  <Tag>No subscription</Tag>
                )}
              </div>
            </div>

            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Timezone">{row.timezone}</Descriptions.Item>
              <Descriptions.Item label="Currency">{row.currency}</Descriptions.Item>
              <Descriptions.Item label="Members">{row.memberCount}</Descriptions.Item>
              <Descriptions.Item label="Sites">
                {row.activeStationCount} active / {row.totalStationCount} total
              </Descriptions.Item>
              {extraMeta ? (
                <>
                  <Descriptions.Item label="Service plans">{extraMeta.planCount ?? 0}</Descriptions.Item>
                  <Descriptions.Item label="Partners">{extraMeta.resellerCount ?? 0}</Descriptions.Item>
                </>
              ) : null}
              <Descriptions.Item label="Created">
                {dayjs(row.createdAt).format("YYYY-MM-DD HH:mm")}
              </Descriptions.Item>
            </Descriptions>

            {license ? (
              <>
                <Title level={5} style={{ marginTop: 24, marginBottom: 12 }}>
                  Subscription
                </Title>
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label="Site limit">{license.stationLimit}</Descriptions.Item>
                  <Descriptions.Item label="Billing cycle">{license.billingCycle}</Descriptions.Item>
                  <Descriptions.Item label="Effective from">
                    {dayjs(license.effectiveFrom).format("YYYY-MM-DD")}
                  </Descriptions.Item>
                  <Descriptions.Item label="Expires">
                    {license.expiresAt
                      ? dayjs(license.expiresAt).format("YYYY-MM-DD")
                      : "—"}
                  </Descriptions.Item>
                </Descriptions>
              </>
            ) : null}

            {row.description ? (
              <>
                <Title level={5} style={{ marginTop: 24, marginBottom: 12 }}>
                  Description
                </Title>
                <Text type="secondary">{row.description}</Text>
              </>
            ) : null}

            <div className="mt-6 flex flex-col gap-2">
              <Link href={`/wifi/billing/subscription?orgId=${row.id}`}>
                <Button type="link" style={{ padding: 0, height: "auto" }}>
                  Open subscription
                </Button>
              </Link>
              <Link href={`/wifi/billing/subscription/sites?orgId=${row.id}`}>
                <Button type="link" style={{ padding: 0, height: "auto" }}>
                  Licensed sites
                </Button>
              </Link>
              <Link href="/wifi/tenant/access-control">
                <Button type="link" style={{ padding: 0, height: "auto" }}>
                  Access control
                </Button>
              </Link>
            </div>
          </>
        ) : (
          !loading && <Text type="secondary">Tenant not found.</Text>
        )}
      </Spin>
    </Drawer>
  );
};

export default TenantDetailDrawer;
