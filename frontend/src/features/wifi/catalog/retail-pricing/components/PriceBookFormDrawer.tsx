"use client";

import React from "react";
import { Button, Drawer, Form, Input, Radio, Select, Typography } from "antd";
import type {
  PriceBookFormValues,
  PriceBookRecord,
  PriceBookScope,
  RetailPricingFormOptions,
} from "../types";
import { SCOPE_OPTIONS } from "../constant";

const { Text, Paragraph } = Typography;

type Props = {
  open: boolean;
  saving?: boolean;
  editing: PriceBookRecord | null;
  formOptions: RetailPricingFormOptions;
  onClose: () => void;
  onCreate: (values: PriceBookFormValues) => Promise<void>;
  onUpdate: (id: string, values: PriceBookFormValues) => Promise<void>;
};

const PriceBookFormDrawer: React.FC<Props> = ({
  open,
  saving,
  editing,
  formOptions,
  onClose,
  onCreate,
  onUpdate,
}) => {
  const [form] = Form.useForm<PriceBookFormValues>();
  const scope = Form.useWatch("scope", form) as PriceBookScope | undefined;

  const initialValues: PriceBookFormValues = editing
    ? {
        name: editing.name,
        scope: editing.scope,
        resellerId: editing.resellerId,
        stationId: editing.stationId,
      }
    : {
        name: "",
        scope: "DEFAULT",
        resellerId: null,
        stationId: null,
      };

  const handleFinish = async (values: PriceBookFormValues) => {
    const payload: PriceBookFormValues = {
      name: values.name.trim(),
      scope: values.scope,
      resellerId: values.scope === "RESELLER" ? values.resellerId : null,
      stationId: values.scope === "STATION" ? values.stationId : null,
    };
    if (editing) {
      await onUpdate(editing.id, payload);
    } else {
      await onCreate(payload);
    }
  };

  return (
    <Drawer
      title={editing ? `Edit ${editing.name}` : "New price book"}
      size={480}
      open={open}
      onClose={onClose}
      destroyOnClose={false}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="primary" loading={saving} onClick={() => form.submit()}>
            {editing ? "Save changes" : "Create book"}
          </Button>
        </div>
      }
    >
      {open ? (
        <Form<PriceBookFormValues>
          form={form}
          layout="vertical"
          requiredMark="optional"
          initialValues={initialValues}
          key={editing?.id ?? "create"}
          onFinish={(v) => void handleFinish(v)}
        >
          <Paragraph type="secondary" style={{ marginBottom: 16, fontSize: 13 }}>
            Group retail and cost prices for service plans. Use a default book for the tenant, or
            override prices per reseller or site.
          </Paragraph>

          <Form.Item
            name="name"
            label="Book name"
            rules={[{ required: true, message: "Name is required" }, { min: 2 }]}
          >
            <Input placeholder="Standard retail" />
          </Form.Item>

          <Form.Item name="scope" label="Scope" rules={[{ required: true }]}>
            <Radio.Group>
              {SCOPE_OPTIONS.map((opt) => (
                <Radio key={opt.value} value={opt.value} style={{ display: "block", marginBottom: 8 }}>
                  <Text strong>{opt.label}</Text>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {opt.description}
                    </Text>
                  </div>
                </Radio>
              ))}
            </Radio.Group>
          </Form.Item>

          {scope === "RESELLER" ? (
            <Form.Item
              name="resellerId"
              label="Reseller"
              rules={[{ required: true, message: "Select a reseller" }]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                placeholder="Choose partner"
                options={formOptions.resellers.map((r) => ({
                  value: r.id,
                  label: `${r.name} (${r.code})`,
                }))}
              />
            </Form.Item>
          ) : null}

          {scope === "STATION" ? (
            <Form.Item
              name="stationId"
              label="Site"
              rules={[{ required: true, message: "Select a site" }]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                placeholder="Choose site"
                options={formOptions.stations.map((s) => ({
                  value: s.id,
                  label: `${s.name} (${s.code})`,
                }))}
              />
            </Form.Item>
          ) : null}
        </Form>
      ) : null}
    </Drawer>
  );
};

export default PriceBookFormDrawer;
