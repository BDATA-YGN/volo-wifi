"use client";

import React, { useEffect, useState } from "react";
import {
  Button,
  Divider,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Tabs,
  Typography,
} from "antd";
import type {
  CatalogAttributeOption,
  PlanPoliciesFormOptions,
  PlanPolicyFormValues,
  PlanPolicyRecord,
  PolicyPlan,
  PolicyStation,
} from "../types";
import {
  OP_OPTIONS,
  PHASE_FORM_OPTIONS,
  VALUE_TEMPLATES,
  VALUE_TYPE_OPTIONS,
} from "../constant";

const { TextArea } = Input;
const { Text } = Typography;

type Props = {
  open: boolean;
  saving: boolean;
  editing: PlanPolicyRecord | null;
  formOptions: PlanPoliciesFormOptions;
  lockedOrgId?: string;
  loadOptions: (orgId: string) => Promise<PlanPoliciesFormOptions>;
  onClose: () => void;
  onSubmit: (values: PlanPolicyFormValues) => Promise<void>;
};

const PlanPolicyFormDrawer: React.FC<Props> = ({
  open,
  saving,
  editing,
  formOptions,
  lockedOrgId,
  loadOptions,
  onClose,
  onSubmit,
}) => {
  const [form] = Form.useForm<PlanPolicyFormValues>();
  const [plans, setPlans] = useState<PolicyPlan[]>(formOptions.plans);
  const [stations, setStations] = useState<PolicyStation[]>(formOptions.stations);
  const orgId = Form.useWatch("orgId", form);

  useEffect(() => {
    if (!open) return;

    if (editing) {
      form.setFieldsValue({
        orgId: editing.orgId,
        planId: editing.planId,
        vendorProfileId: editing.vendorProfileId,
        wifiStationId: editing.wifiStationId ?? undefined,
        phase: editing.phase,
        attributeName: editing.attributeName,
        op: editing.op,
        valueType: editing.valueType,
        value: editing.value,
        priority: editing.priority,
        note: editing.note ?? "",
      });
      void loadOptions(editing.orgId).then((opts) => {
        setPlans(opts.plans);
        setStations(opts.stations);
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        orgId: lockedOrgId,
        phase: "REPLY",
        op: ":=",
        valueType: "STRING",
        priority: 100,
      });
      setPlans([]);
      setStations([]);
      if (lockedOrgId) {
        void loadOptions(lockedOrgId).then((opts) => {
          setPlans(opts.plans);
          setStations(opts.stations);
        });
      }
    }
  }, [open, editing, form, loadOptions, lockedOrgId]);

  useEffect(() => {
    if (!open || !orgId) return;
    void loadOptions(orgId).then((opts) => {
      setPlans(opts.plans);
      setStations(opts.stations);
    });
  }, [orgId, open, loadOptions]);

  const handleOrgChange = (value: string) => {
    form.setFieldsValue({ planId: undefined, wifiStationId: undefined });
    if (value) void loadOptions(value).then((opts) => {
      setPlans(opts.plans);
      setStations(opts.stations);
    });
  };

  const applyCatalogAttribute = (attr: CatalogAttributeOption) => {
    form.setFieldsValue({
      attributeName: attr.freeradiusName,
      op: attr.op,
      valueType: attr.valueType as PlanPolicyFormValues["valueType"],
      value: attr.defaultValue ?? "",
    });
  };

  const scopeTab = (
    <>
      {lockedOrgId ? (
        <Form.Item name="orgId" hidden>
          <Input />
        </Form.Item>
      ) : (
        <Form.Item name="orgId" label="Tenant" rules={[{ required: true }]}>
          <Select
            showSearch
            disabled={Boolean(editing)}
            placeholder="Select tenant"
            onChange={handleOrgChange}
            optionFilterProp="label"
            options={formOptions.orgs.map((o) => ({
              value: o.id,
              label: `${o.code} — ${o.name}`,
            }))}
          />
        </Form.Item>
      )}

      <Form.Item name="planId" label="WiFi plan" rules={[{ required: true }]}>
        <Select
          showSearch
          placeholder="Select plan"
          optionFilterProp="label"
          options={plans.map((p) => ({
            value: p.id,
            label: `${p.code} — ${p.name}`,
          }))}
        />
      </Form.Item>

      <Form.Item name="vendorProfileId" label="Vendor profile" rules={[{ required: true }]}>
        <Select
          showSearch
          placeholder="NAS vendor capability set"
          optionFilterProp="label"
          options={formOptions.vendorProfiles.map((v) => ({
            value: v.id,
            label: `${v.name} (${v.vendor})`,
          }))}
        />
      </Form.Item>

      <Form.Item
        name="wifiStationId"
        label="Site scope (optional)"
        extra="Leave empty for plan-wide rule; set a site for per-location override."
      >
        <Select
          allowClear
          showSearch
          placeholder="All sites (plan default)"
          optionFilterProp="label"
          options={stations.map((s) => ({
            value: s.id,
            label: `${s.code} — ${s.name}`,
          }))}
        />
      </Form.Item>
    </>
  );

  const attributeTab = (
    <>
      <Form.Item label="From catalog">
        <Select
          showSearch
          allowClear
          placeholder="Pick attribute to pre-fill…"
          value={null}
          onChange={(id) => {
            const attr = formOptions.catalogAttributes.find((a) => a.id === id);
            if (attr) applyCatalogAttribute(attr);
          }}
          optionFilterProp="label"
          options={formOptions.catalogAttributes.map((a) => ({
            value: a.id,
            label: `${a.freeradiusName} — ${a.displayName}`,
          }))}
        />
      </Form.Item>

      <Form.Item name="phase" label="Phase" rules={[{ required: true }]}>
        <Select options={PHASE_FORM_OPTIONS} />
      </Form.Item>

      <Form.Item
        name="attributeName"
        label="Attribute name"
        rules={[{ required: true, message: "Attribute name is required" }]}
      >
        <Input placeholder="Session-Timeout" />
      </Form.Item>

      <div className="grid grid-cols-2 gap-3">
        <Form.Item name="op" label="Operator" rules={[{ required: true }]}>
          <Select options={OP_OPTIONS} />
        </Form.Item>
        <Form.Item name="valueType" label="Value type" rules={[{ required: true }]}>
          <Select options={VALUE_TYPE_OPTIONS} />
        </Form.Item>
      </div>

      <Form.Item
        name="value"
        label="Value"
        rules={[{ required: true, message: "Value is required" }]}
        extra="Use templates like {timeSeconds} for dynamic policy rendering"
      >
        <Input placeholder="3600 or {timeSeconds}" />
      </Form.Item>

      <div className="mb-3 flex flex-wrap gap-2">
        {VALUE_TEMPLATES.map((t) => (
          <Button key={t.value} size="small" onClick={() => form.setFieldValue("value", t.value)}>
            {t.label}
          </Button>
        ))}
      </div>

      <Form.Item name="priority" label="Priority" extra="Lower numbers are applied first">
        <InputNumber min={0} max={9999} style={{ width: "100%" }} />
      </Form.Item>

      <Form.Item name="note" label="Notes">
        <TextArea rows={2} maxLength={1000} />
      </Form.Item>
    </>
  );

  return (
    <Drawer
      title={editing ? "Edit plan RADIUS rule" : "Add plan RADIUS rule"}
      size={560}
      open={open}
      onClose={onClose}
      destroyOnHidden
    >
      <Text type="secondary" style={{ display: "block", marginBottom: 16, fontSize: 13 }}>
        Define per-plan RADIUS reply attributes returned on Access-Accept, scoped by vendor profile
        and optionally by WiFi site.
      </Text>

      <Form form={form} layout="vertical" requiredMark="optional" onFinish={(v) => void onSubmit(v)}>
        <Tabs
          items={[
            { key: "scope", label: "Scope", children: scopeTab },
            { key: "attribute", label: "Attribute", children: attributeTab },
          ]}
        />

        <Divider style={{ margin: "16px 0" }} />

        <Space className="flex justify-end">
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="primary" htmlType="submit" loading={saving}>
            {editing ? "Save changes" : "Add rule"}
          </Button>
        </Space>
      </Form>
    </Drawer>
  );
};

export default PlanPolicyFormDrawer;
