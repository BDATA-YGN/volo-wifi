"use client";

import React from "react";
import { Card, Col, Row, Statistic } from "antd";
import {
  CheckCircleOutlined,
  DollarOutlined,
  TeamOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import type { LicensedSitesMeta } from "../types";
import { formatMoney } from "../../../tier-rates/platform/utils";

type Props = {
  meta?: LicensedSitesMeta;
  loading?: boolean;
  mode: "list" | "detail";
};

const LicensedSitesStats: React.FC<Props> = ({ meta, loading, mode }) => {
  if (mode === "list") {
    return (
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <Card size="small" styles={{ body: { padding: 16 } }}>
            <Statistic
              loading={loading}
              title="Tenants with subscriptions"
              value={meta?.orgCount ?? 0}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card size="small" styles={{ body: { padding: 16 } }}>
            <Statistic
              loading={loading}
              title="Total billable sites"
              value={meta?.totalBillable ?? 0}
              prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
            />
          </Card>
        </Col>
      </Row>
    );
  }

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={6}>
        <Card size="small" styles={{ body: { padding: 16 } }}>
          <Statistic
            loading={loading}
            title="Billable sites"
            value={meta?.totalBillable ?? 0}
            suffix={
              meta?.stationLimit != null ? `/ ${meta.stationLimit}` : undefined
            }
            prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={6}>
        <Card size="small" styles={{ body: { padding: 16 } }}>
          <Statistic
            loading={loading}
            title="Slots remaining"
            value={meta?.remainingSlots ?? 0}
            prefix={
              <WarningOutlined
                style={{
                  color:
                    meta?.remainingSlots === 0
                      ? "#ff4d4f"
                      : (meta?.remainingSlots ?? 0) <= 2
                        ? "#faad14"
                        : undefined,
                }}
              />
            }
          />
        </Card>
      </Col>
      <Col xs={24} sm={6}>
        <Card size="small" styles={{ body: { padding: 16 } }}>
          <Statistic
            loading={loading}
            title="Inactive sites"
            value={meta?.totalInactive ?? 0}
          />
        </Card>
      </Col>
      <Col xs={24} sm={6}>
        <Card size="small" styles={{ body: { padding: 16 } }}>
          <Statistic
            loading={loading}
            title="Est. monthly license"
            value={
              meta?.estimatedMonthlyTotal
                ? formatMoney(meta.estimatedMonthlyTotal, meta.currency)
                : "—"
            }
            prefix={<DollarOutlined />}
            styles={{ content: { fontSize: 18 } }}
          />
        </Card>
      </Col>
    </Row>
  );
};

export default LicensedSitesStats;
