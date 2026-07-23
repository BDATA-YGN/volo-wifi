"use client";

import React, { useMemo } from "react";
import { Button, Drawer, Form, Input, Radio, Transfer, Typography } from "antd";
import type { TransferProps } from "antd";
import type {
  PriceBookFormValues,
  PriceBookRecord,
  PriceBookScope,
  RetailPricingFormOptions,
} from "../types";
import { SCOPE_OPTIONS } from "../constant";
import { useDrawerFormSync } from "@/features/wifi/shared/hooks";

const { Text, Paragraph } = Typography;

type TransferItem = {
  key: string;
  title: string;
  description?: string;
};

type IdsTransferProps = {
  value?: string[];
  onChange?: (next: string[]) => void;
  dataSource: TransferItem[];
  titles: [string, string];
  disabled?: boolean;
};

const IdsTransfer: React.FC<IdsTransferProps> = ({
  value,
  onChange,
  dataSource,
  titles,
  disabled,
}) => {
  const handleChange: TransferProps["onChange"] = (nextTargetKeys) => {
    onChange?.(nextTargetKeys.map(String));
  };

  return (
    <Transfer
      dataSource={dataSource}
      titles={titles}
      targetKeys={value ?? []}
      onChange={handleChange}
      render={(item) => item.title}
      showSearch
      disabled={disabled}
      filterOption={(input, item) =>
        (item.title ?? "").toLowerCase().includes(input.toLowerCase()) ||
        (item.description ?? "").toLowerCase().includes(input.toLowerCase())
      }
      listStyle={{ width: 280, height: 320 }}
      oneWay={false}
    />
  );
};

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

  const resellerTransferData: TransferItem[] = useMemo(() => {
    const byId = new Map(formOptions.resellers.map((r) => [r.id, r]));
    for (const r of editing?.resellers ?? []) byId.set(r.id, r);
    return [...byId.values()].map((r) => ({
      key: r.id,
      title: `${r.name} (${r.code})`,
      description: r.code,
    }));
  }, [formOptions.resellers, editing]);

  const stationTransferData: TransferItem[] = useMemo(() => {
    const byId = new Map(formOptions.stations.map((s) => [s.id, s]));
    for (const s of editing?.stations ?? []) byId.set(s.id, s);
    return [...byId.values()].map((s) => ({
      key: s.id,
      title: `${s.name} (${s.code})`,
      description: s.code,
    }));
  }, [formOptions.stations, editing]);

  const formValues: PriceBookFormValues = editing
    ? {
        name: editing.name,
        scope: editing.scope,
        resellerIds: editing.resellerIds ?? editing.resellers?.map((r) => r.id) ?? [],
        stationIds: editing.stationIds ?? editing.stations?.map((s) => s.id) ?? [],
      }
    : {
        name: "",
        scope: "DEFAULT",
        resellerIds: [],
        stationIds: [],
      };
  useDrawerFormSync(form, open, formValues, editing?.id ?? "create");

  const handleFinish = async (values: PriceBookFormValues) => {
    const payload: PriceBookFormValues = {
      name: values.name.trim(),
      scope: values.scope,
      resellerIds: values.scope === "RESELLER" ? values.resellerIds ?? [] : [],
      stationIds: values.scope === "STATION" ? values.stationIds ?? [] : [],
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
      size={720}
      open={open}
      onClose={onClose}
      destroyOnHidden
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
          key={editing?.id ?? "create"}
          onFinish={(v) => void handleFinish(v)}
        >
          <Paragraph type="secondary" style={{ marginBottom: 16, fontSize: 13 }}>
            Group retail and cost prices for service plans. Use a default book for the tenant, or
            override prices for one or more resellers or sites.
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
              name="resellerIds"
              label="Resellers"
              extra="Move partners from Available → Selected."
              rules={[
                {
                  validator: async (_, value: string[] | undefined) => {
                    if (!value?.length) throw new Error("Select one or more resellers");
                  },
                },
              ]}
            >
              <IdsTransfer
                dataSource={resellerTransferData}
                titles={["Available partners", "Selected partners"]}
              />
            </Form.Item>
          ) : null}

          {scope === "STATION" ? (
            <Form.Item
              name="stationIds"
              label="Sites"
              extra="Move sites from Available → Selected."
              rules={[
                {
                  validator: async (_, value: string[] | undefined) => {
                    if (!value?.length) throw new Error("Select one or more sites");
                  },
                },
              ]}
            >
              <IdsTransfer
                dataSource={stationTransferData}
                titles={["Available sites", "Selected sites"]}
              />
            </Form.Item>
          ) : null}
        </Form>
      ) : null}
    </Drawer>
  );
};

export default PriceBookFormDrawer;
