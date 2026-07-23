"use client";

import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  DatePicker,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Spin,
  Switch,
  Typography,
} from "antd";
import type { Dayjs } from "dayjs";
import type { PayoutFormValues, PayoutPreview, PayoutsFormOptions } from "../types";
import { formatMoney } from "../utils";
import { useDrawerFormSync } from "@/features/wifi/shared/hooks";

const { RangePicker } = DatePicker;
const { Paragraph } = Typography;

type Props = {
  open: boolean;
  saving?: boolean;
  formOptions: PayoutsFormOptions;
  onClose: () => void;
  onCreate: (values: PayoutFormValues) => Promise<void>;
  onPreview: (resellerId: string, periodFrom: string, periodTo: string) => Promise<PayoutPreview>;
};

const PayoutFormDrawer: React.FC<Props> = ({
  open,
  saving,
  formOptions,
  onClose,
  onCreate,
  onPreview,
}) => {
  const [form] = Form.useForm<PayoutFormValues & { periodDays: [Dayjs, Dayjs] }>();
  const generate = Form.useWatch("generate", form);
  const resellerId = Form.useWatch("resellerId", form);
  const periodDays = Form.useWatch("periodDays", form);
  const currency = formOptions.currency;

  const [preview, setPreview] = useState<PayoutPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useDrawerFormSync(
    form,
    open,
    { generate: true, amount: 0, note: "" } as PayoutFormValues & { periodDays: [Dayjs, Dayjs] },
    "create-payout"
  );

  useEffect(() => {
    if (!open) {
      setPreview(null);
      return;
    }

    if (!generate || !resellerId || !periodDays?.[0] || !periodDays?.[1]) {
      setPreview(null);
      return;
    }

    const timer = window.setTimeout(() => {
      setPreviewLoading(true);
      void onPreview(
        resellerId,
        periodDays[0].startOf("day").toISOString(),
        periodDays[1].endOf("day").toISOString()
      )
        .then(setPreview)
        .catch(() => setPreview(null))
        .finally(() => setPreviewLoading(false));
    }, 400);

    return () => window.clearTimeout(timer);
  }, [open, generate, resellerId, periodDays, onPreview]);

  const handleFinish = async (values: PayoutFormValues & { periodDays: [Dayjs, Dayjs] }) => {
    await onCreate({
      resellerId: values.resellerId,
      period: [
        values.periodDays[0].startOf("day").toISOString(),
        values.periodDays[1].endOf("day").toISOString(),
      ],
      generate: values.generate,
      amount: values.amount,
      note: values.note ?? "",
    });
  };

  return (
    <Drawer
      title="New commission payout"
      size={520}
      open={open}
      onClose={onClose}
      destroyOnHidden
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="primary" loading={saving} onClick={() => form.submit()}>
            Create payout
          </Button>
        </div>
      }
    >
      <Alert
        type="info"
        showIcon
        className="mb-4"
        title="Payout workflow"
        description="Create a draft payout from paid partner sales in the selected period. Review, approve, then mark as paid when funds are transferred."
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
      >
        <Form.Item
          name="resellerId"
          label="Partner"
          rules={[{ required: true, message: "Select a partner" }]}
        >
          <Select
            showSearch
            placeholder="Select partner"
            optionFilterProp="label"
            options={formOptions.resellers.map((r) => ({
              value: r.id,
              label: `${r.code} — ${r.name}`,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="periodDays"
          label="Payout period"
          rules={[{ required: true, message: "Select a date range" }]}
        >
          <RangePicker style={{ width: "100%" }} format="D MMM YYYY" />
        </Form.Item>

        <Form.Item
          name="generate"
          label="Calculate from sales"
          valuePropName="checked"
          extra="Uses commission rules against paid orders in the period"
        >
          <Switch />
        </Form.Item>

        {!generate ? (
          <Form.Item
            name="amount"
            label="Payout amount"
            rules={[
              { required: true, message: "Amount is required" },
              { type: "number", min: 0 },
            ]}
          >
            <Space.Compact style={{ width: "100%" }}>
              <InputNumber min={0} style={{ width: "100%" }} />
              <Button disabled>{currency}</Button>
            </Space.Compact>
          </Form.Item>
        ) : null}

        <Form.Item name="note" label="Note">
          <Input.TextArea rows={2} placeholder="Optional internal note" maxLength={500} />
        </Form.Item>
      </Form>

      {generate && resellerId && periodDays?.[0] && periodDays?.[1] ? (
        <Spin spinning={previewLoading}>
          {preview ? (
            <div className="mt-2">
              {preview.hasOverlap ? (
                <Alert
                  type="warning"
                  showIcon
                  className="mb-3"
                  title="Overlapping period"
                  description="Another payout already covers part of this period for this partner."
                />
              ) : null}
              <Descriptions column={2} size="small" bordered>
                <Descriptions.Item label="Orders">{preview.orderCount}</Descriptions.Item>
                <Descriptions.Item label="Line items">{preview.itemCount}</Descriptions.Item>
                <Descriptions.Item label="Gross sales" span={2}>
                  {formatMoney(preview.grossSales, preview.currency)}
                </Descriptions.Item>
                <Descriptions.Item label="Commission" span={2}>
                  <strong>{formatMoney(preview.commissionAmount, preview.currency)}</strong>
                </Descriptions.Item>
              </Descriptions>
              {preview.orderCount === 0 ? (
                <Paragraph type="secondary" style={{ fontSize: 12, marginTop: 12, marginBottom: 0 }}>
                  No paid sales found in this period. You can still create a zero-amount payout or
                  adjust the date range.
                </Paragraph>
              ) : null}
            </div>
          ) : null}
        </Spin>
      ) : null}
    </Drawer>
  );
};

export default PayoutFormDrawer;
