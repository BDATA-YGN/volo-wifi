"use client";

import React from "react";
import { Card, Col, Row, Statistic } from "antd";
import {
  CloudDownloadOutlined,
  CloudUploadOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  WifiOutlined,
} from "@ant-design/icons";
import { KpiDeltaText } from "@/features/wifi/shared/components/KpiDeltaText";
import { WifiMutedText } from "@/features/wifi/shared/components/WifiMutedText";
import type { SessionTrafficSummary } from "../types";
import { formatBytes, formatDuration, percentChange } from "../utils";

type Props = {
  summary: SessionTrafficSummary;
  previous: SessionTrafficSummary;
  loading?: boolean;
};

type KpiProps = {
  title: string;
  value: number | string;
  delta: number | null;
  prefix?: React.ReactNode;
  loading?: boolean;
  subtitle?: string;
};

const KpiCard: React.FC<KpiProps> = ({ title, value, delta, prefix, loading, subtitle }) => (
  <Card size="small" styles={{ body: { padding: 16 } }}>
    <Statistic loading={loading} title={title} value={value} prefix={prefix} />
    {subtitle ? (
      <WifiMutedText style={{ fontSize: 12, display: "block", marginTop: 4 }}>
        {subtitle}
      </WifiMutedText>
    ) : null}
    {delta != null ? <KpiDeltaText delta={delta} /> : null}
  </Card>
);

const TrafficKpiCards: React.FC<Props> = ({ summary, previous, loading }) => (
  <Row gutter={[16, 16]}>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Active sessions"
        value={summary.activeSessionsNow}
        delta={null}
        prefix={<WifiOutlined style={{ color: "#52c41a" }} />}
        subtitle={`${formatBytes(summary.activeBytesNow)} in flight`}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Sessions"
        value={summary.sessionsCount}
        delta={percentChange(summary.sessionsCount, previous.sessionsCount)}
        prefix={<WifiOutlined style={{ color: "#1677ff" }} />}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Unique users"
        value={summary.uniqueCredentials}
        delta={percentChange(summary.uniqueCredentials, previous.uniqueCredentials)}
        prefix={<TeamOutlined style={{ color: "#722ed1" }} />}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Total data"
        value={formatBytes(summary.totalBytes)}
        delta={percentChange(summary.totalBytes, previous.totalBytes)}
        prefix={<CloudDownloadOutlined style={{ color: "#13c2c2" }} />}
        subtitle={`↓ ${formatBytes(summary.totalOutputBytes)} · ↑ ${formatBytes(summary.totalInputBytes)}`}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Download"
        value={formatBytes(summary.totalOutputBytes)}
        delta={percentChange(summary.totalOutputBytes, previous.totalOutputBytes)}
        prefix={<CloudDownloadOutlined style={{ color: "#1677ff" }} />}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Upload"
        value={formatBytes(summary.totalInputBytes)}
        delta={percentChange(summary.totalInputBytes, previous.totalInputBytes)}
        prefix={<CloudUploadOutlined style={{ color: "#fa8c16" }} />}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Avg session"
        value={formatDuration(summary.avgSessionTimeSec)}
        delta={percentChange(summary.avgSessionTimeSec, previous.avgSessionTimeSec)}
        prefix={<ClockCircleOutlined style={{ color: "#8c8c8c" }} />}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Avg per session"
        value={formatBytes(summary.avgBytesPerSession)}
        delta={percentChange(summary.avgBytesPerSession, previous.avgBytesPerSession)}
      />
    </Col>
  </Row>
);

export default TrafficKpiCards;
