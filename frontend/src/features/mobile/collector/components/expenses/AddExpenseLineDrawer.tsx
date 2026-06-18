"use client";

import { useMemo, useState } from "react";
import { App, Button, DatePicker, Drawer, Form, Input, InputNumber, Select } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import ExpenseReceiptUpload from "./ExpenseReceiptUpload";
import type { ExpenseAccountCode } from "../../expenses/interface";
import { getDefaultCurrencySuffix } from "@/common/utils/formatCurrency";
import { safeAddCollectorExpenseLine } from "../../expenses/query";

interface AddLineForm {
  accountCodeId: string;
  title?: string;
  amount: number;
  occurredAt?: Dayjs;
  receiptUrl?: string;
  note?: string;
}

interface AddExpenseLineDrawerProps {
  open: boolean;
  claimId: string;
  accountCodes: ExpenseAccountCode[];
  loadingCodes?: boolean;
  onClose: () => void;
  onAdded: () => void;
}

export default function AddExpenseLineDrawer({
  open,
  claimId,
  accountCodes,
  loadingCodes,
  onClose,
  onAdded,
}: AddExpenseLineDrawerProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm<AddLineForm>();
  const [submitting, setSubmitting] = useState(false);

  const accountOptions = useMemo(
    () =>
      accountCodes.map((code) => ({
        value: code.id,
        label: `${code.code} — ${code.name}`,
      })),
    [accountCodes],
  );

  const handleClose = () => {
    form.resetFields();
    onClose();
  };

  const onFinish = async (values: AddLineForm) => {
    setSubmitting(true);
    try {
      const result = await safeAddCollectorExpenseLine(claimId, {
        accountCodeId: values.accountCodeId,
        title: values.title?.trim() || null,
        amount: Math.floor(values.amount),
        occurredAt: values.occurredAt ? values.occurredAt.toISOString() : null,
        receiptUrl: values.receiptUrl ?? null,
        note: values.note?.trim() || null,
      });

      if (!result.success) {
        throw new Error(result.error?.message ?? "Failed to add line");
      }

      message.success("Expense line added");
      handleClose();
      onAdded();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Failed to add line");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      title="Add expense line"
      placement="bottom"
      size="auto"
      open={open}
      onClose={handleClose}
      destroyOnHidden
      styles={{
        body: {
          paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0))",
          maxHeight: "85vh",
          overflowY: "auto",
        },
      }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        requiredMark="optional"
        initialValues={{ occurredAt: dayjs() }}
      >
        <Form.Item
          label="Account code"
          name="accountCodeId"
          rules={[{ required: true, message: "Select an account code" }]}
        >
          <Select
            showSearch
            size="large"
            placeholder="Select expense code"
            options={accountOptions}
            loading={loadingCodes}
            optionFilterProp="label"
          />
        </Form.Item>

        <Form.Item label="Description" name="title">
          <Input placeholder="e.g. Fuel, toll, meal" size="large" maxLength={200} />
        </Form.Item>

        <Form.Item
          label={`Amount (${getDefaultCurrencySuffix()})`}
          name="amount"
          rules={[
            { required: true, message: "Enter amount" },
            { type: "number", min: 1, message: "Amount must be at least 1" },
          ]}
        >
          <InputNumber
            size="large"
            style={{ width: "100%" }}
            min={1}
            step={1000}
            formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
            parser={(v) => Number(String(v ?? "").replace(/,/g, "")) as unknown as 1}
          />
        </Form.Item>

        <Form.Item label="Date" name="occurredAt">
          <DatePicker size="large" style={{ width: "100%" }} format="D MMM YYYY" />
        </Form.Item>

        <Form.Item label="Receipt" name="receiptUrl">
          <ExpenseReceiptUpload />
        </Form.Item>

        <Form.Item label="Note (optional)" name="note">
          <Input.TextArea rows={2} maxLength={2000} placeholder="Additional details" />
        </Form.Item>

        <Button
          type="primary"
          htmlType="submit"
          block
          size="large"
          loading={submitting}
        >
          Add line
        </Button>
      </Form>
    </Drawer>
  );
}
