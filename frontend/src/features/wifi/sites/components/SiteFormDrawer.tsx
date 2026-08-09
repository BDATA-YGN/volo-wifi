"use client";

import React, { useMemo } from "react";
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
import { useDrawerFormSync } from "@/features/wifi/shared/hooks";
import { usePlaceTowns } from "@/features/system/places/usePlaceTowns";

const { TextArea } = Input;
const { Paragraph, Text } = Typography;

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

function buildSiteFormValues(
  editing: SiteRecord | null,
  formOptions: SitesFormOptions,
  licenseAtLimit?: boolean
): SiteFormValues {
  if (editing) {
    return {
      code: editing.code,
      name: editing.name,
      location: editing.location ?? undefined,
      township: editing.township ?? undefined,
      address: editing.address ?? undefined,
      stationSizeId: editing.stationSizeId,
      status: editing.status,
      nasIdentifier: editing.nasIdentifier ?? undefined,
      radiusClientIp: editing.radiusClientIp ?? undefined,
      nasMac: editing.nasMac ?? undefined,
      radiusVendorProfileId: editing.radiusVendorProfileId,
    };
  }
  return {
    code: "",
    name: "",
    township: undefined,
    stationSizeId: formOptions.stationSizes[0]?.id ?? "",
    status: licenseAtLimit ? "MAINTENANCE" : "ACTIVE",
  };
}

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
  const formValues = buildSiteFormValues(editing, formOptions, licenseAtLimit);
  useDrawerFormSync(form, open, formValues, editing?.id ?? "create");
  const { options: townOptions, loading: townsLoading } = usePlaceTowns();

  const townshipOptions = useMemo(() => {
    const byValue = new Map(townOptions.map((o) => [o.value, o]));
    const current = editing?.township?.trim();
    if (current && !byValue.has(current)) {
      byValue.set(current, { value: current, label: current });
    }
    return [...byValue.values()];
  }, [townOptions, editing?.township]);

  const handleFinish = async (values: SiteFormValues) => {
    const payload: SiteFormValues = {
      code: values.code,
      name: values.name,
      location: values.location,
      township: values.township?.trim() || null,
      address: values.address,
      stationSizeId: values.stationSizeId,
      status: values.status,
      nasIdentifier: values.nasIdentifier,
      radiusClientIp: values.radiusClientIp,
      nasMac: values.nasMac,
      radiusVendorProfileId: values.radiusVendorProfileId,
    };
    if (editing) {
      await onUpdate(editing.id, payload);
    } else {
      await onCreate(payload);
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

      <Form.Item
        name="township"
        label="Township"
        extra="Saved as the town name (not linked by ID)"
      >
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          loading={townsLoading}
          placeholder="Select township"
          options={townshipOptions}
        />
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
        Captive site-lock matching uses these fields against the gateway redirect (
        <Text code>NASID</Text>, <Text code>nas_ip</Text>, <Text code>nas_mac</Text>
        ). Any one match is enough — NAS-Identifier or NAS MAC alone qualifies. For Ruijie
        presets without NASID, fill NAS IP and/or NAS MAC.
      </Paragraph>

      <Form.Item
        name="nasIdentifier"
        label="NAS-Identifier"
        extra="Optional. Match redirect NASID / nasid when the gateway sends it."
      >
        <Input placeholder="e.g. ANNAPC0001" />
      </Form.Item>

      <Form.Item
        name="radiusClientIp"
        label="NAS IP"
        extra="Ruijie / MikroTik redirect nas_ip — also used as RADIUS client IP."
      >
        <Input placeholder="10.0.0.1" />
      </Form.Item>

      <Form.Item
        name="nasMac"
        label="NAS MAC"
        extra="Ruijie redirect nas_mac (gateway MAC). Accepts aa:bb:… or aabb…."
        rules={[
          {
            validator: async (_, value) => {
              if (value == null || String(value).trim() === "") return;
              const hex = String(value).toLowerCase().replace(/[^a-f0-9]/g, "");
              if (hex.length !== 12) {
                throw new Error("NAS MAC must be a 12-digit hex address");
              }
            },
          },
        ]}
      >
        <Input placeholder="aa:bb:cc:dd:ee:ff" />
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
    </>
  );

  return (
    <Drawer
      title={editing ? `Edit ${editing.name}` : "Add WiFi site"}
      size={520}
      open={open}
      onClose={onClose}
      destroyOnHidden
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
