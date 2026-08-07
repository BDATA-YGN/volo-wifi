"use client";

import React from "react";
import {
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Typography,
} from "antd";
import type { VoucherRunFormValues, VoucherRunsFormOptions } from "../types";
import {
  BATCH_NO_PATTERN,
  MAX_BATCH_QUANTITY,
  MIN_BATCH_QUANTITY,
} from "../constant";
import { useDrawerFormSync } from "@/features/wifi/shared/hooks";

const { TextArea } = Input;
const { Paragraph } = Typography;

function withOrgLabel(name: string, code: string, orgCode?: string | null) {
  const base = `${name} (${code})`;
  return orgCode ? `${base} · ${orgCode}` : base;
}

type Props = {
  open: boolean;
  saving?: boolean;
  formOptions: VoucherRunsFormOptions;
  showOrgInLabels?: boolean;
  onClose: () => void;
  onSubmit: (values: VoucherRunFormValues) => Promise<void>;
};

const VoucherRunFormDrawer: React.FC<Props> = ({
  open,
  saving,
  formOptions,
  showOrgInLabels,
  onClose,
  onSubmit,
}) => {
  const [form] = Form.useForm<VoucherRunFormValues>();
  const requireSite = Boolean(showOrgInLabels);

  const formValues: VoucherRunFormValues = {
    planId: formOptions.plans[0]?.id ?? "",
    quantity: 10,
    stationId: null,
  };
  useDrawerFormSync(form, open, formValues, "create-run");

  return (
    <Drawer
      title="New voucher run"
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
            Create run
          </Button>
        </div>
      }
    >
      {open ? (
        <Form<VoucherRunFormValues>
          form={form}
          layout="vertical"
          requiredMark="optional"
          key="create-run"
          onFinish={(v) => void onSubmit(v)}
        >
          <Paragraph type="secondary" style={{ marginBottom: 16, fontSize: 13 }}>
            Reserve prepaid voucher capacity for a service plan. Six-character codes are generated
            when partners sell via Access Tokens — nothing is pre-issued here.
            {requireSite
              ? " Pick a site so the run is created under the correct tenant."
              : null}
          </Paragraph>

          <Form.Item
            name="planId"
            label="Service plan"
            rules={[{ required: true, message: "Select a plan" }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={formOptions.plans.map((p) => ({
                value: p.id,
                label: withOrgLabel(
                  p.name,
                  p.code,
                  showOrgInLabels ? p.org?.code : null
                ),
              }))}
            />
          </Form.Item>

          <Form.Item label="Quantity" required>
            <Space.Compact block>
              <Form.Item
                name="quantity"
                noStyle
                rules={[
                  { required: true, message: "Quantity is required" },
                  {
                    type: "number",
                    min: MIN_BATCH_QUANTITY,
                    max: MAX_BATCH_QUANTITY,
                  },
                ]}
              >
                <InputNumber min={MIN_BATCH_QUANTITY} max={MAX_BATCH_QUANTITY} style={{ width: "100%" }} />
              </Form.Item>
              <Button disabled>vouchers</Button>
            </Space.Compact>
          </Form.Item>

          <Form.Item
            name="stationId"
            label={requireSite ? "Site" : "Default site (optional)"}
            rules={
              requireSite ? [{ required: true, message: "Select a site" }] : undefined
            }
          >
            <Select
              allowClear={!requireSite}
              showSearch
              optionFilterProp="label"
              placeholder={requireSite ? "Select site" : "Any site"}
              options={formOptions.stations.map((s) => ({
                value: s.id,
                label: withOrgLabel(
                  s.name,
                  s.code,
                  showOrgInLabels ? s.org?.code : null
                ),
              }))}
            />
          </Form.Item>

          <Form.Item
            name="batchNo"
            label="Batch number"
            extra="Leave blank to auto-generate (e.g. VR-20260611-A1B2)"
            rules={[{ pattern: BATCH_NO_PATTERN, message: "Invalid batch number format" }]}
          >
            <Input
              placeholder="Auto"
              onChange={(e) =>
                form.setFieldValue(
                  "batchNo",
                  e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "")
                )
              }
            />
          </Form.Item>

          <Form.Item name="note" label="Internal note">
            <TextArea rows={2} placeholder="e.g. Event handout June 2026" />
          </Form.Item>
        </Form>
      ) : null}
    </Drawer>
  );
};

export default VoucherRunFormDrawer;
