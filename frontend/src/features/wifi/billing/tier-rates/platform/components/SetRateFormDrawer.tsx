"use client";

import React, { useEffect } from "react";
import { Button, DatePicker, Drawer, Form, InputNumber, Select, Space, Switch, Typography } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import type { PlatformRateFormValues, StationSizeSummary, TierRateMatrixRow } from "../types";
import { DEFAULT_CURRENCY } from "../constant";

const { Text } = Typography;

type FormShape = Omit<PlatformRateFormValues, "effectiveFrom" | "effectiveTo"> & {
  effectiveFrom: Dayjs;
  effectiveTo?: Dayjs | null;
};

type Props = {
  open: boolean;
  saving: boolean;
  tiers: StationSizeSummary[];
  presetTierId?: string | null;
  editingScheduledId?: string | null;
  matrixRow?: TierRateMatrixRow | null;
  onClose: () => void;
  onSubmit: (values: PlatformRateFormValues) => Promise<void>;
};

const SetRateFormDrawer: React.FC<Props> = ({
  open,
  saving,
  tiers,
  presetTierId,
  editingScheduledId,
  matrixRow,
  onClose,
  onSubmit,
}) => {
  const [form] = Form.useForm<FormShape>();
  const isEdit = Boolean(editingScheduledId);

  useEffect(() => {
    if (!open) return;

    if (isEdit && matrixRow?.scheduledRate) {
      const rate = matrixRow.scheduledRate;
      form.setFieldsValue({
        stationSizeId: rate.stationSizeId,
        unitPrice: Number(rate.unitPrice),
        currency: rate.currency,
        effectiveFrom: dayjs(rate.effectiveFrom),
        effectiveTo: rate.effectiveTo ? dayjs(rate.effectiveTo) : null,
        isActive: rate.isActive,
      });
      return;
    }

    const tierId = presetTierId ?? tiers[0]?.id;
    const current = matrixRow?.currentRate;
    form.resetFields();
    form.setFieldsValue({
      stationSizeId: tierId,
      unitPrice: current ? Number(current.unitPrice) : undefined,
      currency: current?.currency ?? DEFAULT_CURRENCY,
      effectiveFrom: dayjs().startOf("day"),
      isActive: true,
    });
  }, [open, isEdit, matrixRow, presetTierId, tiers, form, editingScheduledId]);

  const handleFinish = async (values: FormShape) => {
    await onSubmit({
      stationSizeId: values.stationSizeId,
      unitPrice: values.unitPrice,
      currency: values.currency || DEFAULT_CURRENCY,
      effectiveFrom: values.effectiveFrom.toISOString(),
      effectiveTo: values.effectiveTo ? values.effectiveTo.toISOString() : null,
      isActive: values.isActive,
    });
  };

  return (
    <Drawer
      title={isEdit ? "Edit scheduled rate" : "Set platform tier rate"}
      size={460}
      open={open}
      onClose={onClose}
      destroyOnHidden
    >
      <Text type="secondary" style={{ display: "block", marginBottom: 20, fontSize: 13 }}>
        {isEdit
          ? "Update a future-dated rate before it takes effect."
          : "Creates a new monthly license price. Previous active rates for the same tier are closed at the effective date."}
      </Text>

      <Form form={form} layout="vertical" requiredMark="optional" onFinish={(v) => void handleFinish(v)}>
        <Form.Item
          name="stationSizeId"
          label="Capacity tier"
          rules={[{ required: true, message: "Select a tier" }]}
        >
          <Select
            disabled={Boolean(presetTierId) || isEdit}
            options={tiers.map((t) => ({
              value: t.id,
              label: `${t.code} — ${t.name}`,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="unitPrice"
          label="Monthly unit price (per site)"
          rules={[{ required: true, message: "Unit price is required" }]}
        >
          <InputNumber min={0.01} precision={2} style={{ width: "100%" }} placeholder="50000" />
        </Form.Item>

        <Form.Item name="currency" label="Currency" rules={[{ required: true }]}>
          <Select
            options={[
              { value: "MMK", label: "MMK — Myanmar Kyat" },
              { value: "USD", label: "USD — US Dollar" },
            ]}
          />
        </Form.Item>

        <Form.Item
          name="effectiveFrom"
          label="Effective from"
          rules={[{ required: true, message: "Effective date is required" }]}
          extra="Rate applies from the start of this date (monthly billing cycle)."
        >
          <DatePicker style={{ width: "100%" }} disabled={isEdit} />
        </Form.Item>

        <Form.Item name="effectiveTo" label="Effective to (optional)">
          <DatePicker style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item name="isActive" label="Active" valuePropName="checked">
          <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
        </Form.Item>

        <Space className="flex justify-end pt-2">
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="primary" htmlType="submit" loading={saving}>
            {isEdit ? "Save changes" : "Set rate"}
          </Button>
        </Space>
      </Form>
    </Drawer>
  );
};

export default SetRateFormDrawer;
