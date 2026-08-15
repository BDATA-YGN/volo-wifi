"use client";

import React, { useMemo } from "react";
import { Alert, Badge, Col, Modal, Row, Statistic, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { resolveTierColor } from "@/features/wifi/shared/tier-colors";
import type { SiteDetailData, SitePlanBreakdown, SitePartnerRow } from "../types";
import { formatBytes, formatMoney, STATION_STATUS_COLOR } from "../utils";

const { Text, Title } = Typography;

type Props = {
  open: boolean;
  loading?: boolean;
  error?: unknown;
  detail: SiteDetailData | null;
  onClose: () => void;
};

function formatAmount(amount: number): string {
  return Math.round(amount).toLocaleString();
}

function share(part: number, total: number): string {
  if (total <= 0 || part <= 0) return "—";
  return `${Math.round((part / total) * 1000) / 10}%`;
}

const SiteDetailModal: React.FC<Props> = ({ open, loading, error, detail, onClose }) => {
  const site = detail?.site;
  const currency = detail?.org.currency ?? "MMK";
  const periodLabel = detail
    ? `${dayjs(detail.periodFrom).format("D MMM YYYY")} – ${dayjs(detail.periodTo).format("D MMM YYYY")}`
    : null;

  const planRows = useMemo(
    () => (detail?.byPlan ?? []).filter((row) => row.tokensCount > 0 || row.revenue > 0),
    [detail?.byPlan]
  );
  const partnerRows = useMemo(
    () =>
      (detail?.byPartner ?? []).filter(
        (row) => row.assigned || row.tokensCount > 0 || row.revenue > 0
      ),
    [detail?.byPartner]
  );

  const planColumns: ColumnsType<SitePlanBreakdown> = [
    {
      title: "Plan",
      key: "plan",
      render: (_, row) => (
        <div>
          <Text strong>{row.name}</Text>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {row.code}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: "Tokens",
      dataIndex: "tokensCount",
      key: "tokensCount",
      align: "right",
      width: 100,
      render: (value: number) => value.toLocaleString(),
    },
    {
      title: "Amount",
      dataIndex: "revenue",
      key: "revenue",
      align: "right",
      width: 120,
      render: (value: number) => formatAmount(value),
    },
    {
      title: "Share",
      key: "share",
      align: "right",
      width: 80,
      render: (_, row) => (
        <Text type="secondary">{share(row.revenue, site?.revenue ?? 0)}</Text>
      ),
    },
  ];

  const partnerColumns: ColumnsType<SitePartnerRow> = [
    {
      title: "Partner",
      key: "partner",
      render: (_, row) => (
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Text strong>{row.name}</Text>
            {row.assigned ? (
              <Tag color="blue" style={{ marginInlineEnd: 0 }}>
                Assigned
              </Tag>
            ) : null}
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {row.code}
          </Text>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (status: string) => (
        <Badge
          status={
            (STATION_STATUS_COLOR[status] as "success" | "warning" | "error" | "default") ??
            "default"
          }
          text={status}
        />
      ),
    },
    {
      title: "Tokens",
      dataIndex: "tokensCount",
      key: "tokensCount",
      align: "right",
      width: 90,
      render: (value: number) => value.toLocaleString(),
    },
    {
      title: "Amount",
      dataIndex: "revenue",
      key: "revenue",
      align: "right",
      width: 120,
      render: (value: number) => formatAmount(value),
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={880}
      destroyOnHidden
      title={
        site ? (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Title level={4} style={{ margin: 0 }}>
                {site.name}
              </Title>
              <Tag
                color={resolveTierColor(site.stationSizeCode, site.stationSizeName)}
                style={{ marginInlineEnd: 0, fontFamily: "monospace" }}
              >
                {site.stationSizeCode}
              </Tag>
              <Badge
                status={
                  (STATION_STATUS_COLOR[site.status] as
                    | "success"
                    | "warning"
                    | "error"
                    | "default") ?? "default"
                }
                text={site.status}
              />
            </div>
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
              {[site.location, periodLabel, `${site.stationSizeName} tier`].filter(Boolean).join(" · ")}
            </Text>
          </div>
        ) : (
          "Site summary"
        )
      }
    >
      <div className="flex flex-col gap-4">
        {error ? (
          <Alert
            type="error"
            showIcon
            title="Failed to load site detail"
            description={String(error)}
          />
        ) : null}
        <Row gutter={[12, 12]}>
          <Col xs={12} sm={6}>
            <Statistic
              loading={loading}
              title="Revenue"
              value={site ? formatMoney(site.revenue, currency) : "—"}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic loading={loading} title="Tokens" value={site?.itemsCount ?? 0} />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic loading={loading} title="Orders" value={site?.ordersCount ?? 0} />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              loading={loading}
              title="Commission"
              value={site ? formatMoney(site.commission, currency) : "—"}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              loading={loading}
              title="Net"
              value={site ? formatMoney(site.netRevenue, currency) : "—"}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic loading={loading} title="Sessions" value={site?.sessionsCount ?? 0} />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              loading={loading}
              title="Unique devices"
              value={site?.uniqueCredentials ?? 0}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              loading={loading}
              title="Data used"
              value={site ? formatBytes(site.totalBytes) : "—"}
            />
          </Col>
        </Row>

        <div>
          <Text strong>Sales by plan</Text>
          <Table<SitePlanBreakdown>
            className="mt-2"
            size="small"
            rowKey="planId"
            loading={loading}
            columns={planColumns}
            dataSource={planRows}
            pagination={false}
            locale={{ emptyText: "No plan sales in this period" }}
            summary={() =>
              planRows.length > 0 ? (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0}>
                    <Text strong>Total</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right">
                    <Text strong>{(site?.itemsCount ?? 0).toLocaleString()}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="right">
                    <Text strong>{formatAmount(site?.revenue ?? 0)}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="right">
                    <Text type="secondary">100%</Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              ) : null
            }
          />
        </div>

        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <Text strong>Sales by partner</Text>
            {detail ? (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {detail.assignedPartnerCount} assigned · {detail.sellingPartnerCount} selling
              </Text>
            ) : null}
          </div>
          <Table<SitePartnerRow>
            size="small"
            rowKey={(row) => row.resellerId ?? "unassigned"}
            loading={loading}
            columns={partnerColumns}
            dataSource={partnerRows}
            pagination={false}
            locale={{ emptyText: "No partners assigned or selling at this site" }}
          />
        </div>
      </div>
    </Modal>
  );
};

export default SiteDetailModal;
