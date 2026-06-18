"use client";

import React from "react";
import { Card, Col, Row, Statistic } from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileProtectOutlined,
  SafetyCertificateOutlined,
  SendOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { KpiDeltaText } from "@/features/wifi/shared/components/KpiDeltaText";
import { WifiMutedText } from "@/features/wifi/shared/components/WifiMutedText";
import type { ApprovalSummary } from "../types";
import { percentChange } from "../utils";

type Props = {
  summary: ApprovalSummary;
  previous: ApprovalSummary;
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

const ApprovalsKpiCards: React.FC<Props> = ({ summary, previous, loading }) => (
  <Row gutter={[16, 16]}>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Pending station"
        value={summary.pendingStationCount}
        delta={percentChange(summary.pendingStationCount, previous.pendingStationCount)}
        prefix={<ClockCircleOutlined style={{ color: "#1677ff" }} />}
        subtitle="Awaiting site attestation"
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Pending org"
        value={summary.pendingOrgCount}
        delta={percentChange(summary.pendingOrgCount, previous.pendingOrgCount)}
        prefix={<SafetyCertificateOutlined style={{ color: "#13c2c2" }} />}
        subtitle="Awaiting organization approval"
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Ready to post"
        value={summary.readyToPostCount}
        delta={percentChange(summary.readyToPostCount, previous.readyToPostCount)}
        prefix={<SendOutlined style={{ color: "#52c41a" }} />}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Posted"
        value={summary.postedCount}
        delta={percentChange(summary.postedCount, previous.postedCount)}
        prefix={<CheckCircleOutlined style={{ color: "#722ed1" }} />}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Attestations signed"
        value={summary.attestationsSigned}
        delta={percentChange(summary.attestationsSigned, previous.attestationsSigned)}
        prefix={<FileProtectOutlined style={{ color: "#fa8c16" }} />}
        subtitle={`${summary.stationAttestationsSigned} station · ${summary.orgAttestationsSigned} org`}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Postings sealed"
        value={summary.postingsSealed}
        delta={percentChange(summary.postingsSealed, previous.postingsSealed)}
        prefix={<CheckCircleOutlined style={{ color: "#531dab" }} />}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Settlements"
        value={summary.settlementCount}
        delta={percentChange(summary.settlementCount, previous.settlementCount)}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Rejected"
        value={summary.rejectedCount}
        delta={percentChange(summary.rejectedCount, previous.rejectedCount)}
        prefix={<StopOutlined style={{ color: "#ff4d4f" }} />}
      />
    </Col>
  </Row>
);

export default ApprovalsKpiCards;
