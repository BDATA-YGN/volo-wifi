"use client";

import React, { useEffect } from "react";
import { Alert, Button, DatePicker, Drawer, Form, Input, InputNumber, Select, Space, Typography } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import type { InvoiceDetail, RecordPaymentFormValues } from "../types";
import { PAYMENT_METHOD_OPTIONS } from "../constant";
import { formatMoney } from "../../tier-rates/platform/utils";

const { TextArea } = Input;
const { Text } = Typography;

type FormShape = Omit<RecordPaymentFormValues, "paymentDate"> & {
  paymentDate?: Dayjs;
};

type Props = {
  open: boolean;
  saving: boolean;
  invoice: InvoiceDetail | null;
  onClose: () => void;
  onSubmit: (values: RecordPaymentFormValues) => Promise<void>;
};

const RecordPaymentDrawer: React.FC<Props> = ({
  open,
  saving,
  invoice,
  onClose,
  onSubmit,
}) => {
  const [form] = Form.useForm<FormShape>();

  useEffect(() => {
    if (!open || !invoice) return;
    form.resetFields();
    form.setFieldsValue({
      amount: Number(invoice.balanceDue) > 0 ? Number(invoice.balanceDue) : undefined,
      paymentMethod: "BANK_TRANSFER",
      paymentDate: dayjs(),
      refNo: "",
      note: "",
    });
  }, [open, invoice, form]);

  const handleFinish = async (values: FormShape) => {
    await onSubmit({
      amount: values.amount,
      paymentMethod: values.paymentMethod,
      paymentDate: values.paymentDate?.toISOString(),
      refNo: values.refNo?.trim() || undefined,
      note: values.note?.trim() || undefined,
    });
  };

  return (
    <Drawer title="Record payment" size={420} open={open} onClose={onClose} destroyOnHidden>
      {invoice ? (
        <>
          <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
            {invoice.invoiceNo} · {invoice.org.name}
          </Text>
          <Alert
            type="info"
            showIcon
            className="mb-4"
            message={`Balance due: ${formatMoney(invoice.balanceDue, invoice.currency)}`}
          />
        </>
      ) : null}

      <Form form={form} layout="vertical" requiredMark="optional" onFinish={(v) => void handleFinish(v)}>
        <Form.Item
          name="amount"
          label="Amount"
          rules={[{ required: true, message: "Amount is required" }]}
        >
          <InputNumber min={0.01} step={1000} style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item
          name="paymentMethod"
          label="Payment method"
          rules={[{ required: true }]}
        >
          <Select options={PAYMENT_METHOD_OPTIONS} />
        </Form.Item>

        <Form.Item name="paymentDate" label="Payment date">
          <DatePicker style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item name="refNo" label="Reference no.">
          <Input maxLength={100} placeholder="Transaction / receipt reference" />
        </Form.Item>

        <Form.Item name="note" label="Note">
          <TextArea rows={2} maxLength={500} />
        </Form.Item>

        <Space className="flex justify-end pt-2">
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="primary" htmlType="submit" loading={saving}>
            Record payment
          </Button>
        </Space>
      </Form>
    </Drawer>
  );
};

export default RecordPaymentDrawer;
