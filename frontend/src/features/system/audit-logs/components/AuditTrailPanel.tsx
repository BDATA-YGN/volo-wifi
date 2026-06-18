"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  App,
  Button,
  Card,
  DatePicker,
  Input,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
  theme,
} from "antd";
import type { TableColumnsType } from "antd";
import {
  EyeOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";

import {
  AUDIT_LOG_SEVERITIES,
  AUDIT_LOG_TYPES,
  SEVERITY_COLOR,
  TYPE_COLOR,
} from "../constant";
import {
  getAuditLogs,
  getAuditOverview,
} from "../query";
import type {
  AuditLogRecord,
  AuditOverview,
} from "../interface";
import AuditDetailDrawer from "./AuditDetailDrawer";

const { RangePicker } = DatePicker;

const formatDateTime = (iso?: string | null) =>
  iso ? dayjs(iso).format("DD MMM YYYY, HH:mm:ss") : "—";

const truncate = (s: string | null | undefined, n = 80) =>
  !s ? "—" : s.length > n ? `${s.slice(0, n)}…` : s;

const AuditTrailPanel: React.FC = () => {
  const { message } = App.useApp();
  const { token } = theme.useToken();

  const [search, setSearch] = useState("");
  const [types, setTypes] = useState<string[]>([]);
  const [severities, setSeverities] = useState<string[]>([]);
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const [rows, setRows] = useState<AuditLogRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [overview, setOverview] = useState<AuditOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [drawerRecord, setDrawerRecord] = useState<AuditLogRecord | null>(null);

  const fetchOverview = useCallback(async () => {
    try {
      const res = await getAuditOverview();
      setOverview(res?.data as AuditOverview);
    } catch (err: any) {
      message.error(err?.message || "Failed to load audit overview");
    }
  }, [message]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAuditLogs({
        search: search || undefined,
        types: types.length ? types : undefined,
        severities: severities.length ? severities : undefined,
        dateRange:
          range && range[0] && range[1]
            ? [range[0].toISOString(), range[1].toISOString()]
            : null,
        page,
        limit,
      });
      const meta = (res as any)?.meta || {};
      setRows((res?.data as AuditLogRecord[]) ?? []);
      setTotal(Number(meta.totalRows ?? 0));
    } catch (err: any) {
      message.error(err?.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [search, types, severities, range, page, limit, message]);

  useEffect(() => {
    void fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  const handleReset = () => {
    setSearch("");
    setTypes([]);
    setSeverities([]);
    setRange(null);
    setPage(1);
  };

  const handleRefresh = () => {
    void fetchRows();
    void fetchOverview();
  };

  const columns: TableColumnsType<AuditLogRecord> = useMemo(
    () => [
      {
        title: "Timestamp",
        dataIndex: "timestamp",
        key: "timestamp",
        width: 180,
        render: (v: string) => (
          <Tooltip title={dayjs(v).format("YYYY-MM-DD HH:mm:ss.SSS")}>
            <Typography.Text>{formatDateTime(v)}</Typography.Text>
          </Tooltip>
        ),
      },
      {
        title: "Type",
        dataIndex: "type",
        key: "type",
        width: 110,
        render: (v: string) => (
          <Tag color={TYPE_COLOR[v] ?? "default"} style={{ margin: 0 }}>
            {v}
          </Tag>
        ),
      },
      {
        title: "Severity",
        dataIndex: "severity",
        key: "severity",
        width: 110,
        render: (v: string) => (
          <Tag color={SEVERITY_COLOR[v as keyof typeof SEVERITY_COLOR] ?? "default"} style={{ margin: 0 }}>
            {v}
          </Tag>
        ),
      },
      {
        title: "User",
        key: "user",
        width: 220,
        render: (_: unknown, r) => (
          <div style={{ lineHeight: 1.3 }}>
            <Typography.Text strong>{r.userEmail || "—"}</Typography.Text>
            <br />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {truncate(r.userId, 24)}
            </Typography.Text>
          </div>
        ),
      },
      {
        title: "Action",
        dataIndex: "action",
        key: "action",
        ellipsis: true,
        render: (v: string) => (
          <Typography.Text code style={{ fontSize: 12 }}>
            {v}
          </Typography.Text>
        ),
      },
      {
        title: "Resource",
        dataIndex: "resource",
        key: "resource",
        width: 160,
        ellipsis: true,
      },
      {
        title: "IP",
        dataIndex: "ipAddress",
        key: "ipAddress",
        width: 130,
        render: (v: string) => v || "—",
      },
      {
        title: "",
        key: "actions",
        width: 48,
        align: "center",
        render: (_: unknown, record) => (
          <Tooltip title="View details">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => setDrawerRecord(record)}
            />
          </Tooltip>
        ),
      },
    ],
    [],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
        }}
      >
        <Card variant="borderless" style={{ borderRadius: token.borderRadiusLG }}>
          <Statistic title="Total events" value={overview?.totalEvents ?? 0} />
        </Card>
        <Card variant="borderless" style={{ borderRadius: token.borderRadiusLG }}>
          <Statistic
            title="Last 24 hours"
            value={overview?.events24h ?? 0}
            styles={{ content: { color: token.colorPrimary } }}
          />
        </Card>
        <Card variant="borderless" style={{ borderRadius: token.borderRadiusLG }}>
          <Statistic
            title="Errors"
            prefix={<WarningOutlined style={{ color: token.colorError }} />}
            value={overview?.totalErrors ?? 0}
            styles={{ content: { color: token.colorError } }}
          />
        </Card>
        <Card variant="borderless" style={{ borderRadius: token.borderRadiusLG }}>
          <Statistic
            title="Success rate"
            prefix={<SafetyCertificateOutlined style={{ color: token.colorSuccess }} />}
            value={overview?.successRate ?? 0}
            suffix="%"
            precision={1}
            styles={{ content: { color: token.colorSuccess } }}
          />
        </Card>
      </div>

      <Card
        variant="borderless"
        style={{
          borderRadius: token.borderRadiusLG,
          boxShadow: token.boxShadowTertiary,
        }}
        styles={{ body: { padding: 16 } }}
      >
        <Space size={[12, 12]} wrap style={{ width: "100%" }}>
          <Input.Search
            allowClear
            placeholder="Search action, resource, user, details…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={() => setPage(1)}
            style={{ minWidth: 280 }}
          />
          <Select
            mode="multiple"
            allowClear
            placeholder="Type"
            value={types}
            onChange={(v) => {
              setTypes(v);
              setPage(1);
            }}
            options={AUDIT_LOG_TYPES.map((t) => ({ label: t, value: t }))}
            style={{ minWidth: 200 }}
            maxTagCount="responsive"
          />
          <Select
            mode="multiple"
            allowClear
            placeholder="Severity"
            value={severities}
            onChange={(v) => {
              setSeverities(v);
              setPage(1);
            }}
            options={AUDIT_LOG_SEVERITIES.map((t) => ({ label: t, value: t }))}
            style={{ minWidth: 180 }}
            maxTagCount="responsive"
          />
          <RangePicker
            showTime
            value={range as any}
            onChange={(val) => {
              setRange(val as any);
              setPage(1);
            }}
          />
          <Button onClick={handleReset}>Reset</Button>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>
            Refresh
          </Button>
        </Space>
      </Card>

      <Card
        variant="borderless"
        style={{
          borderRadius: token.borderRadiusLG,
          boxShadow: token.boxShadowTertiary,
        }}
        styles={{ body: { padding: 0 } }}
      >
        <Table<AuditLogRecord>
          rowKey="id"
          size="middle"
          loading={loading}
          columns={columns}
          dataSource={rows}
          onRow={(record) => ({ onClick: () => setDrawerRecord(record) })}
          pagination={{
            current: page,
            pageSize: limit,
            total,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (t, range) => `${range[0]}–${range[1]} of ${t}`,
            onChange: (p, ps) => {
              setPage(p);
              setLimit(ps);
            },
          }}
          scroll={{ x: 1100 }}
          style={{ cursor: "pointer" }}
        />
      </Card>

      <AuditDetailDrawer
        open={!!drawerRecord}
        record={drawerRecord}
        onClose={() => setDrawerRecord(null)}
      />
    </div>
  );
};

export default AuditTrailPanel;
