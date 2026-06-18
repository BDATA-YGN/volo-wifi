"use client";

import React from "react";
import { Card, Col, Row, Statistic } from "antd";
import {
  FileTextOutlined,
  HistoryOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import type { ChangelogMeta } from "../types";

type Props = {
  meta?: ChangelogMeta;
  loading?: boolean;
  mode: "list" | "detail";
};

const ChangelogStats: React.FC<Props> = ({ meta, loading, mode }) => {
  if (mode === "list") {
    return (
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card size="small" styles={{ body: { padding: 16 } }}>
            <Statistic
              loading={loading}
              title="Tenants"
              value={meta?.orgCount ?? 0}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" styles={{ body: { padding: 16 } }}>
            <Statistic
              loading={loading}
              title="Total changelog entries"
              value={meta?.totalEntries ?? 0}
              prefix={<HistoryOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" styles={{ body: { padding: 16 } }}>
            <Statistic
              loading={loading}
              title="Tenants with history"
              value={meta?.orgsWithHistory ?? 0}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
      </Row>
    );
  }

  const counts = meta?.countsByChangeType ?? {};

  return (
    <Row gutter={[16, 16]}>
      <Col xs={12} sm={6}>
        <Card size="small" styles={{ body: { padding: 16 } }}>
          <Statistic loading={loading} title="All entries" value={meta?.total ?? 0} />
        </Card>
      </Col>
      <Col xs={12} sm={6}>
        <Card size="small" styles={{ body: { padding: 16 } }}>
          <Statistic
            loading={loading}
            title="Site limit"
            value={counts.STATION_LIMIT_CHANGE ?? 0}
          />
        </Card>
      </Col>
      <Col xs={12} sm={6}>
        <Card size="small" styles={{ body: { padding: 16 } }}>
          <Statistic
            loading={loading}
            title="Status"
            value={counts.STATUS_CHANGE ?? 0}
          />
        </Card>
      </Col>
      <Col xs={12} sm={6}>
        <Card size="small" styles={{ body: { padding: 16 } }}>
          <Statistic
            loading={loading}
            title="Tier / price"
            value={
              (counts.STATION_SIZE_PRICE_CHANGE ?? 0) + (counts.PRICE_CHANGE ?? 0)
            }
          />
        </Card>
      </Col>
    </Row>
  );
};

export default ChangelogStats;
