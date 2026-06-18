"use client";

import React from "react";
import { Card, Col, Row, Statistic } from "antd";
import {
  DollarOutlined,
  EnvironmentOutlined,
  PercentageOutlined,
  ShoppingCartOutlined,
  WifiOutlined,
} from "@ant-design/icons";
import { KpiDeltaText } from "@/features/wifi/shared/components/KpiDeltaText";
import type { SiteAnalyticsSummary } from "../types";
import { formatBytes, formatDuration, formatMoney, percentChange } from "../utils";

type Props = {
  summary: SiteAnalyticsSummary;
  previous: SiteAnalyticsSummary;
  currency: string;
  loading?: boolean;
  singleSite?: boolean;
};

type KpiProps = {
  title: string;
  value: number | string;
  delta: number | null;
  prefix?: React.ReactNode;
  loading?: boolean;
};

const KpiCard: React.FC<KpiProps> = ({ title, value, delta, prefix, loading }) => (
  <Card size="small" styles={{ body: { padding: 16 } }}>
    <Statistic loading={loading} title={title} value={value} prefix={prefix} />
    <KpiDeltaText delta={delta} />
  </Card>
);

const SitesKpiCards: React.FC<Props> = ({
  summary,
  previous,
  currency,
  loading,
  singleSite = false,
}) => (
  <Row gutter={[16, 16]}>
    {!singleSite ? (
      <>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            loading={loading}
            title="Sites in scope"
            value={summary.siteCount}
            delta={percentChange(summary.siteCount, previous.siteCount)}
            prefix={<EnvironmentOutlined style={{ color: "#1677ff" }} />}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            loading={loading}
            title="Active sites"
            value={summary.activeSiteCount}
            delta={percentChange(summary.activeSiteCount, previous.activeSiteCount)}
            prefix={<WifiOutlined style={{ color: "#722ed1" }} />}
          />
        </Col>
      </>
    ) : null}
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Revenue"
        value={formatMoney(summary.revenue, currency)}
        delta={percentChange(summary.revenue, previous.revenue)}
        prefix={<DollarOutlined style={{ color: "#52c41a" }} />}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Orders"
        value={summary.ordersCount}
        delta={percentChange(summary.ordersCount, previous.ordersCount)}
        prefix={<ShoppingCartOutlined style={{ color: "#1677ff" }} />}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Commission"
        value={formatMoney(summary.commission, currency)}
        delta={percentChange(summary.commission, previous.commission)}
        prefix={<PercentageOutlined style={{ color: "#722ed1" }} />}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="WiFi sessions"
        value={summary.sessionsCount}
        delta={percentChange(summary.sessionsCount, previous.sessionsCount)}
        prefix={<WifiOutlined style={{ color: "#13c2c2" }} />}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Tokens sold"
        value={summary.itemsCount}
        delta={percentChange(summary.itemsCount, previous.itemsCount)}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Data transferred"
        value={formatBytes(summary.totalBytes)}
        delta={percentChange(summary.totalBytes, previous.totalBytes)}
      />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <KpiCard
        loading={loading}
        title="Session time"
        value={formatDuration(summary.totalSessionTimeSec)}
        delta={percentChange(summary.totalSessionTimeSec, previous.totalSessionTimeSec)}
      />
    </Col>
  </Row>
);

export default SitesKpiCards;
