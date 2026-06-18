"use client";

import React from "react";
import { Card, Empty, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { WorkspaceStation } from "../types";

const { Text } = Typography;

type Props = {
  stations: WorkspaceStation[];
};

const WorkspaceStationsCard: React.FC<Props> = ({ stations }) => {
  const columns: ColumnsType<WorkspaceStation> = [
    {
      title: "Site",
      key: "site",
      render: (_, row) => (
        <div>
          <Tag style={{ fontFamily: "monospace", marginRight: 6 }}>{row.code}</Tag>
          <Text>{row.name}</Text>
          {row.location ? (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {row.location}
              </Text>
            </div>
          ) : null}
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

  return (
    <Card size="small" title={`Your sites (${stations.length})`}>
      {stations.length > 0 ? (
        <Table<WorkspaceStation>
          size="small"
          rowKey="mappingId"
          pagination={false}
          columns={columns}
          dataSource={stations}
        />
      ) : (
        <Empty description="No sites mapped to this partner" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
    </Card>
  );
};

export default WorkspaceStationsCard;
