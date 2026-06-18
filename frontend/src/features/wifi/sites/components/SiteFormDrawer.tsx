"use client";

import React from "react";
import {
  Button,
  Drawer,
  Form,
  Input,
  Select,
  Tabs,
  Typography,
} from "antd";
import type { SiteFormValues, SiteRecord, SitesFormOptions } from "../types";
import { SITE_CODE_PATTERN, STATUS_OPTIONS } from "../constant";

const { TextArea } = Input;
const { Text, Paragraph } = Typography;

type Props = {
  open: boolean;
  saving?: boolean;
  editing: SiteRecord | null;
  formOptions: SitesFormOptions;
  licenseAtLimit?: boolean;
  onClose: () => void;
  onCreate: (values: SiteFormValues) => Promise<void>;
  onUpdate: (id: string, values: SiteFormValues) => Promise<void>;
};

const SiteFormDrawer: React.FC<Props> = ({
  open,
  saving,
  editing,
  formOptions,
  licenseAtLimit,
  onClose,
  onCreate,
  onUpdate,
}) => {
  const [form] = Form.useForm<SiteFormValues>();
  const status = Form.useWatch("status", form);

  const initialValues: SiteFormValues = editing
    ? {
        code: editing.code,
        name: editing.name,
        location: editing.location ?? undefined,
        address: editing.address ?? undefined,
        stationSizeId: editing.stationSizeId,
        status: editing.status,
        portalBaseUrl: editing.portalBaseUrl ?? undefined,
        nasIdentifier: editing.nasIdentifier ?? undefined,
        radiusClientIp: editing.radiusClientIp ?? undefined,
        vlanId: editing.vlanId ?? undefined,
        radiusVendorProfileId: editing.radiusVendorProfileId,
      }
    : {
        code: "",
        name: "",
        stationSizeId: formOptions.stationSizes[0]?.id ?? "",
        status: licenseAtLimit ? "MAINTENANCE" : "ACTIVE",
      };

  const handleFinish = async (values: SiteFormValues) => {
    if (editing) {
      await onUpdate(editing.id, values);
    } else {
      await onCreate(values);
    }
  };

  const generalTab = (
    <>
      <Form.Item
        name="code"
        label="Site code"
        rules={[
          { required: true, message: "Code is required" },
          { pattern: SITE_CODE_PATTERN, message: "Use A-Z, 0-9, underscore, or hyphen" },
        ]}
        extra="Unique per tenant — e.g. HQ_WIFI, BRANCH_01"
      >
        <Input
          placeholder="HQ_WIFI"
          onChange={(e) =>
            form.setFieldValue(
              "code",
              e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "")
            )
          }
        />
      </Form.Item>

      <Form.Item
        name="name"
        label="Display name"
        rules={[{ required: true, message: "Name is required" }, { min: 2 }]}
      >
        <Input placeholder="Head office WiFi" />
      </Form.Item>

      <Form.Item name="location" label="Location label">
        <Input placeholder="Building A, Floor 2" />
      </Form.Item>

      <Form.Item name="address" label="Address">
        <TextArea rows={2} placeholder="Optional postal address" />
      </Form.Item>

      <Form.Item
        name="stationSizeId"
        label="Capacity tier"
        rules={[{ required: true, message: "Capacity tier is required" }]}
        extra="Drives monthly license billing for this site"
      >
        <Select
          showSearch
          optionFilterProp="label"
          options={formOptions.stationSizes.map((t) => ({
            value: t.id,
            label: `${t.name} (${t.code})`,
          }))}
        />
      </Form.Item>

      <Form.Item name="status" label="Status" rules={[{ required: true }]}>
        <Select
          options={STATUS_OPTIONS.map((o) => ({
            value: o.value,
            label: o.label,
            disabled: licenseAtLimit && o.value === "ACTIVE" && editing?.status !== "ACTIVE",
          }))}
        />
      </Form.Item>

      {licenseAtLimit && status === "ACTIVE" && !editing ? (
        <Paragraph type="warning" style={{ fontSize: 12 }}>
          Licensed site limit is full — new sites will be created as maintenance until a slot is
          available.
        </Paragraph>
      ) : null}
    </>
  );

  const networkTab = (
    <>
      <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 16 }}>
        Optional captive portal and RADIUS client hints. NAS devices can also be managed under
        Network → NAS Devices.
      </Paragraph>

      <Form.Item name="portalBaseUrl" label="Portal base URL">
        <Input placeholder="https://portal.example.com" />
      </Form.Item>

      <Form.Item name="radiusVendorProfileId" label="RADIUS vendor profile">
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="Optional NAS profile"
          options={formOptions.vendorProfiles.map((p) => ({
            value: p.id,
            label: p.model ? `${p.name} (${p.vendor} ${p.model})` : `${p.name} (${p.vendor})`,
          }))}
        />
      </Form.Item>

      <Form.Item name="nasIdentifier" label="NAS-Identifier">
        <Input placeholder="Optional RADIUS NAS-Identifier" />
      </Form.Item>

      <Form.Item name="radiusClientIp" label="RADIUS client IP">
        <Input placeholder="10.0.0.1" />
      </Form.Item>

      <Form.Item name="vlanId" label="VLAN ID">
        <Input placeholder="Optional" />
      </Form.Item>

      <Form.Item
        name="radiusSecret"
        label="RADIUS shared secret"
        extra={
          editing?.hasRadiusSecret
            ? "Leave blank to keep the existing secret."
            : "Stored encrypted at rest when configured."
        }
      >
        <Input.Password placeholder={editing?.hasRadiusSecret ? "••••••••" : "Optional"} />
      </Form.Item>
    </>
  );

  return (
    <Drawer
      title={editing ? `Edit ${editing.name}` : "Add WiFi site"}
      size={520}
      open={open}
      onClose={onClose}
      destroyOnClose={false}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="primary" loading={saving} onClick={() => form.submit()}>
            {editing ? "Save changes" : "Create site"}
          </Button>
        </div>
      }
    >
      {open ? (
        <Form<SiteFormValues>
          form={form}
          layout="vertical"
          requiredMark="optional"
          initialValues={initialValues}
          key={editing?.id ?? "create"}
          onFinish={(v) => void handleFinish(v)}
        >
          <Tabs
            items={[
              { key: "general", label: "General", children: generalTab },
              { key: "network", label: "Network", children: networkTab },
            ]}
          />
        </Form>
      ) : null}
    </Drawer>
  );
};

export default SiteFormDrawer;
