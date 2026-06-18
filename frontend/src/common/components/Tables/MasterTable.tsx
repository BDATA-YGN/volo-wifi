"use client";
import React, { useEffect, useState } from "react";
import { useWindowWidth } from "@react-hook/window-size";
import { Flex, Table, List, Button, Typography, Input, TableProps } from "antd";
import { ColumnsType } from "antd/es/table";
import { formatTitle } from "@/utils/clientUtils";

interface MasterTableProps {
  title?: string | React.ReactNode;
  dataSource: any[];
  totalCount?: number;
  onStateChange?: (params?: any) => void;
  loading?: boolean;
  extra?: React.ReactNode | React.ReactNode[];
  columns?: ColumnsType;
  renderActions?: (record: any) => React.ReactNode;
  scroll?: any;
  onRow?: (record: any) => any;
  props?: TableProps<any>;
  components?: TableProps<any>['components'];
}

function MasterTable({
  title,
  dataSource,
  totalCount,
  onStateChange,
  loading = false,
  extra,
  columns,
  renderActions,
  scroll,
  onRow,
  components,
  ...props
}: MasterTableProps) {
  const [showMobileLayout, setShowMobileLayout] = useState(false);
  const screenWidth = useWindowWidth();

  useEffect(() => {
    setShowMobileLayout(screenWidth < 768);
  }, [screenWidth]);

  const handleChange = (pagination?: any, filters?: any, sorter?: any) => {
    const limit = pagination.pageSize;
    const page = pagination.current;
    const params: any = {
      take: limit,
      skip: page * limit - limit,
      page,
      limit,
    };

    if (sorter?.column) {
      params.sort_by = sorter.field;
      params.order_by = sorter.order?.slice(0, -3);
    }

    onStateChange && onStateChange(params);
  };

  useEffect(() => {
    handleChange({ current: 1, pageSize: 10 });
  }, []);

  const renderMobileListItem = (item: any) => (
    <List.Item
      key={item.id}
      actions={
        renderActions
      ? [renderActions(item)]
      : undefined
      }
    >
      <List.Item.Meta
        title={<Typography.Text strong>{formatTitle("")}</Typography.Text>}
        description={columns
          ?.filter(col => col.key && col.key !== "action")
          .map((col: any) => {
            return (
              <div key={col.key}>
                <strong>{col.title}</strong>:{" "}
                {col.children ? (
                  // If the column has children, render each child
                  col.children.map((child: any) => (
                    <div key={child.key}>
                      <strong>{child.title}</strong>:{" "}
                      {child.render ? child.render(item[child.dataIndex], item) : item[child.key]}
                    </div>
                  ))
                ) : (
                  // If no children, use the normal rendering logic
                  col.render ? col.render(item[col.dataIndex], item) : item[col.key]
                )}
              </div>
            );
          })}
      />
    </List.Item>
  );

  return showMobileLayout ? (
    <div className="pb-16">
      <Input.Search
        allowClear
        placeholder="Search"
        onSearch={(value) => onStateChange?.({ search: value || "" })}
        style={{ marginBottom: "16px" }}
      />
      <List
        header={<>{title}</>}
        dataSource={dataSource}
        loading={loading}
        renderItem={renderMobileListItem}
        pagination={{
          total: totalCount,
          defaultCurrent: 1,
          defaultPageSize: 10,
          showSizeChanger: true,
          onChange: (page, pageSize) => handleChange({ current: page, pageSize }),
        }}
      />
    </div>
  ) : (
    <Table
      rowKey={(record) => record.id}
      scroll={scroll}
      title={() => (
        <Flex justify="space-between" gap={16}>
          {title ? <h2 className="m-0 text-2xl capitalize">{title}</h2> : <span />}
          <Flex gap={16}>{extra}</Flex>
        </Flex>
      )}
      size="large"
      loading={loading}
      onChange={handleChange}
      pagination={{
        total: totalCount,
        defaultCurrent: 1,
        defaultPageSize: 10,
        showSizeChanger: true,
      }}
      dataSource={dataSource}
      columns={columns}
      onRow={onRow}
      components={components}
      {...props}
    />
  );
}

export default React.memo(MasterTable);