"use client";

import React, { useEffect, useState } from "react";
import { Button, Descriptions, Divider, Drawer, Spin, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { EditOutlined } from "@ant-design/icons";
import type { SupportedAttributeRow, VendorProfileRecord } from "../types";
import { REQUIREMENT_OPTIONS, VALUE_TYPE_COLOR } from "../constant";

const { Text, Title } = Typography;

type Props = {
  open: boolean;
  profileId: string | null;
  fallback?: VendorProfileRecord | null;
  onClose: () => void;
  onEdit: (profile: VendorProfileRecord) => void;
  loadProfile: (id: string) => Promise<VendorProfileRecord>;
};

const VendorProfileDetailDrawer: React.FC<Props> = ({
  open,
  profileId,
  fallback,
  onClose,
  onEdit,
  loadProfile,
}) => {
  const [profile, setProfile] = useState<VendorProfileRecord | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !profileId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    if (fallback?.id === profileId) {
      setProfile((prev) => (prev?.id === profileId ? prev : fallback));
    }

    let cancelled = false;
    setLoading(true);
    void loadProfile(profileId)
      .then((row) => {
        if (!cancelled) setProfile(row);
      })
      .catch(() => {
        if (!cancelled && fallback?.id === profileId) {
          setProfile((prev) => prev ?? fallback);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, profileId, fallback?.id, loadProfile]);

  const columns: ColumnsType<SupportedAttributeRow> = [
    {
      title: "FreeRADIUS name",
      key: "name",
      render: (_, row) => (
        <Text code style={{ fontSize: 12 }}>
          {row.attribute.freeradiusName}
        </Text>
      ),
    },
    {
      title: "Display name",
      dataIndex: ["attribute", "displayName"],
    },
    {
      title: "Type",
      dataIndex: ["attribute", "valueType"],
      width: 90,
      render: (type: string) => <Tag color={VALUE_TYPE_COLOR[type] ?? "default"}>{type}</Tag>,
    },
    {
      title: "Op",
      dataIndex: ["attribute", "op"],
      width: 60,
      render: (op: string) => <Text code>{op}</Text>,
    },
    {
      title: "Requirement",
      dataIndex: "requirement",
      width: 100,
      render: (req: string) => (
        <Tag color={req === "MUST" ? "orange" : "default"}>
          {REQUIREMENT_OPTIONS.find((o) => o.value === req)?.label ?? req}
        </Tag>
      ),
    },
  ];

  const row = profile;
  // Only block the drawer while we have nothing to show.
  const spinning = loading && !row;

  return (
    <Drawer
      title={row ? row.name : "Vendor profile"}
      size={720}
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
      <Spin spinning={spinning}>
        {row ? (
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <Title level={5} style={{ margin: 0 }}>
                  {row.vendor}
                </Title>
                {row.model ? (
                  <Text type="secondary" code>
                    {row.model}
                  </Text>
                ) : null}
                {row.supportsCoA ? (
                  <Tag color="blue">CoA :{row.coaPort ?? 3799}</Tag>
                ) : (
                  <Tag>CoA disabled</Tag>
                )}
              </div>
              {row.description ? (
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {row.description}
                </Text>
              ) : null}
            </div>

            <Descriptions
              column={{ xs: 1, sm: 3 }}
              size="small"
              items={[
                {
                  key: "attrs",
                  label: "Attributes",
                  children: row._count.supportedAttributeRows,
                },
                {
                  key: "sites",
                  label: "WiFi sites",
                  children: row._count.wifiStations,
                },
                {
                  key: "plans",
                  label: "Plan policies",
                  children: row._count.planAttributes,
                },
              ]}
            />

            <Divider titlePlacement="left" style={{ margin: "8px 0" }}>
              Supported attributes
            </Divider>

            <Table<SupportedAttributeRow>
              rowKey="id"
              size="small"
              loading={loading}
              columns={columns}
              dataSource={row.supportedAttributeRows ?? []}
              pagination={false}
              locale={{
                emptyText: loading
                  ? "Loading attributes…"
                  : "No attributes linked to this profile.",
              }}
            />
          </div>
        ) : (
          !spinning && <Text type="secondary">Profile not found.</Text>
        )}
      </Spin>
    </Drawer>
  );
};

export default VendorProfileDetailDrawer;
