"use client";

import React, { useEffect } from "react";
import {
  Alert,
  Button,
  DatePicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Typography,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import type { SubscriptionRecord, SubscriptionUpdateFormValues } from "../types";
import { LICENSE_STATUS_OPTIONS } from "../constant";

const { TextArea } = Input;
const { Text } = Typography;

type FormShape = Omit<SubscriptionUpdateFormValues, "expiresAt"> & {
  expiresAt?: Dayjs | null;
};

type Props = {
  open: boolean;
  saving: boolean;
  license: SubscriptionRecord | null;
  onClose: () => void;
  onSubmit: (values: SubscriptionUpdateFormValues) => Promise<void>;
};

const EditSubscriptionDrawer: React.FC<Props> = ({
  open,
  saving,
  license,
  onClose,
  onSubmit,
}) => {
  const [form] = Form.useForm<FormShape>();

  useEffect(() => {
    if (!open || !license) return;
    form.setFieldsValue({
      stationLimit: license.stationLimit,
      status: license.status,
      expiresAt: license.expiresAt ? dayjs(license.expiresAt) : null,
      notes: license.notes ?? "",
      reason: "",
    });
  }, [open, license, form]);

  const handleFinish = async (values: FormShape) => {
    await onSubmit({
      stationLimit: values.stationLimit,
      status: values.status,
      expiresAt: values.expiresAt ? values.expiresAt.toISOString() : null,
      notes: values.notes?.trim() || undefined,
      reason: values.reason?.trim() || undefined,
    });
  };

  return (
    <Drawer
      title="Edit subscription"
      size={440}
      open={open}
      onClose={onClose}
      destroyOnHidden
    >
      {license ? (
        <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
          {license.org.name} ({license.org.code}) · {license.activeStationCount} active sites
        </Text>
      ) : null}

      {license?.isAtLimit ? (
        <Alert
          type="warning"
          showIcon
          className="mb-4"
          message="Tenant is at the licensed site limit"
        />
      ) : null}

      <Form form={form} layout="vertical" requiredMark="optional" onFinish={(v) => void handleFinish(v)}>
        <Form.Item
          name="stationLimit"
          label="Licensed site limit"
          rules={[
            { required: true, message: "Site limit is required" },
            {
              type: "number",
              min: license?.activeStationCount ?? 1,
              message: `Cannot be below current active sites (${license?.activeStationCount ?? 0})`,
            },
          ]}
        >
          <InputNumber min={1} max={100000} style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item name="status" label="Status" rules={[{ required: true }]}>
          <Select options={LICENSE_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
        </Form.Item>

        <Form.Item name="expiresAt" label="Expires at (optional)">
          <DatePicker style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item name="notes" label="Internal notes">
          <TextArea rows={3} maxLength={500} showCount placeholder="Billing or ops notes…" />
        </Form.Item>

        <Form.Item
          name="reason"
          label="Change reason"
          extra="Recorded in subscription changelog."
        >
          <TextArea rows={2} maxLength={500} placeholder="e.g. Contract renewal — limit increased" />
        </Form.Item>

        <Space className="flex justify-end pt-2">
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="primary" htmlType="submit" loading={saving}>
            Save changes
          </Button>
        </Space>
      </Form>
    </Drawer>
  );
};

export default EditSubscriptionDrawer;
