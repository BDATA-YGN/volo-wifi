"use client";

import React, { useMemo, useState } from "react";
import { App, Button, Card, Col, Divider, InputNumber, Row, Select, Space, Typography } from "antd";
import { CopyOutlined } from "@ant-design/icons";

const { Text, Paragraph } = Typography;

type TimeUnit = "seconds" | "minutes" | "hours" | "days";
type DataUnit = "B" | "KB" | "MB" | "GB";
type SpeedUnit = "bps" | "Kbps" | "Mbps" | "Gbps";

const TIME_UNITS: { value: TimeUnit; label: string; toSeconds: number }[] = [
  { value: "seconds", label: "Seconds", toSeconds: 1 },
  { value: "minutes", label: "Minutes", toSeconds: 60 },
  { value: "hours", label: "Hours", toSeconds: 3600 },
  { value: "days", label: "Days", toSeconds: 86400 },
];

const DATA_UNITS: { value: DataUnit; label: string; toBytes: number }[] = [
  { value: "B", label: "Bytes", toBytes: 1 },
  { value: "KB", label: "KB", toBytes: 1024 },
  { value: "MB", label: "MB", toBytes: 1024 * 1024 },
  { value: "GB", label: "GB", toBytes: 1024 * 1024 * 1024 },
];

const SPEED_UNITS: { value: SpeedUnit; label: string; toBps: number }[] = [
  { value: "bps", label: "bit/s", toBps: 1 },
  { value: "Kbps", label: "Kbit/s", toBps: 1000 },
  { value: "Mbps", label: "Mbit/s", toBps: 1_000_000 },
  { value: "Gbps", label: "Gbit/s", toBps: 1_000_000_000 },
];

function formatInt(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return Math.round(n).toLocaleString("en-US");
}

function mikrotikRateToken(bps: number): string {
  if (!Number.isFinite(bps) || bps <= 0) return "—";
  if (bps >= 1_000_000 && bps % 1_000_000 === 0) return `${bps / 1_000_000}M`;
  if (bps >= 1000 && bps % 1000 === 0) return `${bps / 1000}k`;
  return `${Math.round(bps)}`;
}

const RadiusValueConverter: React.FC = () => {
  const { message } = App.useApp();

  const [timeAmount, setTimeAmount] = useState<number | null>(1);
  const [timeUnit, setTimeUnit] = useState<TimeUnit>("hours");

  const [dataAmount, setDataAmount] = useState<number | null>(5);
  const [dataUnit, setDataUnit] = useState<DataUnit>("GB");

  const [speedAmount, setSpeedAmount] = useState<number | null>(2);
  const [speedUnit, setSpeedUnit] = useState<SpeedUnit>("Mbps");

  const timeSeconds = useMemo(() => {
    const factor = TIME_UNITS.find((u) => u.value === timeUnit)?.toSeconds ?? 1;
    return (timeAmount ?? 0) * factor;
  }, [timeAmount, timeUnit]);

  const dataBytes = useMemo(() => {
    const factor = DATA_UNITS.find((u) => u.value === dataUnit)?.toBytes ?? 1;
    return (dataAmount ?? 0) * factor;
  }, [dataAmount, dataUnit]);

  const speedBps = useMemo(() => {
    const factor = SPEED_UNITS.find((u) => u.value === speedUnit)?.toBps ?? 1;
    return (speedAmount ?? 0) * factor;
  }, [speedAmount, speedUnit]);

  const mikrotikRate = useMemo(() => {
    const token = mikrotikRateToken(speedBps);
    if (token === "—") return "—";
    return `${token}/${token}`;
  }, [speedBps]);

  const copy = async (label: string, value: string) => {
    if (!value || value === "—") return;
    try {
      await navigator.clipboard.writeText(value);
      message.success(`Copied ${label}`);
    } catch {
      message.error("Could not copy");
    }
  };

  const Result = ({
    label,
    value,
    hint,
  }: {
    label: string;
    value: string;
    hint?: string;
  }) => (
    <div className="flex items-start justify-between gap-2 rounded border border-[var(--ant-color-border-secondary)] px-2 py-1.5">
      <div className="min-w-0">
        <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
          {label}
        </Text>
        <Text code style={{ fontSize: 12, wordBreak: "break-all" }}>
          {value}
        </Text>
        {hint ? (
          <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
            {hint}
          </Text>
        ) : null}
      </div>
      <Button
        type="text"
        size="small"
        icon={<CopyOutlined />}
        onClick={() => void copy(label, value)}
        disabled={value === "—"}
      />
    </div>
  );

  return (
    <Card
      size="small"
      title="Time · data · speed converter"
      styles={{ body: { padding: 12 } }}
    >
      <Paragraph type="secondary" style={{ marginBottom: 12, fontSize: 12 }}>
        Convert human values into RADIUS field formats, then copy into the attribute Value column.
      </Paragraph>

      <Row gutter={[12, 12]}>
        <Col xs={24} md={8}>
          <Text strong style={{ fontSize: 12 }}>
            Time → Session-Timeout
          </Text>
          <Space.Compact style={{ width: "100%", marginTop: 6 }}>
            <InputNumber
              min={0}
              value={timeAmount}
              onChange={(v) => setTimeAmount(typeof v === "number" ? v : null)}
              style={{ width: "55%" }}
            />
            <Select
              value={timeUnit}
              onChange={setTimeUnit}
              options={TIME_UNITS.map((u) => ({ value: u.value, label: u.label }))}
              style={{ width: "45%" }}
            />
          </Space.Compact>
          <div className="mt-2 flex flex-col gap-1.5">
            <Result
              label="Seconds (integer)"
              value={String(Math.round(timeSeconds))}
              hint="Session-Timeout / Idle-Timeout"
            />
            <Result label="Plan template" value="{timeSeconds}" hint="Dynamic from service plan" />
          </div>
        </Col>

        <Col xs={24} md={8}>
          <Text strong style={{ fontSize: 12 }}>
            Data → byte quota
          </Text>
          <Space.Compact style={{ width: "100%", marginTop: 6 }}>
            <InputNumber
              min={0}
              value={dataAmount}
              onChange={(v) => setDataAmount(typeof v === "number" ? v : null)}
              style={{ width: "55%" }}
            />
            <Select
              value={dataUnit}
              onChange={setDataUnit}
              options={DATA_UNITS.map((u) => ({ value: u.value, label: u.label }))}
              style={{ width: "45%" }}
            />
          </Space.Compact>
          <div className="mt-2 flex flex-col gap-1.5">
            <Result
              label="Bytes (Mikrotik-Total-Limit)"
              value={String(Math.round(dataBytes))}
              hint={formatInt(dataBytes) + " bytes"}
            />
            <Result label="Plan template" value="{dataMb}" hint="Dynamic plan data MB" />
          </div>
        </Col>

        <Col xs={24} md={8}>
          <Text strong style={{ fontSize: 12 }}>
            Speed → rate / WISPr
          </Text>
          <Space.Compact style={{ width: "100%", marginTop: 6 }}>
            <InputNumber
              min={0}
              value={speedAmount}
              onChange={(v) => setSpeedAmount(typeof v === "number" ? v : null)}
              style={{ width: "55%" }}
            />
            <Select
              value={speedUnit}
              onChange={setSpeedUnit}
              options={SPEED_UNITS.map((u) => ({ value: u.value, label: u.label }))}
              style={{ width: "45%" }}
            />
          </Space.Compact>
          <div className="mt-2 flex flex-col gap-1.5">
            <Result
              label="Bits/sec (WISPr up/down)"
              value={String(Math.round(speedBps))}
              hint={formatInt(speedBps) + " bit/s"}
            />
            <Result
              label="MikroTik-Rate-Limit"
              value={mikrotikRate}
              hint="rx/tx same rate"
            />
          </div>
        </Col>
      </Row>

      <Divider style={{ margin: "12px 0 8px" }} />
      <Text type="secondary" style={{ fontSize: 11 }}>
        Tips: WISPr uses bit/s · MikroTik rate uses k/M (e.g. 512k/512k, 2M/2M) · MikroTik total
        limit uses bytes.
      </Text>
    </Card>
  );
};

export default RadiusValueConverter;
