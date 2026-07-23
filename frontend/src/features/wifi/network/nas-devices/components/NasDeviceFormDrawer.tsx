"use client";

import React, { useEffect, useState } from "react";
import {
  Button,
  Divider,
  Drawer,
  Form,
  Input,
  Select,
  Space,
  Switch,
  Tabs,
  Typography,
} from "antd";
import type {
  NasDeviceFormValues,
  NasDeviceRadiusProfileOption,
  NasDeviceRecord,
  NasDeviceStation,
} from "../types";
import { DEVICE_TYPE_FORM_OPTIONS } from "../constant";
import type { NasDeviceOrg } from "../types";

const { TextArea } = Input;
const { Text } = Typography;

type Props = {
  open: boolean;
  saving: boolean;
  editing: NasDeviceRecord | null;
  orgs: NasDeviceOrg[];
  lockedOrgId?: string;
  loadStations: (orgId: string) => Promise<NasDeviceStation[]>;
  loadRadiusProfiles: (orgId: string) => Promise<NasDeviceRadiusProfileOption[]>;
  onClose: () => void;
  onSubmit: (values: NasDeviceFormValues) => Promise<void>;
};

const NasDeviceFormDrawer: React.FC<Props> = ({
  open,
  saving,
  editing,
  orgs,
  lockedOrgId,
  loadStations,
  loadRadiusProfiles,
  onClose,
  onSubmit,
}) => {
  const [form] = Form.useForm<NasDeviceFormValues>();
  const [stations, setStations] = useState<NasDeviceStation[]>([]);
  const [radiusProfiles, setRadiusProfiles] = useState<NasDeviceRadiusProfileOption[]>([]);
  const [stationsLoading, setStationsLoading] = useState(false);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const isRadiusClient = Form.useWatch("isRadiusClient", form);
  const orgId = Form.useWatch("orgId", form);

  useEffect(() => {
    if (!open) return;

    if (editing) {
      form.setFieldsValue({
        orgId: editing.orgId,
        stationId: editing.stationId ?? undefined,
        type: editing.type,
        vendor: editing.vendor ?? "",
        model: editing.model ?? "",
        serialNo: editing.serialNo ?? "",
        macAddr: editing.macAddr ?? "",
        ipAddr: editing.ipAddr ?? "",
        note: editing.note ?? "",
        isRadiusClient: editing.isRadiusClient,
        radiusProfileId: editing.radiusProfileId ?? undefined,
        radiusSecret: "",
        nasShortname: editing.nasShortname ?? "",
      });
      void loadStations(editing.orgId).then(setStations);
      void loadRadiusProfiles(editing.orgId).then(setRadiusProfiles);
    } else {
      form.resetFields();
      form.setFieldsValue({
        orgId: lockedOrgId,
        type: "ROUTER",
        isRadiusClient: false,
      });
      setStations([]);
      setRadiusProfiles([]);
      if (lockedOrgId) {
        void loadStations(lockedOrgId).then(setStations);
        void loadRadiusProfiles(lockedOrgId).then(setRadiusProfiles);
      }
    }
  }, [open, editing, form, loadStations, loadRadiusProfiles, lockedOrgId]);

  useEffect(() => {
    if (!open || !orgId) return;
    setStationsLoading(true);
    setProfilesLoading(true);
    void loadStations(orgId)
      .then(setStations)
      .finally(() => setStationsLoading(false));
    void loadRadiusProfiles(orgId)
      .then(setRadiusProfiles)
      .finally(() => setProfilesLoading(false));
  }, [orgId, open, loadStations, loadRadiusProfiles]);

  const handleOrgChange = (value: string) => {
    form.setFieldValue("stationId", undefined);
    form.setFieldValue("radiusProfileId", undefined);
    if (value) {
      void loadStations(value).then(setStations);
      void loadRadiusProfiles(value).then(setRadiusProfiles);
    }
  };

  const handleFinish = async (values: NasDeviceFormValues) => {
    // Inactive tab panes can omit fields from submit values — never wipe RADIUS on partial save.
    const isRadiusClient =
      typeof values.isRadiusClient === "boolean"
        ? values.isRadiusClient
        : Boolean(editing?.isRadiusClient);

    const radiusProfileId = isRadiusClient
      ? (typeof values.radiusProfileId === "string" && values.radiusProfileId.trim()
          ? values.radiusProfileId.trim()
          : editing?.radiusProfileId || null)
      : null;

    const nasShortname = isRadiusClient
      ? (typeof values.nasShortname === "string" && values.nasShortname.trim()
          ? values.nasShortname.trim()
          : editing?.nasShortname || undefined)
      : undefined;

    const payload: NasDeviceFormValues = {
      ...values,
      isRadiusClient,
      radiusProfileId: radiusProfileId ?? undefined,
      nasShortname,
    };

    // Blank secret on edit means "keep existing" — do not send empty string.
    if (editing && !values.radiusSecret?.trim()) {
      delete payload.radiusSecret;
    }
    // If profile id is still empty on edit, omit so API keeps existing.
    if (editing && !payload.radiusProfileId) {
      delete payload.radiusProfileId;
    }

    await onSubmit(payload);
  };

  const generalTab = (
    <div className="flex flex-col gap-0">
      {lockedOrgId ? (
        <Form.Item name="orgId" hidden>
          <Input />
        </Form.Item>
      ) : (
        <Form.Item name="orgId" label="Tenant" rules={[{ required: true, message: "Tenant is required" }]}>
          <Select
            showSearch
            disabled={Boolean(editing)}
            placeholder="Select tenant"
            optionFilterProp="label"
            onChange={handleOrgChange}
            options={orgs.map((org) => ({
              value: org.id,
              label: `${org.code} — ${org.name}`,
            }))}
          />
        </Form.Item>
      )}

      <Form.Item
        name="stationId"
        label="WiFi site"
        rules={[{ required: true, message: "Select a WiFi site" }]}
      >
        <Select
          showSearch
          loading={stationsLoading}
          placeholder="Link to a licensed site"
          optionFilterProp="label"
          options={stations.map((s) => ({
            value: s.id,
            label: `${s.code} — ${s.name}`,
          }))}
        />
      </Form.Item>

      <Form.Item name="type" label="Device type" rules={[{ required: true }]}>
        <Select options={DEVICE_TYPE_FORM_OPTIONS} />
      </Form.Item>

      <div className="grid grid-cols-2 gap-3">
        <Form.Item name="vendor" label="Vendor">
          <Input placeholder="e.g. Ruijie, MikroTik" />
        </Form.Item>
        <Form.Item name="model" label="Model">
          <Input placeholder="e.g. RG-EG1510XS" />
        </Form.Item>
      </div>

      <Form.Item name="serialNo" label="Serial number">
        <Input />
      </Form.Item>

      <div className="grid grid-cols-2 gap-3">
        <Form.Item name="macAddr" label="MAC address">
          <Input placeholder="AA:BB:CC:DD:EE:FF" />
        </Form.Item>
        <Form.Item name="ipAddr" label="IP address">
          <Input placeholder="10.0.0.1" />
        </Form.Item>
      </div>

      <Form.Item name="note" label="Notes">
        <TextArea rows={2} maxLength={500} />
      </Form.Item>
    </div>
  );

  const radiusTab = (
    <div className="flex flex-col gap-0">
      <Form.Item name="isRadiusClient" label="RADIUS client (NAS)" valuePropName="checked">
        <Switch />
      </Form.Item>

      {isRadiusClient ? (
        <>
          <Form.Item
            name="radiusProfileId"
            label="FreeRADIUS server"
            rules={[{ required: true, message: "Select a FreeRADIUS server" }]}
            extra="Org-scoped FreeRADIUS server this NAS client talks to."
          >
            <Select
              showSearch
              loading={profilesLoading}
              placeholder="Select FreeRADIUS server"
              optionFilterProp="label"
              options={radiusProfiles.map((p) => ({
                value: p.id,
                label: p.serverHost ? `${p.name} (${p.serverHost})` : p.name,
              }))}
              notFoundContent={
                profilesLoading
                  ? "Loading…"
                  : "No servers — create one under Network → FreeRADIUS Servers"
              }
            />
          </Form.Item>

          <Form.Item
            name="nasShortname"
            label="NAS short name"
            extra="FreeRADIUS nasname / shortname for this device"
          >
            <Input placeholder="site-router-01" />
          </Form.Item>

          <Form.Item
            name="radiusSecret"
            label="NAS shared secret"
            extra={
              editing?.hasRadiusSecret
                ? "Leave blank to keep the existing device secret."
                : "Required unless the FreeRADIUS server has a default secret."
            }
          >
            <Input.Password
              placeholder={editing?.hasRadiusSecret ? "Leave blank to keep existing" : ""}
            />
          </Form.Item>
        </>
      ) : (
        <Text type="secondary" style={{ fontSize: 13 }}>
          Enable RADIUS client, then select which FreeRADIUS server this device uses.
        </Text>
      )}
    </div>
  );

  return (
    <Drawer
      title={editing ? "Edit NAS device" : "Add NAS device"}
      size={480}
      open={open}
      onClose={onClose}
      destroyOnHidden
    >
      <Text type="secondary" style={{ display: "block", marginBottom: 16, fontSize: 13 }}>
        Inventory for routers, access points, and RADIUS NAS clients used at WiFi sites.
      </Text>

      <Form form={form} layout="vertical" requiredMark="optional" onFinish={(v) => void handleFinish(v)}>
        <Tabs
          destroyInactiveTabPane={false}
          items={[
            { key: "general", label: "General", forceRender: true, children: generalTab },
            { key: "radius", label: "RADIUS / NAS", forceRender: true, children: radiusTab },
          ]}
        />

        <Divider style={{ margin: "16px 0" }} />

        <Space className="flex justify-end">
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="primary" htmlType="submit" loading={saving}>
            {editing ? "Save changes" : "Add device"}
          </Button>
        </Space>
      </Form>
    </Drawer>
  );
};

export default NasDeviceFormDrawer;
