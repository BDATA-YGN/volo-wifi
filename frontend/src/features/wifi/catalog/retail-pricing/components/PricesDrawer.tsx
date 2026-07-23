"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Button,
  Drawer,
  Empty,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined } from "@ant-design/icons";
import type {
  PlanPriceRecord,
  PriceBookDetail,
  PriceBookRecord,
  RetailPricingFormOptions,
} from "../types";
import { SCOPE_COLOR } from "../constant";
import { formatBookScopeTarget, formatMoney, formatScopeLabel } from "../utils";
import PlanPriceFormDrawer from "./PlanPriceFormDrawer";

const { Text, Title } = Typography;

type Props = {
  open: boolean;
  book: PriceBookRecord | null;
  formOptions: RetailPricingFormOptions;
  onClose: () => void;
  loadBook: (id: string) => Promise<PriceBookDetail>;
  onCreatePrice: (values: import("../types").PlanPriceFormValues) => Promise<void>;
  onUpdatePrice: (id: string, values: import("../types").PlanPriceUpdateValues) => Promise<void>;
  onRemovePrice: (id: string) => Promise<void>;
};

const PricesDrawer: React.FC<Props> = ({
  open,
  book,
  formOptions,
  onClose,
  loadBook,
  onCreatePrice,
  onUpdatePrice,
  onRemovePrice,
}) => {
  const [detail, setDetail] = useState<PriceBookDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [priceFormOpen, setPriceFormOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState<PlanPriceRecord | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    if (!book?.id) return;
    setLoading(true);
    try {
      const data = await loadBook(book.id);
      setDetail(data);
    } finally {
      setLoading(false);
    }
  }, [book?.id, loadBook]);

  useEffect(() => {
    if (!open || !book?.id) {
      setDetail(null);
      return;
    }
    void refresh();
  }, [open, book?.id, refresh]);

  const prices = detail?.prices ?? [];
  const pricedPlanIds = prices.map((p) => p.planId);
  const unpricedPlans = formOptions.plans.filter((p) => !pricedPlanIds.includes(p.id));

  const openAddPrice = () => {
    setEditingPrice(null);
    setPriceFormOpen(true);
  };

  const openEditPrice = (record: PlanPriceRecord) => {
    setEditingPrice(record);
    setPriceFormOpen(true);
  };

  const handleCreatePrice = async (values: import("../types").PlanPriceFormValues) => {
    setSaving(true);
    try {
      await onCreatePrice(values);
      setPriceFormOpen(false);
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePrice = async (
    id: string,
    values: import("../types").PlanPriceUpdateValues
  ) => {
    setSaving(true);
    try {
      await onUpdatePrice(id, values);
      setPriceFormOpen(false);
      setEditingPrice(null);
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<PlanPriceRecord> = [
    {
      title: "Plan",
      key: "plan",
      render: (_, row) => (
        <div>
          <Text strong>{row.plan.name}</Text>
          <div>
            <Text code style={{ fontSize: 11 }}>
              {row.plan.code}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: "Retail",
      dataIndex: "retailPrice",
      width: 110,
      align: "right",
      render: (v: string) => <Text strong>{formatMoney(v)}</Text>,
    },
    {
      title: "Cost",
      dataIndex: "costPrice",
      width: 110,
      align: "right",
      render: (v: string | null) => <Text type="secondary">{formatMoney(v)}</Text>,
    },
    {
      title: "Status",
      dataIndex: "isActive",
      width: 90,
      render: (active: boolean) =>
        active ? <Tag color="success">Active</Tag> : <Tag color="default">Inactive</Tag>,
    },
    {
      title: "",
      key: "actions",
      width: 120,
      align: "right",
      render: (_, row) => (
        <Space size={0}>
          <Button type="link" size="small" onClick={() => openEditPrice(row)}>
            Edit
          </Button>
          <Button
            type="link"
            size="small"
            danger
            onClick={() => void onRemovePrice(row.id).then(refresh)}
          >
            Remove
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Drawer
        title="Manage plan prices"
        size={720}
        open={open}
        onClose={onClose}
        destroyOnClose
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openAddPrice}>
            Add price
          </Button>
        }
      >
        <Spin spinning={loading}>
          {book ? (
            <>
              <div className="mb-4">
                <Title level={5} style={{ margin: 0 }}>
                  {book.name}
                </Title>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Tag color={SCOPE_COLOR[book.scope]}>{formatScopeLabel(book.scope)}</Tag>
                  {book.isDefault ? <Tag color="gold">Default</Tag> : null}
                </div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {formatBookScopeTarget(book)}
                </Text>
              </div>

              {formOptions.plans.length === 0 && prices.length === 0 ? (
                <Alert
                  type="warning"
                  showIcon
                  className="mb-4"
                  title="No service plans defined"
                  description={
                    <span>
                      Create plans on{" "}
                      <Link href="/wifi/catalog/service-plans">Service Plans</Link> before adding
                      prices.
                    </span>
                  }
                />
              ) : null}

              {unpricedPlans.length > 0 && formOptions.plans.length > 0 ? (
                <Alert
                  type="info"
                  showIcon
                  className="mb-4"
                  title={`${unpricedPlans.length} plan${unpricedPlans.length === 1 ? "" : "s"} not priced in this book`}
                />
              ) : null}

              <Table<PlanPriceRecord>
                rowKey="id"
                size="middle"
                columns={columns}
                dataSource={prices}
                pagination={false}
                locale={{
                  emptyText: (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="No prices in this book yet"
                    />
                  ),
                }}
              />
            </>
          ) : null}
        </Spin>
      </Drawer>

      <PlanPriceFormDrawer
        open={priceFormOpen}
        saving={saving}
        priceBookId={book?.id ?? ""}
        editing={editingPrice}
        plans={formOptions.plans}
        pricedPlanIds={pricedPlanIds}
        onClose={() => {
          setPriceFormOpen(false);
          setEditingPrice(null);
        }}
        onCreate={handleCreatePrice}
        onUpdate={handleUpdatePrice}
      />
    </>
  );
};

export default PricesDrawer;
