"use client";

import React from "react";
import { Card, Col, Row, Statistic } from "antd";
import {
  CalendarOutlined,
  HistoryOutlined,
  TeamOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import type { ActivityLogMeta } from "../types";

type Props = {
  meta?: ActivityLogMeta;
  loading?: boolean;
};

const ActivityLogStats: React.FC<Props> = ({ meta, loading }) => (
  <Row gutter={[16, 16]}>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Matching entries"
          value={meta?.total ?? 0}
          prefix={<UnorderedListOutlined />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Today"
          value={meta?.todayCount ?? 0}
          prefix={<CalendarOutlined style={{ color: "#1677ff" }} />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Last 24 hours"
          value={meta?.recentCount ?? 0}
          prefix={<HistoryOutlined style={{ color: "#722ed1" }} />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <Statistic
          loading={loading}
          title="Actors today"
          value={meta?.actorsToday ?? 0}
          prefix={<TeamOutlined style={{ color: "#52c41a" }} />}
        />
      </Card>
    </Col>
  </Row>
);

export default ActivityLogStats;
