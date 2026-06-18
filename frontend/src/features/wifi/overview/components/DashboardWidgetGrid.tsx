"use client";

import React from "react";
import Link from "next/link";
import { Badge, Card, Col, Row, Statistic, Tag, Typography, theme } from "antd";
import { WifiMutedText } from "@/features/wifi/shared/components/WifiMutedText";
import { ArrowRightOutlined } from "@ant-design/icons";
import type { OverviewSummary } from "../types";
import type { VisibleWidget } from "../hooks/useDashboardWidgets";
import { formatBytes, formatMoney } from "../utils";

const { Text, Paragraph } = Typography;

type Props = {
  widgets: VisibleWidget[];
  summary: OverviewSummary;
  currency: string;
  loading?: boolean;
};

function widgetMetrics(
  widget: VisibleWidget,
  summary: OverviewSummary,
  currency: string
): { primary: string; secondary: string } {
  switch (widget.id) {
    case "operations":
      return {
        primary: String(summary.activeSessions),
        secondary: `${summary.stalledSessions} stalled · ${formatBytes(summary.activeBytes)}`,
      };
    case "commerce":
      return {
        primary: formatMoney(summary.todayRevenue, currency),
        secondary: `${summary.todayOrders} orders · ${summary.todayPayments} payments`,
      };
    case "finance":
      return {
        primary: String(summary.pendingApprovals),
        secondary: "Pending approvals in queue",
      };
    case "network":
      return {
        primary: String(summary.siteCount),
        secondary: `${summary.partnerCount} partners on network`,
      };
    case "billing":
      return {
        primary:
          summary.siteLimit != null
            ? `${summary.licensedSites}/${summary.siteLimit}`
            : String(summary.licensedSites),
        secondary: summary.licenseStatus
          ? `License ${summary.licenseStatus.toLowerCase()}`
          : "Licensed sites",
      };
    case "analytics":
      return {
        primary: formatMoney(summary.weekRevenue, currency),
        secondary: `${summary.weekSessions} sessions · ${summary.weekOrders} orders (7d)`,
      };
    default:
      return { primary: "—", secondary: "" };
  }
}

const DashboardWidgetGrid: React.FC<Props> = ({ widgets, summary, currency, loading }) => {
  const { token } = theme.useToken();

  if (widgets.length === 0) {
    return (
      <Card size="small">
        <WifiMutedText>No dashboard widgets match your role permissions.</WifiMutedText>
      </Card>
    );
  }

  return (
    <Row gutter={[16, 16]}>
      {widgets.map((widget) => {
        const metrics = widgetMetrics(widget, summary, currency);
        return (
          <Col key={widget.id} xs={24} sm={12} lg={8}>
            <Link href={widget.href} style={{ color: "inherit" }}>
              <Card
                size="small"
                loading={loading}
                hoverable
                styles={{ body: { padding: 20, minHeight: 148 } }}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <Text strong>{widget.title}</Text>
                    {widget.highlighted ? (
                      <Badge
                        count="For your role"
                        style={{
                          backgroundColor: "#1677ff",
                          marginLeft: 8,
                          fontSize: 10,
                        }}
                      />
                    ) : null}
                  </div>
                  <ArrowRightOutlined style={{ color: token.colorTextQuaternary }} />
                </div>
                <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 12 }}>
                  {widget.description}
                </Paragraph>
                <Statistic value={metrics.primary} styles={{ content: { fontSize: 22 } }} />
                <WifiMutedText style={{ fontSize: 12 }}>{metrics.secondary}</WifiMutedText>
                {widget.highlighted ? (
                  <div className="mt-2">
                    <Tag color="blue" style={{ margin: 0 }}>
                      Recommended
                    </Tag>
                  </div>
                ) : null}
              </Card>
            </Link>
          </Col>
        );
      })}
    </Row>
  );
};

export default DashboardWidgetGrid;
