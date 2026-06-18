"use client";

import React, { useEffect } from "react";
import { Alert, Form, Input, Modal } from "antd";

import {
  BROADCAST_TITLE_MAX_LENGTH,
  MESSAGE_MAX_LENGTH,
} from "../constant";
import type { StartBroadcastPayload } from "../interface";

const { TextArea } = Input;

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: StartBroadcastPayload) => Promise<void>;
  submitting?: boolean;
}

const NewBroadcastDialog: React.FC<Props> = ({
  open,
  onClose,
  onSubmit,
  submitting,
}) => {
  const [form] = Form.useForm<StartBroadcastPayload>();

  useEffect(() => {
    if (!open) form.resetFields();
  }, [open, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      await onSubmit({
        title: values.title?.trim() || undefined,
        message: values.message.trim(),
      });
      onClose();
    } catch {
      // antd surfaces validation errors inline; ignore the throw here.
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      okText="Send broadcast"
      title="New broadcast"
      destroyOnHidden
      confirmLoading={submitting}
    >
      <Alert
        type="warning"
        showIcon
        title="This will be delivered to every active admin."
        description="Use broadcasts for system-wide announcements only."
        style={{ marginBottom: 16 }}
      />

      <Form form={form} layout="vertical">
        <Form.Item
          name="title"
          label="Title (optional)"
          rules={[
            {
              max: BROADCAST_TITLE_MAX_LENGTH,
              message: `Title must be ${BROADCAST_TITLE_MAX_LENGTH} characters or fewer`,
            },
          ]}
        >
          <Input
            placeholder="e.g. Server maintenance window"
            maxLength={BROADCAST_TITLE_MAX_LENGTH}
            showCount
          />
        </Form.Item>

        <Form.Item
          name="message"
          label="Message"
          rules={[
            { required: true, message: "Message is required" },
            {
              max: MESSAGE_MAX_LENGTH,
              message: `Message must be ${MESSAGE_MAX_LENGTH} characters or fewer`,
            },
          ]}
        >
          <TextArea
            rows={5}
            placeholder="Write your announcement…"
            maxLength={MESSAGE_MAX_LENGTH}
            showCount
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default NewBroadcastDialog;
