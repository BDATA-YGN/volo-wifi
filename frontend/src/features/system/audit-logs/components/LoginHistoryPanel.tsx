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
  ClockCircleOutlined,
  LoginOutlined,
  ReloadOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";

import { getLoginLogs, getLoginOverview } from "../query";
import type { LoginLogRecord, LoginOverview } from "../interface";

const { RangePicker } = DatePicker;

const formatDateTime = (iso?: string | null) =>
  iso ? dayjs(iso).format("DD MMM YYYY, HH:mm:ss") : "—";

const LOGIN_TYPE_COLOR: Record<string, string> = {
  EMAIL: "blue",
  GOOGLE: "geekblue",
  FACEBOOK: "magenta",
  APPLE: "purple",
  PHONE: "orange",
  OTP: "gold",
};

const PLATFORM_COLOR: Record<string, string> = {
  WEB: "blue",
  ANDROID: "green",
  IOS: "purple",
  MOBILE: "cyan",
};

const LoginHistoryPanel: React.FC = () => {
  const { message } = App.useApp();
  const { token } = theme.useToken();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [platformFilter, setPlatformFilter] = useState<string | undefined>(
    undefined,
  );
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const [rows, setRows] = useState<LoginLogRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [overview, setOverview] = useState<LoginOverview | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchOverview = useCallback(async () => {
    try {
      const res = await getLoginOverview();
      setOverview(res?.data as LoginOverview);
    } catch (err: any) {
      message.error(err?.message || "Failed to load login overview");
    }
  }, [message]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getLoginLogs({
        search: search || undefined,
        type: typeFilter,
        platform: platformFilter,
        dateRange:
          range && range[0] && range[1]
            ? [range[0].toISOString(), range[1].toISOString()]
            : null,
        page,
        limit,
      });
      const meta = (res as any)?.meta || {};
      setRows((res?.data as LoginLogRecord[]) ?? []);
      setTotal(Number(meta.totalRows ?? 0));
    } catch (err: any) {
      message.error(err?.message || "Failed to load login logs");
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, platformFilter, range, page, limit, message]);

  useEffect(() => {
    void fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  // Derive distinct type/platform values from the visible page for filter dropdowns,
  // so the filters reflect data actually present even if the enum grows later.
  const typeOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.type && set.add(r.type));
    return Array.from(set).sort().map((t) => ({ label: t, value: t }));
  }, [rows]);

  const platformOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.loginPlatform && set.add(r.loginPlatform));
    return Array.from(set).sort().map((t) => ({ label: t, value: t }));
  }, [rows]);

  const handleReset = () => {
    setSearch("");
    setTypeFilter(undefined);
    setPlatformFilter(undefined);
    setRange(null);
    setPage(1);
  };

  const handleRefresh = () => {
    void fetchRows();
    void fetchOverview();
  };

  const columns: TableColumnsType<LoginLogRecord> = useMemo(
    () => [
      {
        title: "When",
        dataIndex: "loginDateTime",
        key: "loginDateTime",
        width: 200,
        render: (v: string | null) => (
          <Tooltip title={v ? dayjs(v).format("YYYY-MM-DD HH:mm:ss") : ""}>
            <Typography.Text>{formatDateTime(v)}</Typography.Text>
          </Tooltip>
        ),
      },
      {
        title: "User",
        key: "user",
        width: 240,
        render: (_: unknown, r) => (
          <div style={{ lineHeight: 1.3 }}>
            <Typography.Text strong>{r.userEmail || "—"}</Typography.Text>
            <br />
            {r.userId ? (
              <Typography.Text
                type="secondary"
                style={{ fontSize: 12 }}
                copyable={{ text: r.userId }}
              >
                {r.userId.length > 14 ? `${r.userId.slice(0, 14)}…` : r.userId}
              </Typography.Text>
            ) : (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                anonymous
              </Typography.Text>
            )}
          </div>
        ),
      },
      {
        title: "IP",
        dataIndex: "ipAddress",
        key: "ipAddress",
        width: 140,
        render: (v: string | null) => v || "—",
      },
      {
        title: "Login type",
        dataIndex: "type",
        key: "type",
        width: 130,
        render: (v: string | null) =>
          v ? (
            <Tag color={LOGIN_TYPE_COLOR[v.toUpperCase()] ?? "default"} style={{ margin: 0 }}>
              {v}
            </Tag>
          ) : (
            "—"
          ),
      },
      {
        title: "Platform",
        dataIndex: "loginPlatform",
        key: "loginPlatform",
        width: 130,
        render: (v: string | null) =>
          v ? (
            <Tag color={PLATFORM_COLOR[v.toUpperCase()] ?? "default"} style={{ margin: 0 }}>
              {v}
            </Tag>
          ) : (
            "—"
          ),
      },
      {
        title: "Device",
        dataIndex: "loginDevices",
        key: "loginDevices",
        ellipsis: true,
        render: (v: string | null) =>
          v ? (
            <Tooltip title={v}>
              <Typography.Text style={{ fontSize: 12 }}>{v}</Typography.Text>
            </Tooltip>
          ) : (
            "—"
          ),
      },
      {
        title: "Recorded at",
        dataIndex: "createdAt",
        key: "createdAt",
        width: 200,
        render: (v: string) => (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {formatDateTime(v)}
          </Typography.Text>
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
          <Statistic
            title="Total sign-ins"
            prefix={<LoginOutlined />}
            value={overview?.total ?? 0}
          />
        </Card>
        <Card variant="borderless" style={{ borderRadius: token.borderRadiusLG }}>
          <Statistic
            title="Last 24 hours"
            prefix={<ClockCircleOutlined style={{ color: token.colorPrimary }} />}
            value={overview?.last24h ?? 0}
            styles={{ content: { color: token.colorPrimary } }}
          />
        </Card>
        <Card variant="borderless" style={{ borderRadius: token.borderRadiusLG }}>
          <Statistic
            title="Last 7 days"
            value={overview?.last7d ?? 0}
            styles={{ content: { color: token.colorInfo } }}
          />
        </Card>
        <Card variant="borderless" style={{ borderRadius: token.borderRadiusLG }}>
          <Statistic
            title="Active users (7d)"
            prefix={<TeamOutlined style={{ color: token.colorSuccess }} />}
            value={overview?.activeUsers7d ?? 0}
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
            placeholder="Search device, platform, type…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={() => setPage(1)}
            style={{ minWidth: 280 }}
          />
          <Select
            allowClear
            placeholder="Login type"
            value={typeFilter}
            onChange={(v) => {
              setTypeFilter(v || undefined);
              setPage(1);
            }}
            options={typeOptions}
            style={{ minWidth: 160 }}
          />
          <Select
            allowClear
            placeholder="Platform"
            value={platformFilter}
            onChange={(v) => {
              setPlatformFilter(v || undefined);
              setPage(1);
            }}
            options={platformOptions}
            style={{ minWidth: 160 }}
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
        <Table<LoginLogRecord>
          rowKey="id"
          size="middle"
          loading={loading}
          columns={columns}
          dataSource={rows}
          pagination={{
            current: page,
            pageSize: limit,
            total,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (t, r) => `${r[0]}–${r[1]} of ${t}`,
            onChange: (p, ps) => {
              setPage(p);
              setLimit(ps);
            },
          }}
          scroll={{ x: 1000 }}
        />
      </Card>
    </div>
  );
};

export default LoginHistoryPanel;
