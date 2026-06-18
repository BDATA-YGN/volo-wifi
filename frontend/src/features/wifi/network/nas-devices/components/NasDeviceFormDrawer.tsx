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
  Switch,
  Tabs,
  Typography,
} from "antd";
import type { NasDeviceFormValues, NasDeviceRecord, NasDeviceStation } from "../types";
import {
  DEVICE_TYPE_FORM_OPTIONS,
  NAS_TYPE_SUGGESTIONS,
} from "../constant";
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
  onClose,
  onSubmit,
}) => {
  const [form] = Form.useForm<NasDeviceFormValues>();
  const [stations, setStations] = useState<NasDeviceStation[]>([]);
  const [stationsLoading, setStationsLoading] = useState(false);
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
        radiusSecret: editing.radiusSecret ?? "",
        nasShortname: editing.nasShortname ?? "",
        nasType: editing.nasType ?? "other",
        nasPorts: editing.nasPorts ?? undefined,
        nasServer: editing.nasServer ?? "",
        nasCommunity: editing.nasCommunity ?? "",
      });
      void loadStations(editing.orgId).then(setStations);
    } else {
      form.resetFields();
      form.setFieldsValue({
        orgId: lockedOrgId,
        type: "ROUTER",
        isRadiusClient: false,
        nasType: "other",
      });
      setStations([]);
      if (lockedOrgId) {
        void loadStations(lockedOrgId).then(setStations);
      }
    }
  }, [open, editing, form, loadStations, lockedOrgId]);

  useEffect(() => {
    if (!open || !orgId) return;
    setStationsLoading(true);
    void loadStations(orgId)
      .then(setStations)
      .finally(() => setStationsLoading(false));
  }, [orgId, open, loadStations]);

  const handleOrgChange = (value: string) => {
    form.setFieldValue("stationId", undefined);
    if (value) void loadStations(value).then(setStations);
  };

  const handleFinish = async (values: NasDeviceFormValues) => {
    await onSubmit({
      ...values,
      stationId: values.stationId || null,
    });
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

      <Form.Item name="stationId" label="WiFi site (optional)">
        <Select
          allowClear
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
            name="nasShortname"
            label="NAS short name"
            extra="FreeRADIUS nasname / shortname"
          >
            <Input placeholder="site-router-01" />
          </Form.Item>

          <Form.Item name="radiusSecret" label="RADIUS shared secret">
            <Input.Password
              placeholder={editing?.hasRadiusSecret ? "Leave blank to keep existing" : ""}
            />
          </Form.Item>

          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="nasType" label="NAS type">
              <Select
                showSearch
                allowClear
                options={NAS_TYPE_SUGGESTIONS.map((v) => ({ value: v, label: v }))}
              />
            </Form.Item>
            <Form.Item name="nasPorts" label="NAS ports">
              <InputNumber min={0} max={65535} style={{ width: "100%" }} />
            </Form.Item>
          </div>

          <Form.Item name="nasServer" label="NAS server IP">
            <Input placeholder="Optional RADIUS server IP" />
          </Form.Item>

          <Form.Item name="nasCommunity" label="SNMP community">
            <Input />
          </Form.Item>
        </>
      ) : (
        <Text type="secondary" style={{ fontSize: 13 }}>
          Enable RADIUS client to configure FreeRADIUS NAS attributes for this device.
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
          items={[
            { key: "general", label: "General", children: generalTab },
            { key: "radius", label: "RADIUS / NAS", children: radiusTab },
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
