"use client";

import React from "react";
import { Button, Drawer, Form, InputNumber, Select, Space, Switch, Typography } from "antd";
import type {
  PlanBrief,
  PlanPriceFormValues,
  PlanPriceRecord,
  PlanPriceUpdateValues,
} from "../types";

const { Paragraph } = Typography;

type Props = {
  open: boolean;
  saving?: boolean;
  priceBookId: string;
  editing: PlanPriceRecord | null;
  plans: PlanBrief[];
  pricedPlanIds: string[];
  onClose: () => void;
  onCreate: (values: PlanPriceFormValues) => Promise<void>;
  onUpdate: (id: string, values: PlanPriceUpdateValues) => Promise<void>;
};

const PlanPriceFormDrawer: React.FC<Props> = ({
  open,
  saving,
  priceBookId,
  editing,
  plans,
  pricedPlanIds,
  onClose,
  onCreate,
  onUpdate,
}) => {
  const [form] = Form.useForm<PlanPriceFormValues>();

  const availablePlans = editing
    ? plans
    : plans.filter((p) => !pricedPlanIds.includes(p.id));

  const initialValues: PlanPriceFormValues = editing
    ? {
        priceBookId,
        planId: editing.planId,
        retailPrice: Number(editing.retailPrice),
        costPrice: editing.costPrice != null ? Number(editing.costPrice) : undefined,
        isActive: editing.isActive,
      }
    : {
        priceBookId,
        planId: "",
        retailPrice: 0,
        costPrice: undefined,
        isActive: true,
      };

  const handleFinish = async (values: PlanPriceFormValues) => {
    if (editing) {
      await onUpdate(editing.id, {
        retailPrice: values.retailPrice,
        costPrice: values.costPrice ?? null,
        isActive: values.isActive,
      });
    } else {
      await onCreate(values);
    }
  };

  return (
    <Drawer
      title={editing ? `Edit price — ${editing.plan.code}` : "Add plan price"}
      size={420}
      open={open}
      onClose={onClose}
      destroyOnClose={false}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="primary" loading={saving} onClick={() => form.submit()}>
            {editing ? "Save" : "Add price"}
          </Button>
        </div>
      }
    >
      {open ? (
        <Form<PlanPriceFormValues>
          form={form}
          layout="vertical"
          requiredMark="optional"
          initialValues={initialValues}
          key={editing?.id ?? "create-price"}
          onFinish={(v) => void handleFinish(v)}
        >
          <Paragraph type="secondary" style={{ marginBottom: 16, fontSize: 13 }}>
            Set customer retail price and optional internal cost for a service plan in this book.
          </Paragraph>

          <Form.Item
            name="planId"
            label="Service plan"
            rules={[{ required: true, message: "Select a plan" }]}
          >
            <Select
              showSearch
              disabled={Boolean(editing)}
              optionFilterProp="label"
              placeholder="Choose plan"
              options={availablePlans.map((p) => ({
                value: p.id,
                label: `${p.name} (${p.code})`,
              }))}
            />
          </Form.Item>

          <Form.Item name="priceBookId" hidden>
            <input type="hidden" />
          </Form.Item>

          <Form.Item label="Retail price" required>
            <Space.Compact block>
              <Form.Item
                name="retailPrice"
                noStyle
                rules={[{ required: true, message: "Retail price is required" }]}
              >
                <InputNumber min={0} precision={2} style={{ width: "100%" }} />
              </Form.Item>
              <Button disabled>MMK</Button>
            </Space.Compact>
          </Form.Item>

          <Form.Item label="Cost price (optional)">
            <Space.Compact block>
              <Form.Item name="costPrice" noStyle>
                <InputNumber min={0} precision={2} style={{ width: "100%" }} />
              </Form.Item>
              <Button disabled>MMK</Button>
            </Space.Compact>
          </Form.Item>

          <Form.Item name="isActive" label="Active" valuePropName="checked">
            <Switch checkedChildren="Yes" unCheckedChildren="No" />
          </Form.Item>
        </Form>
      ) : null}
    </Drawer>
  );
};

export default PlanPriceFormDrawer;
