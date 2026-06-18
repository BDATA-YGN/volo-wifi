"use client";

import React from "react";
import { Card, Empty, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMenuNavigate } from "@/common/components/Sidebar/useMenuNavigate";
import { formatWifiDateTime } from "@/features/wifi/shared/format";
import { useRoutePermission } from "@/features/wifi/shared/hooks/useRoutePermission";
import type { WorkspaceRecentOrder } from "../types";
import { ORDER_STATUS_COLOR } from "../constant";
import { formatMoney, formatStatusLabel } from "../utils";

const ORDERS_PATH = "/wifi/commerce/transactions/orders";

const { Text } = Typography;

type Props = {
  orders: WorkspaceRecentOrder[];
  currency: string;
};

const WorkspaceRecentOrders: React.FC<Props> = ({ orders, currency }) => {
  const { navigateToMenu } = useMenuNavigate();
  const ordersPermission = useRoutePermission(ORDERS_PATH);
  const columns: ColumnsType<WorkspaceRecentOrder> = [
    {
      title: "Order",
      dataIndex: "orderNo",
      render: (orderNo: string) => (
        <Text code style={{ fontSize: 12 }}>
          {orderNo}
        </Text>
      ),
    },
    {
      title: "Site",
      key: "station",
      ellipsis: true,
      render: (_, row) =>
        row.station ? (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {row.station.code}
          </Text>
        ) : (
          "—"
        ),
    },
    {
      title: "Total",
      key: "total",
      width: 120,
      align: "right",
      render: (_, row) => formatMoney(row.total, row.currency || currency),
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 110,
      render: (status: string) => (
        <Tag color={ORDER_STATUS_COLOR[status] ?? "default"}>{formatStatusLabel(status)}</Tag>
      ),
    },
    {
      title: "Sold",
      key: "soldAt",
      width: 150,
      render: (_, row) =>
        row.soldAt ? (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {formatWifiDateTime(row.soldAt)}
          </Text>
        ) : (
          "—"
        ),
    },
  ];

  return (
    <Card
      size="small"
      title="Recent orders"
      extra={
        ordersPermission.visible && ordersPermission.accessible ? (
          <Typography.Link style={{ fontSize: 13 }} onClick={() => navigateToMenu(ORDERS_PATH)}>
            View all
          </Typography.Link>
        ) : null
      }
    >
      {orders.length > 0 ? (
        <Table<WorkspaceRecentOrder>
          size="small"
          rowKey="id"
          pagination={false}
          columns={columns}
          dataSource={orders}
        />
      ) : (
        <Empty
          description="No sales yet — issue your first access token to get started"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      )}
    </Card>
  );
};

export default WorkspaceRecentOrders;
