"use client";

import { useState } from "react";
import { App, Button, Drawer, Form, Input } from "antd";
import { getDefaultCurrencyCode } from "@/common/utils/formatCurrency";
import {
  MobileDrawerBody,
  mobileDrawerStyleProps,
  useMobileDrawerChrome,
} from "@/features/mobile/shared/components/MobileDrawerChrome";
import { safeCreateCollectorExpense } from "../../expenses/query";
import styles from "./expenses.module.css";

interface CreateExpenseForm {
  title: string;
  note?: string;
}

interface CreateExpenseDrawerProps {
  open: boolean;
  onClose: () => void;
  onCreated: (claimId: string) => void;
}

export default function CreateExpenseDrawer({
  open,
  onClose,
  onCreated,
}: CreateExpenseDrawerProps) {
  const { message } = App.useApp();
  const { colorScheme } = useMobileDrawerChrome("collector");
  const [form] = Form.useForm<CreateExpenseForm>();
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    form.resetFields();
    onClose();
  };

  const onFinish = async (values: CreateExpenseForm) => {
    setSubmitting(true);
    try {
      const result = await safeCreateCollectorExpense({
        title: values.title.trim(),
        note: values.note?.trim() || null,
        currency: getDefaultCurrencyCode(),
      });

      if (!result.success || !result.data) {
        throw new Error(result.error?.message ?? "Failed to create claim");
      }

      message.success("Draft expense claim created");
      handleClose();
      onCreated(result.data.id);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Failed to create claim");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      title="New expense claim"
      placement="bottom"
      size="auto"
      open={open}
      onClose={handleClose}
      destroyOnHidden
      styles={mobileDrawerStyleProps(colorScheme, {
        body: { paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0))" },
      })}
    >
      <MobileDrawerBody actor="collector">
      <p className={styles.drawerIntro}>
        Create a draft trip or day claim, then add expense lines with receipts.
      </p>

      <Form form={form} layout="vertical" onFinish={onFinish} requiredMark="optional">
        <Form.Item
          label="Title"
          name="title"
          rules={[{ required: true, message: "Give this claim a title" }]}
        >
          <Input placeholder="e.g. Kyauktaw trip 5 Jun" size="large" maxLength={200} />
        </Form.Item>

        <Form.Item label="Note (optional)" name="note">
          <Input.TextArea
            placeholder="Purpose, route, or other context"
            rows={3}
            maxLength={2000}
          />
        </Form.Item>

        <Button
          type="primary"
          htmlType="submit"
          block
          size="large"
          loading={submitting}
        >
          Create draft
        </Button>
      </Form>
      </MobileDrawerBody>
    </Drawer>
  );
}
