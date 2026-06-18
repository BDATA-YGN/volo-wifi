"use client";

import React from "react";
import { Alert, Select, Space, Switch, Typography } from "antd";
import { DEVICE_TYPE_OPTIONS } from "../constant";
import type { DeviceType, SiteOption } from "../types";
import { formatDeviceType } from "../utils";

const { Text } = Typography;

type Props = {
  stations: SiteOption[];
  stationId?: string;
  deviceType?: DeviceType;
  isRadiusClient?: boolean;
  unassignedOnly?: boolean;
  loading?: boolean;
  onStationChange: (value: string | undefined) => void;
  onDeviceTypeChange: (value: DeviceType | undefined) => void;
  onRadiusClientChange: (value: boolean | undefined) => void;
  onUnassignedOnlyChange: (value: boolean) => void;
};

const NasFilterBar: React.FC<Props> = ({
  stations,
  stationId,
  deviceType,
  isRadiusClient,
  unassignedOnly,
  loading,
  onStationChange,
  onDeviceTypeChange,
  onRadiusClientChange,
  onUnassignedOnlyChange,
}) => (
  <div className="flex flex-col gap-3">
    <Space wrap size="middle" align="end">
      <div>
        <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
          Site
        </Text>
        <Select
          allowClear
          showSearch
          placeholder="All sites"
          style={{ minWidth: 220 }}
          loading={loading}
          disabled={unassignedOnly}
          value={stationId}
          optionFilterProp="label"
          onChange={(v) => onStationChange(v)}
          options={stations.map((s) => ({
            value: s.id,
            label: `${s.name} (${s.code})`,
          }))}
        />
      </div>
      <div>
        <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
          Device type
        </Text>
        <Select
          allowClear
          placeholder="All types"
          style={{ minWidth: 160 }}
          loading={loading}
          value={deviceType}
          onChange={(v) => onDeviceTypeChange(v)}
          options={DEVICE_TYPE_OPTIONS}
        />
      </div>
      <div>
        <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
          RADIUS role
        </Text>
        <Select
          allowClear
          placeholder="All devices"
          style={{ minWidth: 160 }}
          loading={loading}
          value={isRadiusClient}
          onChange={(v) => onRadiusClientChange(v)}
          options={[
            { value: true, label: "RADIUS clients only" },
            { value: false, label: "Non-RADIUS only" },
          ]}
        />
      </div>
      <div>
        <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
          Unassigned
        </Text>
        <Switch
          checked={unassignedOnly}
          onChange={onUnassignedOnlyChange}
          checkedChildren="Only"
          unCheckedChildren="All"
        />
      </div>
    </Space>
    {stationId || deviceType || isRadiusClient !== undefined || unassignedOnly ? (
      <Alert
        type="info"
        showIcon
        title={
          <Text style={{ fontSize: 13 }}>
            {unassignedOnly ? "Unassigned devices only" : null}
            {unassignedOnly && (stationId || deviceType || isRadiusClient !== undefined)
              ? " · "
              : null}
            {stationId && !unassignedOnly
              ? `Site ${stations.find((s) => s.id === stationId)?.name ?? stationId}`
              : null}
            {stationId && deviceType ? " · " : null}
            {deviceType ? formatDeviceType(deviceType) : null}
            {(stationId || deviceType) && isRadiusClient !== undefined ? " · " : null}
            {isRadiusClient === true ? "RADIUS clients" : null}
            {isRadiusClient === false ? "Non-RADIUS" : null}
          </Text>
        }
      />
    ) : null}
  </div>
);

export default NasFilterBar;
