"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  App,
  Button,
  Descriptions,
  Divider,
  Drawer,
  Form,
  Input,
  Select,
  Space,
  Tabs,
  Tag,
  Transfer,
  Typography,
} from "antd";
import type { TransferProps } from "antd";
import type {
  PlanPoliciesFormOptions,
  PlanPolicyAttributeInput,
  PlanPolicyFormValues,
  PlanPolicyGroupRecord,
  PolicyPlan,
  PolicyStation,
  PolicyVendorProfile,
} from "../types";
import { useDrawerFormSync } from "@/features/wifi/shared/hooks";
import { buildAttributesFromVendorTemplate } from "../constant";
import PolicyAttributesEditor from "./PolicyAttributesEditor";
import PlanPolicyPlanSummary from "./PlanPolicyPlanSummary";

const { Text } = Typography;

type StationTransferItem = {
  key: string;
  title: string;
  description: string;
};

type Props = {
  open: boolean;
  saving: boolean;
  editing: PlanPolicyGroupRecord | null;
  formOptions: PlanPoliciesFormOptions;
  lockedOrgId?: string;
  loadOptions: (orgId: string) => Promise<PlanPoliciesFormOptions>;
  onClose: () => void;
  onSubmit: (values: PlanPolicyFormValues) => Promise<void>;
};

function mapEditingAttributes(editing: PlanPolicyGroupRecord | null): PlanPolicyAttributeInput[] {
  if (!editing?.attributes?.length) return [];
  return editing.attributes.map((row) => ({
    phase: row.phase,
    attributeName: row.attributeName,
    op: row.op,
    valueType: row.valueType,
    value: row.value,
    priority: row.priority,
    note: row.note ?? "",
  }));
}

function stationIdsFromEditing(editing: PlanPolicyGroupRecord | null): string[] {
  if (!editing) return [];
  if (editing.stationIds?.length) return [...editing.stationIds];
  if (editing.wifiStations?.length) return editing.wifiStations.map((s) => s.id);
  if (editing.wifiStationId) return [editing.wifiStationId];
  return [];
}

function buildScopeValues(
  editing: PlanPolicyGroupRecord | null,
  lockedOrgId?: string
): Partial<PlanPolicyFormValues> {
  if (editing) {
    return {
      orgId: editing.orgId,
      planId: editing.planId,
      vendorProfileId: editing.vendorProfileId,
    };
  }
  return {
    orgId: lockedOrgId,
    planId: undefined,
    vendorProfileId: undefined,
  };
}

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
  const { message } = App.useApp();
  const [form] = Form.useForm<PlanPolicyFormValues>();
  const [plans, setPlans] = useState<PolicyPlan[]>(formOptions.plans);
  const [vendorProfiles, setVendorProfiles] = useState<PolicyVendorProfile[]>(
    formOptions.vendorProfiles
  );
  const [stations, setStations] = useState<PolicyStation[]>(formOptions.stations);
  const [catalog, setCatalog] = useState(formOptions.catalogAttributes);
  const [attributes, setAttributes] = useState<PlanPolicyAttributeInput[]>([]);
  const [stationIds, setStationIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("scope");
  const autoSeededVendorRef = useRef<string | null>(null);

  const orgId = Form.useWatch("orgId", form);
  const planId = Form.useWatch("planId", form);
  const vendorProfileId = Form.useWatch("vendorProfileId", form);
  const scopeValues = useMemo(
    () => buildScopeValues(editing, lockedOrgId),
    [editing, lockedOrgId]
  );
  useDrawerFormSync(
    form,
    open,
    scopeValues,
    editing?.policyBundleId ?? editing?.groupKey ?? "create"
  );

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === planId) ?? editing?.plan ?? null,
    [plans, planId, editing?.plan]
  );
  const selectedVendor = useMemo(
    () =>
      vendorProfiles.find((v) => v.id === vendorProfileId) ?? editing?.vendorProfile ?? null,
    [vendorProfiles, vendorProfileId, editing?.vendorProfile]
  );
  const canOpenAttributes = Boolean(planId && vendorProfileId);

  const transferData: StationTransferItem[] = useMemo(
    () =>
      stations.map((s) => ({
        key: s.id,
        title: `${s.code} — ${s.name}`,
        description: s.status,
      })),
    [stations]
  );

  const seedAttributesForCreate = () => {
    if (editing || !selectedVendor) return false;
    if (attributes.length > 0 && autoSeededVendorRef.current === selectedVendor.id) return false;
    if (attributes.length > 0 && autoSeededVendorRef.current == null) return false;

    const rows = buildAttributesFromVendorTemplate(
      selectedVendor.vendor || selectedVendor.name,
      selectedPlan
    );
    if (!rows.length) {
      message.info(
        `No preset template for vendor “${selectedVendor.vendor}”. Add attributes from the catalog.`
      );
      return false;
    }
    setAttributes(rows);
    autoSeededVendorRef.current = selectedVendor.id;
    message.success(`${selectedVendor.vendor} attribute template applied`);
    return true;
  };

  const goToAttributes = () => {
    if (!planId || !vendorProfileId) {
      message.warning("Select both WiFi plan and Vendor profile first");
      setActiveTab("scope");
      return;
    }
    seedAttributesForCreate();
    setActiveTab("attributes");
  };

  useEffect(() => {
    if (!open) {
      setAttributes([]);
      setStationIds([]);
      setActiveTab("scope");
      autoSeededVendorRef.current = null;
      return;
    }
    setAttributes(mapEditingAttributes(editing));
    setStationIds(stationIdsFromEditing(editing));
    autoSeededVendorRef.current = null;
    setActiveTab(editing ? "attributes" : "scope");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.policyBundleId, editing?.groupKey]);

  useEffect(() => {
    if (!open) return;
    const targetOrgId = editing?.orgId ?? lockedOrgId;
    if (!targetOrgId) {
      setPlans([]);
      setStations([]);
      setVendorProfiles([]);
      setCatalog(formOptions.catalogAttributes);
      return;
    }
    void loadOptions(targetOrgId).then((opts) => {
      setPlans(opts.plans);
      setStations(opts.stations);
      setVendorProfiles(opts.vendorProfiles);
      setCatalog(opts.catalogAttributes);
    });
  }, [open, editing?.orgId, lockedOrgId, loadOptions, formOptions.catalogAttributes]);

  useEffect(() => {
    if (!open || !orgId || orgId === editing?.orgId || orgId === lockedOrgId) return;
    void loadOptions(orgId).then((opts) => {
      setPlans(opts.plans);
      setStations(opts.stations);
      setVendorProfiles(opts.vendorProfiles);
      setCatalog(opts.catalogAttributes);
    });
  }, [orgId, open, loadOptions, editing?.orgId, lockedOrgId]);

  useEffect(() => {
    if (!canOpenAttributes && activeTab === "attributes") {
      setActiveTab("scope");
    }
  }, [canOpenAttributes, activeTab]);

  const handleOrgChange = (value: string) => {
    form.setFieldsValue({
      planId: undefined,
      vendorProfileId: undefined,
    });
    setActiveTab("scope");
    setAttributes([]);
    setStationIds([]);
    autoSeededVendorRef.current = null;
    if (value) {
      void loadOptions(value).then((opts) => {
        setPlans(opts.plans);
        setStations(opts.stations);
        setVendorProfiles(opts.vendorProfiles);
        setCatalog(opts.catalogAttributes);
      });
    }
  };

  const handleTabChange = (key: string) => {
    if (key === "attributes") {
      goToAttributes();
      return;
    }
    setActiveTab(key);
  };

  const handleTransferChange: TransferProps["onChange"] = (nextTargetKeys) => {
    setStationIds(nextTargetKeys.map(String));
  };

  const handleFinish = async (values: PlanPolicyFormValues) => {
    if (!values.planId || !values.vendorProfileId) {
      message.error("Select both WiFi plan and Vendor profile first");
      setActiveTab("scope");
      return;
    }
    if (!attributes.length) {
      message.error("Add at least one attribute row");
      setActiveTab("attributes");
      return;
    }
    for (const row of attributes) {
      if (!row.attributeName?.trim() || !row.value?.trim()) {
        message.error("Each attribute needs a name and value");
        setActiveTab("attributes");
        return;
      }
    }
    const keys = attributes.map((r) => `${r.phase}::${r.attributeName.trim()}`);
    if (new Set(keys).size !== keys.length) {
      message.error("Duplicate attribute in the same phase");
      setActiveTab("attributes");
      return;
    }

    await onSubmit({
      orgId: values.orgId,
      planId: values.planId,
      vendorProfileId: values.vendorProfileId,
      stationIds,
      attributes,
      policyBundleId: editing?.policyBundleId || editing?.groupKey,
    });
  };

  const scopeTab = (
    <>
      {lockedOrgId || editing ? (
        <Form.Item name="orgId" hidden>
          <Input />
        </Form.Item>
      ) : (
        <Form.Item name="orgId" label="Tenant" rules={[{ required: true }]}>
          <Select
            showSearch
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

      {editing ? (
        <>
          <Form.Item name="planId" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="vendorProfileId" hidden>
            <Input />
          </Form.Item>
          <Descriptions
            size="small"
            column={1}
            bordered
            className="mb-4"
            items={[
              {
                key: "plan",
                label: "WiFi plan",
                children: (
                  <span>
                    <Text code>{editing.plan.code}</Text> — {editing.plan.name}
                  </span>
                ),
              },
              {
                key: "vendor",
                label: "Vendor profile",
                children: (
                  <span>
                    {editing.vendorProfile.name}{" "}
                    <Tag style={{ marginInlineStart: 6 }}>{editing.vendorProfile.vendor}</Tag>
                  </span>
                ),
              },
            ]}
          />
        </>
      ) : (
        <>
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
              onChange={() => {
                setAttributes([]);
                autoSeededVendorRef.current = null;
                setActiveTab("scope");
              }}
              options={vendorProfiles.map((v) => ({
                value: v.id,
                label: `${v.name} (${v.vendor})`,
              }))}
            />
          </Form.Item>
        </>
      )}

      <div className="mb-2">
        <Text strong style={{ fontSize: 13 }}>
          Site scope
        </Text>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Leave the right list empty for plan-wide (global) rules. Move sites to the right to
            apply this policy to multiple locations.
          </Text>
        </div>
      </div>

      <Transfer
        dataSource={transferData}
        titles={["Available sites", "Selected sites"]}
        targetKeys={stationIds}
        onChange={handleTransferChange}
        render={(item) => item.title}
        showSearch
        filterOption={(input, item) =>
          (item.title ?? "").toLowerCase().includes(input.toLowerCase())
        }
        listStyle={{ width: 320, height: 280 }}
        className="mb-3"
      />

      {stationIds.length === 0 ? (
        <Tag color="blue" className="mb-3">
          All sites (global)
        </Tag>
      ) : (
        <Tag className="mb-3">{stationIds.length} site override(s)</Tag>
      )}

      {!canOpenAttributes ? (
        <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
          Select both WiFi plan and Vendor profile to unlock Attributes.
        </Text>
      ) : (
        <Button type="link" style={{ paddingInline: 0 }} onClick={goToAttributes}>
          Continue to Attributes →
        </Button>
      )}
    </>
  );

  const attributesTab = (
    <div className="flex flex-col gap-3">
      <PolicyAttributesEditor
        value={attributes}
        catalog={catalog}
        preferredVendor={selectedVendor?.vendor ?? selectedVendor?.name}
        onChange={(next) => {
          autoSeededVendorRef.current = null;
          setAttributes(next);
        }}
      />
      {selectedPlan ? <PlanPolicyPlanSummary plan={selectedPlan} /> : null}
    </div>
  );

  return (
    <Drawer
      title={editing ? "Edit plan RADIUS policy" : "Add plan RADIUS policy"}
      size={920}
      open={open}
      onClose={onClose}
      destroyOnHidden
    >
      <Text type="secondary" style={{ display: "block", marginBottom: 16, fontSize: 13 }}>
        One policy = a plan + vendor profile + optional sites, with multiple RADIUS attribute rows.
      </Text>

      <Form
        form={form}
        layout="vertical"
        requiredMark="optional"
        onFinish={(v) => void handleFinish(v)}
      >
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={[
            { key: "scope", label: "Scope", children: scopeTab },
            {
              key: "attributes",
              label: `Attributes (${attributes.length})`,
              disabled: !canOpenAttributes,
              children: attributesTab,
            },
          ]}
        />

        <Divider style={{ margin: "16px 0" }} />

        <Space className="flex justify-end">
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="primary" htmlType="submit" loading={saving}>
            {editing ? "Save policy" : "Create policy"}
          </Button>
        </Space>
      </Form>
    </Drawer>
  );
};

export default PlanPolicyFormDrawer;
