"use client";

import React from "react";
import { Card, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { NasInventorySiteRow } from "../types";

const { Text } = Typography;

type Props = {
  rows: NasInventorySiteRow[];
  loading?: boolean;
  selectedStationId?: string | null;
  onSelectSite?: (stationId: string | null) => void;
};

const NasSiteTable: React.FC<Props> = ({
  rows,
  loading,
  selectedStationId,
  onSelectSite,
}) => {
  const columns: ColumnsType<NasInventorySiteRow> = [
    {
      title: "Site",
      key: "site",
      render: (_, row) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>
            {row.name}
          </Text>
          {row.code ? (
            <div>
              <Text type="secondary" style={{ fontSize: 12, fontFamily: "monospace" }}>
                {row.code}
              </Text>
            </div>
          ) : (
            <Tag color="warning" style={{ marginTop: 4, fontSize: 11 }}>
              Unassigned pool
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: "Devices",
      dataIndex: "deviceCount",
      key: "deviceCount",
      width: 80,
      align: "right",
      sorter: (a, b) => a.deviceCount - b.deviceCount,
      defaultSortOrder: "descend",
    },
    {
      title: "RADIUS",
      dataIndex: "radiusClientCount",
      key: "radiusClientCount",
      width: 80,
      align: "right",
    },
  ];

  return (
    <Card size="small" title="By site" styles={{ body: { padding: 0 } }}>
      <Table<NasInventorySiteRow>
        size="small"
        rowKey={(row) => row.stationId ?? "__unassigned__"}
        loading={loading}
        dataSource={rows}
        columns={columns}
        pagination={{ pageSize: 8, hideOnSinglePage: true, size: "small" }}
        rowClassName={(row) =>
          row.stationId === selectedStationId ? "ant-table-row-selected" : ""
        }
        onRow={(row) => ({
          onClick: () => {
            if (!onSelectSite) return;
            if (!row.stationId) {
              onSelectSite(null);
            } else {
              onSelectSite(row.stationId);
            }
          },
          style: { cursor: onSelectSite ? "pointer" : undefined },
        })}
        scroll={{ x: 320 }}
      />
    </Card>
  );
};

export default NasSiteTable;
