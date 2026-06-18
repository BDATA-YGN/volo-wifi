"use client";

import React, { useEffect } from "react";
import { Alert, Button, DatePicker, Drawer, Form, InputNumber, Select, Space, Switch, Typography } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import type {
  OrgSummary,
  StationSizeSummary,
  TenantOverrideFormValues,
  TenantRateMatrixRow,
} from "../types";
import { DEFAULT_CURRENCY } from "../constant";
import { formatMoney } from "../../platform/utils";

const { Text } = Typography;

type FormShape = Omit<TenantOverrideFormValues, "effectiveFrom" | "effectiveTo"> & {
  effectiveFrom: Dayjs;
  effectiveTo?: Dayjs | null;
};

type Props = {
  open: boolean;
  saving: boolean;
  org: OrgSummary | null;
  tiers: StationSizeSummary[];
  presetTierId?: string | null;
  editingScheduled?: boolean;
  matrixRow?: TenantRateMatrixRow | null;
  onClose: () => void;
  onSubmit: (values: TenantOverrideFormValues) => Promise<void>;
};

const SetTenantOverrideDrawer: React.FC<Props> = ({
  open,
  saving,
  org,
  tiers,
  presetTierId,
  editingScheduled,
  matrixRow,
  onClose,
  onSubmit,
}) => {
  const [form] = Form.useForm<FormShape>();
  const isEdit = Boolean(editingScheduled && matrixRow?.scheduledOverride);

  useEffect(() => {
    if (!open || !org) return;

    if (isEdit && matrixRow?.scheduledOverride) {
      const rate = matrixRow.scheduledOverride;
      form.setFieldsValue({
        orgId: org.id,
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
    const platform = matrixRow?.platformRate;
    const current = matrixRow?.tenantOverride;
    form.resetFields();
    form.setFieldsValue({
      orgId: org.id,
      stationSizeId: tierId,
      unitPrice: current
        ? Number(current.unitPrice)
        : platform
          ? Number(platform.unitPrice)
          : undefined,
      currency: current?.currency ?? platform?.currency ?? org.currency ?? DEFAULT_CURRENCY,
      effectiveFrom: dayjs().startOf("day"),
      isActive: true,
    });
  }, [open, org, isEdit, matrixRow, presetTierId, tiers, form, editingScheduled]);

  const handleFinish = async (values: FormShape) => {
    if (!org) return;
    await onSubmit({
      orgId: org.id,
      stationSizeId: values.stationSizeId,
      unitPrice: values.unitPrice,
      currency: values.currency || org.currency || DEFAULT_CURRENCY,
      effectiveFrom: values.effectiveFrom.toISOString(),
      effectiveTo: values.effectiveTo ? values.effectiveTo.toISOString() : null,
      isActive: values.isActive,
    });
  };

  const platformHint = matrixRow?.platformRate
    ? formatMoney(matrixRow.platformRate.unitPrice, matrixRow.platformRate.currency)
    : null;

  return (
    <Drawer
      title={isEdit ? "Edit scheduled override" : "Set tenant tier override"}
      width={480}
      open={open}
      onClose={onClose}
      destroyOnHidden
    >
      {org ? (
        <Text type="secondary" style={{ display: "block", marginBottom: 16, fontSize: 13 }}>
          Override for <Text strong>{org.name}</Text> ({org.code})
        </Text>
      ) : null}

      {platformHint ? (
        <Alert
          type="info"
          showIcon
          className="mb-4"
          message={`Platform default: ${platformHint} / site / month`}
        />
      ) : null}

      <Form form={form} layout="vertical" requiredMark="optional" onFinish={(v) => void handleFinish(v)}>
        <Form.Item name="orgId" hidden>
          <input type="hidden" />
        </Form.Item>

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
          label="Monthly override price (per site)"
          rules={[{ required: true, message: "Unit price is required" }]}
        >
          <InputNumber min={0.01} precision={2} style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item name="currency" label="Currency" rules={[{ required: true }]}>
          <Select
            options={[
              { value: "MMK", label: "MMK" },
              { value: "USD", label: "USD" },
            ]}
          />
        </Form.Item>

        <Form.Item
          name="effectiveFrom"
          label="Effective from"
          rules={[{ required: true }]}
          extra="Tenant override applies from this date; previous overrides for the same tier are closed."
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
            {isEdit ? "Save changes" : "Save override"}
          </Button>
        </Space>
      </Form>
    </Drawer>
  );
};

export default SetTenantOverrideDrawer;
