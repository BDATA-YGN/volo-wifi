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
  loading?: boolean;
  onClose: () => void;
  onEdit: (profile: VendorProfileRecord) => void;
  loadProfile: (id: string) => Promise<VendorProfileRecord>;
};

const VendorProfileDetailDrawer: React.FC<Props> = ({
  open,
  profileId,
  loading: externalLoading,
  onClose,
  onEdit,
  loadProfile,
}) => {
  const [profile, setProfile] = useState<VendorProfileRecord | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !profileId) {
      setProfile(null);
      return;
    }
    setLoading(true);
    void loadProfile(profileId)
      .then(setProfile)
      .finally(() => setLoading(false));
  }, [open, profileId, loadProfile]);

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

  return (
    <Drawer
      title={profile ? profile.name : "Vendor profile"}
      size={720}
      open={open}
      onClose={onClose}
      destroyOnHidden
      extra={
        profile ? (
          <Button type="primary" icon={<EditOutlined />} onClick={() => onEdit(profile)}>
            Edit
          </Button>
        ) : null
      }
    >
      <Spin spinning={loading || externalLoading}>
        {profile ? (
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <Title level={5} style={{ margin: 0 }}>
                  {profile.vendor}
                </Title>
                {profile.model ? (
                  <Text type="secondary" code>
                    {profile.model}
                  </Text>
                ) : null}
                {profile.supportsCoA ? (
                  <Tag color="blue">CoA :{profile.coaPort ?? 3799}</Tag>
                ) : (
                  <Tag>CoA disabled</Tag>
                )}
              </div>
              {profile.description ? (
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {profile.description}
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
                  children: profile._count.supportedAttributeRows,
                },
                {
                  key: "sites",
                  label: "WiFi sites",
                  children: profile._count.wifiStations,
                },
                {
                  key: "plans",
                  label: "Plan policies",
                  children: profile._count.planAttributes,
                },
              ]}
            />

            <Divider titlePlacement="left" style={{ margin: "8px 0" }}>
              Supported attributes
            </Divider>

            <Table<SupportedAttributeRow>
              rowKey="id"
              size="small"
              columns={columns}
              dataSource={profile.supportedAttributeRows ?? []}
              pagination={false}
              locale={{ emptyText: "No attributes linked to this profile." }}
            />
          </div>
        ) : null}
      </Spin>
    </Drawer>
  );
};

export default VendorProfileDetailDrawer;
