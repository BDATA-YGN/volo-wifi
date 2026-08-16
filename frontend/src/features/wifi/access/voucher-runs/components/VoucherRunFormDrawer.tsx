"use client";

import React, { useMemo } from "react";
import {
  Alert,
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Table,
  Typography,
} from "antd";
import { useRequest } from "ahooks";
import type { ColumnsType } from "antd/es/table";
import { useDrawerFormSync } from "@/features/wifi/shared/hooks";
import * as Query from "../query";
import type { SitePlanBalanceRow, VoucherRunFormValues, VoucherRunsFormOptions } from "../types";
import {
  BATCH_NO_PATTERN,
  MAX_BATCH_QUANTITY,
  MIN_BATCH_QUANTITY,
} from "../constant";

const { TextArea } = Input;
const { Paragraph, Text } = Typography;

function withOrgLabel(name: string, code: string, orgCode?: string | null) {
  const base = `${name} (${code})`;
  return orgCode ? `${base} · ${orgCode}` : base;
}

type Props = {
  open: boolean;
  saving?: boolean;
  orgId?: string;
  formOptions: VoucherRunsFormOptions;
  showOrgInLabels?: boolean;
  onClose: () => void;
  onSubmit: (values: VoucherRunFormValues) => Promise<void>;
};

const VoucherRunFormDrawer: React.FC<Props> = ({
  open,
  saving,
  orgId,
  formOptions,
  showOrgInLabels,
  onClose,
  onSubmit,
}) => {
  const [form] = Form.useForm<VoucherRunFormValues>();
  const stationId = Form.useWatch("stationId", form);
  const planId = Form.useWatch("planId", form);

  const formValues: VoucherRunFormValues = {
    planId: "",
    quantity: 10,
    stationId: "",
  };
  useDrawerFormSync(form, open, formValues, "create-run");

  const selectedStation = formOptions.stations.find((s) => s.id === stationId);
  const plansForSite = useMemo(() => {
    if (!selectedStation?.orgId) return formOptions.plans;
    return formOptions.plans.filter((p) => p.orgId === selectedStation.orgId);
  }, [formOptions.plans, selectedStation?.orgId]);

  const {
    data: balanceRes,
    loading: balanceLoading,
    error: balanceError,
  } = useRequest(() => Query.loadSiteBalance(stationId, orgId ?? selectedStation?.orgId), {
    ready: Boolean(open && stationId),
    refreshDeps: [open, stationId, orgId, selectedStation?.orgId],
  });
  const balanceRows = balanceRes?.data?.plans ?? [];

  const selectedBalance = balanceRows.find((row) => row.planId === planId);

  const columns: ColumnsType<SitePlanBalanceRow> = [
    {
      title: "Plan",
      key: "plan",
      render: (_, row) => (
        <div>
          <Text strong={row.planId === planId}>{row.name}</Text>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {row.code}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: "Remaining",
      key: "remaining",
      align: "right",
      width: 120,
      sorter: (a, b) => a.remaining - b.remaining,
      defaultSortOrder: "ascend",
      render: (_, row) => (
        <Text strong type={row.remaining <= 0 ? "danger" : row.remaining < 20 ? "warning" : undefined}>
          {row.remaining.toLocaleString()}
        </Text>
      ),
    },
    {
      title: "Runs",
      key: "runCount",
      align: "right",
      width: 88,
      sorter: (a, b) => a.runCount - b.runCount,
      render: (_, row) => (
        <Text type={row.runCount <= 0 ? "secondary" : undefined}>
          {row.runCount.toLocaleString()}
        </Text>
      ),
    },
  ];

  return (
    <Drawer
      title="New voucher run"
      size={560}
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
            Pick a site first. Remaining tokens by plan appear below so you can see what still
            needs stock. Then choose a plan and add a new run. Codes are created later when
            partners sell via Access Tokens.
          </Paragraph>

          <Form.Item
            name="stationId"
            label="Site"
            rules={[{ required: true, message: "Select a site" }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Select site"
              onChange={() => form.setFieldValue("planId", undefined)}
              options={formOptions.stations.map((s) => ({
                value: s.id,
                label: withOrgLabel(s.name, s.code, showOrgInLabels ? s.org?.code : null),
              }))}
            />
          </Form.Item>

          {stationId ? (
            <div className="mb-4">
              <div className="mb-2">
                <Text strong>Remaining by plan</Text>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Click a plan to use it for the new run. Runs is how many voucher batches still
                    have leftover tokens.
                  </Text>
                </div>
              </div>
              {balanceError ? (
                <Alert
                  type="error"
                  showIcon
                  className="mb-2"
                  title="Could not load remaining balance"
                  description={String(balanceError)}
                />
              ) : null}
              <Table<SitePlanBalanceRow>
                size="small"
                rowKey="planId"
                loading={balanceLoading}
                columns={columns}
                dataSource={balanceRows}
                pagination={false}
                locale={{ emptyText: "No active plans for this site’s tenant" }}
                rowClassName={(row) => (row.planId === planId ? "ant-table-row-selected" : "")}
                onRow={(row) => ({
                  onClick: () => form.setFieldValue("planId", row.planId),
                  style: { cursor: "pointer" },
                })}
              />
            </div>
          ) : (
            <Alert
              type="info"
              showIcon
              className="mb-4"
              title="Select a site"
              description="Remaining voucher stock by plan will show here after you pick a site."
            />
          )}

          <Form.Item
            name="planId"
            label="Service plan"
            rules={[{ required: true, message: "Select a plan" }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              placeholder={stationId ? "Select plan" : "Select a site first"}
              disabled={!stationId}
              options={plansForSite.map((p) => ({
                value: p.id,
                label: withOrgLabel(p.name, p.code, showOrgInLabels ? p.org?.code : null),
              }))}
            />
          </Form.Item>

          {selectedBalance ? (
            <Alert
              type={selectedBalance.remaining <= 0 ? "warning" : "success"}
              showIcon
              className="mb-4"
              title={
                selectedBalance.remaining <= 0
                  ? `${selectedBalance.name} has no remaining tokens at this site`
                  : `${selectedBalance.remaining.toLocaleString()} tokens left for ${selectedBalance.name}`
              }
              description={
                selectedBalance.remaining <= 0
                  ? "Create a run to add stock before partners can sell this plan here."
                  : "Add more only if you want extra capacity beyond what is already available."
              }
            />
          ) : null}

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
                <InputNumber
                  min={MIN_BATCH_QUANTITY}
                  max={MAX_BATCH_QUANTITY}
                  style={{ width: "100%" }}
                />
              </Form.Item>
              <Button disabled>vouchers</Button>
            </Space.Compact>
            <Text type="secondary" style={{ fontSize: 12 }}>
              1–{MAX_BATCH_QUANTITY.toLocaleString()} vouchers
            </Text>
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
