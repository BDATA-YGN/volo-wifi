"use client";

import React, { useMemo } from "react";
import { Alert, Button, Drawer, Form, Input, InputNumber, Select, Space, Typography } from "antd";
import type { IssueTokenFormValues, PaymentMethod, SellableCatalog } from "../types";
import { MAX_ISSUE_QUANTITY, PAYMENT_METHOD_OPTIONS } from "../constant";
import { calcLineTotal, formatMoney } from "../utils";
import { useDrawerFormSync } from "@/features/wifi/shared/hooks";

const { TextArea } = Input;
const { Text, Title, Paragraph } = Typography;

type Props = {
  open: boolean;
  saving?: boolean;
  catalog: SellableCatalog | null;
  onClose: () => void;
  onIssue: (values: IssueTokenFormValues) => Promise<void>;
};

const IssueTokenDrawer: React.FC<Props> = ({ open, saving, catalog, onClose, onIssue }) => {
  const [form] = Form.useForm<IssueTokenFormValues>();

  const planId = Form.useWatch("planId", form);
  const stationId = Form.useWatch("stationId", form);
  const quantity = Form.useWatch("quantity", form) ?? 1;
  const discount = Form.useWatch("discount", form) ?? 0;

  const selectedPlan = useMemo(
    () => catalog?.plans.find((p) => p.id === planId),
    [catalog?.plans, planId]
  );

  const currency = catalog?.currency ?? "MMK";

  const pricedPlansForSite = useMemo(() => {
    const plans = catalog?.plans ?? [];
    if (!stationId) return plans.filter((p) => p.hasPricing);
    return plans.filter((p) => p.pricesByStation?.[stationId] != null);
  }, [catalog?.plans, stationId]);

  const unitPrice =
    stationId && selectedPlan?.pricesByStation?.[stationId] != null
      ? selectedPlan.pricesByStation[stationId]!
      : (selectedPlan?.unitPrice ?? null);
  const lineTotal = calcLineTotal(unitPrice, quantity, discount);

  const formValues: IssueTokenFormValues = {
    quantity: 1,
    paymentMethod: "CASH" as PaymentMethod,
    discount: 0,
    stationId: catalog?.stations[0]?.id ?? "",
    planId: (() => {
      const siteId = catalog?.stations[0]?.id;
      const first = (catalog?.plans ?? []).find((p) =>
        siteId ? p.pricesByStation?.[siteId] != null : p.hasPricing
      );
      return first?.id ?? "";
    })(),
  };
  useDrawerFormSync(form, open, formValues, catalog ? `issue-${catalog.stations[0]?.id ?? "x"}` : "issue");

  const handleFinish = async (values: IssueTokenFormValues) => {
    await onIssue({
      ...values,
      quantity: values.quantity ?? 1,
      discount: values.discount ?? 0,
    });
  };

  return (
    <Drawer
      title="Issue access tokens"
      size={480}
      open={open}
      onClose={onClose}
      destroyOnHidden
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="primary" loading={saving} onClick={() => form.submit()}>
            Complete sale
          </Button>
        </div>
      }
    >
      {!catalog?.canSell ? (
        <Alert
          type="warning"
          showIcon
          className="mb-4"
          message="Not ready to sell"
          description="Map sites, assign plans, and configure retail pricing before issuing tokens."
        />
      ) : null}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
      >
        <Form.Item
          name="stationId"
          label="Site"
          rules={[{ required: true, message: "Site is required" }]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            options={(catalog?.stations ?? []).map((s) => ({
              value: s.id,
              label: `${s.code} — ${s.name}`,
            }))}
            onChange={() => {
              form.setFieldValue("planId", undefined);
            }}
          />
        </Form.Item>

        <Form.Item
          name="planId"
          label="Service plan"
          rules={[{ required: true, message: "Plan is required" }]}
          extra={
            unitPrice != null
              ? `Unit price: ${formatMoney(unitPrice, currency)}`
              : pricedPlansForSite.length === 0
                ? "No priced plans for this site on the winning price book (reseller → site → org default)"
                : "No price configured for this plan"
          }
        >
          <Select
            showSearch
            optionFilterProp="label"
            options={pricedPlansForSite.map((p) => ({
              value: p.id,
              label: `${p.code} — ${p.name}`,
            }))}
          />
        </Form.Item>

        <Form.Item label="Quantity">
          <Space.Compact style={{ width: "100%" }}>
            <Form.Item name="quantity" noStyle rules={[{ required: true }]}>
              <InputNumber min={1} max={MAX_ISSUE_QUANTITY} style={{ width: "100%" }} />
            </Form.Item>
            <Button disabled>max {MAX_ISSUE_QUANTITY}</Button>
          </Space.Compact>
        </Form.Item>

        <Form.Item name="paymentMethod" label="Payment method" rules={[{ required: true }]}>
          <Select options={PAYMENT_METHOD_OPTIONS} />
        </Form.Item>

        <Form.Item label="Discount">
          <Space.Compact style={{ width: "100%" }}>
            <Form.Item name="discount" noStyle>
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
            <Button disabled>{currency}</Button>
          </Space.Compact>
        </Form.Item>

        <Form.Item name="note" label="Note">
          <TextArea rows={2} placeholder="Optional sale note" />
        </Form.Item>

        {lineTotal != null ? (
          <div className="rounded border bg-gray-50 px-4 py-3 dark:bg-neutral-900">
            <Paragraph style={{ marginBottom: 4 }}>
              <Text type="secondary">Order total</Text>
            </Paragraph>
            <Title level={4} style={{ margin: 0 }}>
              {formatMoney(lineTotal, currency)}
            </Title>
            {quantity > 1 ? (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {quantity} × {formatMoney(unitPrice!, currency)}
                {discount > 0 ? ` − ${formatMoney(discount, currency)} discount` : ""}
              </Text>
            ) : null}
          </div>
        ) : null}
      </Form>
    </Drawer>
  );
};

export default IssueTokenDrawer;
