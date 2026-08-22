"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Card,
  Descriptions,
  Input,
  Space,
  Tabs,
  Table,
  Tag,
  Typography,
  theme,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { Stethoscope } from "lucide-react";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import { getApiErrorMessage } from "@/common/exceptions/handleApiError";
import WifiOrgScopeBar from "@/features/wifi/shared/components/WifiOrgScopeBar";
import { formatWifiDateTimeWithSeconds } from "@/features/wifi/shared/format";
import { VoucherCodeText } from "@/features/wifi/shared/components/VoucherCodeText";
import { formatBytes, formatSessionDuration, formatStatusLabel } from "@/features/wifi/commerce/access-tokens/utils";
import { STATUS_COLOR } from "@/features/wifi/commerce/access-tokens/constant";
import { SEVERITY_ALERT } from "./constant";
import { useCommerceTokenDiagnose } from "./useCommerceTokenDiagnose";
import type { DiagnoseMeta, DiagnoseResult, DiagnoseTimelineEvent } from "./types";
import type { CredentialLifecycleAction } from "@/features/wifi/commerce/access-tokens/types";
import { applyDiagnoseTokenAction } from "./query";

const { Paragraph, Text } = Typography;

const KIND_COLOR: Record<DiagnoseTimelineEvent["kind"], string> = {
  captive: "purple",
  accept: "green",
  reject: "red",
  "radius-start": "blue",
  "radius-interim": "cyan",
  "radius-stop": "default",
};

const TOKEN_DIAGNOSE_HISTORY_KEY = "commerce_token_diagnose_history_v1";

type HistoryEntry = {
  code: string;
  at: number;
  result: DiagnoseResult | null;
  meta: DiagnoseMeta | null;
};

const CommerceTokenDiagnosePage: React.FC = () => {
  const { message, modal } = App.useApp();
  const { token } = theme.useToken();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCode = searchParams.get("code") ?? "";

  const {
    code,
    setCode,
    submittedCode,
    runDiagnose,
    result,
    meta,
    loading,
    error,
    orgId,
    selectOrg,
    formOptions,
    loadFormOptions,
    refresh,
  } = useCommerceTokenDiagnose();

  const [history, setHistory] = React.useState<HistoryEntry[]>([]);
  const [historyActive, setHistoryActive] = React.useState<string>("");

  // Load history from browser cache (localStorage).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(TOKEN_DIAGNOSE_HISTORY_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as HistoryEntry[];
      if (!Array.isArray(parsed)) return;
      setHistory(
        parsed
          .filter((x) => typeof x?.code === "string" && x.code.trim())
          .slice(0, 5)
          .map((x) => ({
            code: x.code.trim().toUpperCase(),
            at: Number(x.at ?? 0),
            result: x.result ?? null,
            meta: x.meta ?? null,
          })),
      );
    } catch {
      // ignore corrupt cache
    }
  }, []);

  // Keep active tab synced with current URL/code.
  useEffect(() => {
    if (!initialCode.trim()) return;
    setHistoryActive(initialCode.trim().toUpperCase());
  }, [initialCode]);

  // Save last 5 searches when diagnosis completes.
  useEffect(() => {
    if (!submittedCode?.trim() || !result) return;

    const nextCode = submittedCode.trim().toUpperCase();
    setHistory((prev) => {
      const filtered = prev.filter((x) => x.code !== nextCode);
      const merged = [
        { code: nextCode, at: Date.now(), result, meta: meta ?? null },
        ...filtered,
      ].slice(0, 5);
      try {
        window.localStorage.setItem(TOKEN_DIAGNOSE_HISTORY_KEY, JSON.stringify(merged));
      } catch {
        // ignore quota/private mode
      }
      return merged;
    });
    setHistoryActive(nextCode);
  }, [meta, result, submittedCode]);

  useEffect(() => {
    void loadFormOptions().then((opts) => {
      if (initialCode.trim()) runDiagnose(initialCode);
      return opts;
    });
    // Prefill once from the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadFormOptions]);

  const memberships = meta?.memberships ?? formOptions.memberships;
  const showOrgSwitcher =
    (meta?.requiresOrgSelection || meta?.mode === "preview" || memberships.length > 1) &&
    memberships.length > 0;
  const needsOrg = Boolean(meta?.requiresOrgSelection) && !orgId;

  const submit = () => {
    const next = code.trim().toUpperCase();
    setHistoryActive(next);
    runDiagnose(next);
    const params = new URLSearchParams();
    if (next) params.set("code", next);
    router.replace(
      params.size ? `/wifi/commerce/token-diagnose?${params.toString()}` : "/wifi/commerce/token-diagnose"
    );
  };

  const activeCode = historyActive || submittedCode || initialCode || "";
  const activeHistory = history.find((item) => item.code === activeCode) ?? null;
  const activeResult =
    activeCode && submittedCode?.trim().toUpperCase() === activeCode && result
      ? result
      : activeHistory?.result ?? null;
  const activeMeta =
    activeCode && submittedCode?.trim().toUpperCase() === activeCode && meta
      ? meta
      : activeHistory?.meta ?? null;

  const handleTokenAction = async (action: CredentialLifecycleAction) => {
    if (!activeResult?.token?.id) return;
    if (!activeMeta?.orgId) {
      message.warning("Select a tenant first.");
      return;
    }

    const copy: Record<
      CredentialLifecycleAction,
      { title: string; content: string; okText: string; success: string }
    > = {
      pause: {
        title: "Pause this token?",
        content: "The customer will not be able to log in until the token is unlocked.",
        okText: "Pause",
        success: "Token paused.",
      },
      unlock: {
        title: "Unlock this token?",
        content: "The customer can log in again if the plan quota allows.",
        okText: "Unlock",
        success: "Token unlocked.",
      },
      allowNewDevice: {
        title: "Allow new device for this token?",
        content:
          "Clears recent captive portal holds and soft-ends open RADIUS sessions so another device can login. Status is not changed.",
        okText: "Allow new device",
        success: "Device slot released. Re-diagnosing…",
      },
      clearSessions: {
        title: "Clear sessions for this token?",
        content:
          "Soft-ends open RADIUS sessions, repairs inflated Session-Timeout accounting, and restores the token if time remains.",
        okText: "Clear sessions",
        success: "Sessions cleared. Re-diagnosing…",
      },
      restoreActivated: {
        title: "Restore this token to Activated?",
        content:
          "Clears leftover sessions and sets status back to Activated (or Expired if calendar expiry already passed). Use this when the token was wrongly marked Consumed after real use.",
        okText: "Restore to activated",
        success: "Token restored. Re-diagnosing…",
      },
      revertToSold: {
        title: "Revert this token to Sold?",
        content:
          "Clears leftover sessions, clears activatedAt, and sets status to Sold. Use this when the token was never used but still became Consumed.",
        okText: "Revert to sold",
        success: "Token reverted to sold. Re-diagnosing…",
      },
    };

    const selected = copy[action];
    modal.confirm({
      title: selected.title,
      content: selected.content,
      okText: selected.okText,
      onOk: async () => {
        try {
          await applyDiagnoseTokenAction({
            tokenId: activeResult.token.id,
            action,
            orgId: activeMeta.orgId,
            resellerId: activeMeta.resellerId ?? undefined,
          });
          message.success(selected.success);
          if (activeCode) {
            runDiagnose(activeCode);
          }
          await refresh();
        } catch (err) {
          message.error(getApiErrorMessage(err, "Failed to update token"));
        }
      },
    });
  };

  const timelineColumns: ColumnsType<DiagnoseTimelineEvent> = [
    {
      title: "Time",
      dataIndex: "at",
      width: 200,
      render: (value: string) => formatWifiDateTimeWithSeconds(value),
    },
    {
      title: "Event",
      dataIndex: "kind",
      width: 140,
      render: (kind: DiagnoseTimelineEvent["kind"], row) => (
        <Tag color={KIND_COLOR[kind]}>{row.label}</Tag>
      ),
    },
    {
      title: "Detail",
      dataIndex: "detail",
      render: (value: string | null) => value || "—",
    },
  ];

  const inflatedSessions = activeResult?.radiusSessions?.filter((s) => s.inflated) ?? [];
  const likelyShortTimeMismatch = inflatedSessions.some(
    (s) => s.wallSeconds <= 60 && s.billedSeconds >= 300,
  );

  const clientMacs = Array.from(
    new Set([
      ...(activeResult?.captiveLogins?.map((l) => l.mac).filter(Boolean) ?? []),
      ...(activeResult?.authEvents?.map((e) => e.callingStationId).filter(Boolean) ?? []),
      ...(activeResult?.radiusSessions?.map((s) => s.callingStationId).filter(Boolean) ?? []),
    ]),
  );

  const clientIps = Array.from(
    new Set([
      ...(activeResult?.captiveLogins?.map((l) => l.ip).filter(Boolean) ?? []),
      ...(activeResult?.radiusSessions?.map((s) => s.framedIpAddress).filter(Boolean) ?? []),
    ]),
  );

  return (
    <div className="p-0">
      <CommonHeader icon={Stethoscope} />

      <div
        style={{
          padding: token.paddingLG,
          background: token.colorBgLayout,
          minHeight: "calc(100vh - var(--content-header-height))",
        }}
      >
        <WifiOrgScopeBar
          memberships={memberships}
          orgId={orgId}
          showOrgSwitcher={showOrgSwitcher}
          needsOrg={needsOrg}
          onSelectOrg={selectOrg}
          requiredDescription="Choose a tenant to diagnose a token for that organization."
        />

        <Card className="mb-4">
          <Space.Compact style={{ width: "100%", maxWidth: 520 }}>
            <Input
              size="large"
              placeholder="Token code (e.g. Z5AAD2)"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onPressEnter={submit}
              allowClear
            />
            <Button size="large" type="primary" loading={loading} onClick={submit} disabled={!code.trim()}>
              Diagnose
            </Button>
          </Space.Compact>
        </Card>

        {history.length > 0 ? (
          <Card className="mb-4" size="small" title="Search history (last 5)">
            <Tabs
              size="small"
              activeKey={activeCode || history[0]?.code}
              onChange={(key) => {
                const next = String(key).toUpperCase();
                setHistoryActive(next);
                setCode(next);
                const params = new URLSearchParams();
                params.set("code", next);
                router.replace(`/wifi/commerce/token-diagnose?${params.toString()}`);
              }}
              items={history.map((h) => ({
                key: h.code,
                label: h.code,
              }))}
            />
          </Card>
        ) : null}

        {error ? (
          <Alert
            type="error"
            showIcon
            className="mb-4"
            message={getApiErrorMessage(error, "Diagnosis failed")}
          />
        ) : null}

        {needsOrg ? (
          <Alert type="info" showIcon message="Select a tenant first, then enter a token code." />
        ) : null}

        {activeResult ? (
          <>
            <Alert
              className="mb-4"
              type={SEVERITY_ALERT[activeResult.verdict.severity]}
              showIcon
              message={activeResult.verdict.title}
              description={
                <div>
                  <Paragraph style={{ marginBottom: 8 }}>{activeResult.verdict.summary}</Paragraph>
                  {activeResult.verdict.actions.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {activeResult.verdict.actions.map((action) => (
                        <li key={action}>{action}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              }
            />

            {activeResult.findings.length > 0 ? (
              <Card title="Additional findings" className="mb-4" size="small">
                {activeResult.findings.map((finding) => (
                  <Alert
                    key={finding.code + finding.title}
                    className="mb-2"
                    type={SEVERITY_ALERT[finding.severity]}
                    showIcon
                    message={finding.title}
                    description={finding.detail}
                  />
                ))}
              </Card>
            ) : null}

            {activeResult.token ? (
              <Card
                title="Token"
                className="mb-4"
                size="small"
                extra={
                  <Space wrap>
                    {activeResult.token.actions?.canClearSessions ? (
                      <Button size="small" onClick={() => void handleTokenAction("clearSessions")}>
                        Clear sessions
                      </Button>
                    ) : null}
                    {activeResult.token.actions?.canRestoreActivated ? (
                      <Button size="small" type="primary" onClick={() => void handleTokenAction("restoreActivated")}>
                        Restore to activated
                      </Button>
                    ) : null}
                    {activeResult.token.actions?.canRevertToSold ? (
                      <Button size="small" onClick={() => void handleTokenAction("revertToSold")}>
                        Revert to sold
                      </Button>
                    ) : null}
                    {activeResult.token.actions?.canAllowNewDevice ? (
                      <Button size="small" onClick={() => void handleTokenAction("allowNewDevice")}>
                        Allow new device
                      </Button>
                    ) : null}
                    {activeResult.token.actions?.canPause ? (
                      <Button size="small" onClick={() => void handleTokenAction("pause")}>
                        Pause
                      </Button>
                    ) : null}
                    {activeResult.token.actions?.canUnlock ? (
                      <Button size="small" onClick={() => void handleTokenAction("unlock")}>
                        Unlock
                      </Button>
                    ) : null}
                    <Link href="/wifi/commerce/access-tokens">Open Access Tokens</Link>
                  </Space>
                }
              >
                <Descriptions column={{ xs: 1, sm: 2 }} size="small" bordered>
                  <Descriptions.Item label="Code">
                    <VoucherCodeText value={activeResult.token.token ?? activeResult.code} copyable />
                  </Descriptions.Item>
                  <Descriptions.Item label="Status">
                    <Tag color={STATUS_COLOR[activeResult.token.status as keyof typeof STATUS_COLOR]}>
                      {formatStatusLabel(activeResult.token.status)}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Plan">
                    {activeResult.token.plan.code} — {activeResult.token.plan.name}
                  </Descriptions.Item>
                  <Descriptions.Item label="Site">
                    {activeResult.token.station
                      ? `${activeResult.token.station.code} — ${activeResult.token.station.name}`
                      : "—"}
                  </Descriptions.Item>
                  <Descriptions.Item label="NAS identity">
                    {activeResult.token.station?.nasIdentifier ?? "—"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Remaining time">
                    {activeResult.token.timeRemainingSec != null
                      ? `${Math.floor(activeResult.token.timeRemainingSec / 3600)}h ${Math.floor(
                          (activeResult.token.timeRemainingSec % 3600) / 60
                        )}m`
                      : "—"}
                    {activeResult.token.planQuotaSec != null
                      ? ` / ${Math.round(activeResult.token.planQuotaSec / 3600)}h plan`
                      : ""}
                  </Descriptions.Item>
                  <Descriptions.Item label="Created">
                    {formatWifiDateTimeWithSeconds(activeResult.token.createdAt)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Last updated">
                    {formatWifiDateTimeWithSeconds(activeResult.token.updatedAt)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Sold">
                    {formatWifiDateTimeWithSeconds(activeResult.token.soldAt)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Activated">
                    {formatWifiDateTimeWithSeconds(activeResult.token.activatedAt)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Expires">
                    {formatWifiDateTimeWithSeconds(activeResult.token.expiresAt)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Revoked">
                    {formatWifiDateTimeWithSeconds(activeResult.token.revokedAt)}
                  </Descriptions.Item>
                </Descriptions>
                <div className="mt-3">
                  <Text type="secondary">
                    Captive {activeResult.counts.captive} · Accept {activeResult.counts.accept} · Reject{" "}
                    {activeResult.counts.reject} · RADIUS {activeResult.counts.radiusSessions}
                    {activeResult.counts.archiveSessions
                      ? ` (+${activeResult.counts.archiveSessions} archived)`
                      : ""}
                  </Text>
                </div>
              </Card>
            ) : null}

            {(clientMacs.length > 0 || clientIps.length > 0) ? (
              <Card title="Client info" className="mb-4" size="small">
                <Descriptions column={{ xs: 1, sm: 2 }} size="small" bordered>
                  <Descriptions.Item label="MAC">
                    {clientMacs.length > 0 ? clientMacs.join(", ") : "—"}
                  </Descriptions.Item>
                  <Descriptions.Item label="IP">
                    {clientIps.length > 0 ? clientIps.join(", ") : "—"}
                  </Descriptions.Item>
                  <Descriptions.Item label="NAS identifier">
                    {activeResult.radiusSessions[0]?.nasIdentifier ?? activeResult.token?.station?.nasIdentifier ?? "—"}
                  </Descriptions.Item>
                  <Descriptions.Item label="NAS IP">
                    {activeResult.radiusSessions[0]?.nasIpAddress ?? "—"}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            ) : null}

            {activeResult.captiveLogins.length > 0 ? (
              <Card title="Captive portal logins" className="mb-4" size="small">
                <Table
                  rowKey="id"
                  size="small"
                  pagination={false}
                  dataSource={activeResult.captiveLogins}
                  columns={[
                    {
                      title: "Time",
                      dataIndex: "createdAt",
                      width: 200,
                      render: (value: string) => formatWifiDateTimeWithSeconds(value),
                    },
                    { title: "Username / token", dataIndex: "username", width: 220 },
                    { title: "IP", dataIndex: "ip", width: 140, render: (v: string | null) => v ?? "—" },
                    {
                      title: "MAC",
                      dataIndex: "mac",
                      width: 170,
                      render: (v: string | null) => v ?? "—",
                    },
                  ]}
                />
              </Card>
            ) : null}

            {activeResult.authEvents.length > 0 ? (
              <Card title="RADIUS auth events (radpostauth)" className="mb-4" size="small">
                <Table
                  rowKey="id"
                  size="small"
                  pagination={false}
                  dataSource={activeResult.authEvents}
                  columns={[
                    {
                      title: "Time",
                      dataIndex: "authdate",
                      width: 200,
                      render: (value: string) => formatWifiDateTimeWithSeconds(value),
                    },
                    {
                      title: "Outcome",
                      dataIndex: "outcome",
                      width: 110,
                      render: (value: string) => (
                        <Tag color={value === "ACCEPT" ? "green" : value === "REJECT" ? "red" : "default"}>
                          {value}
                        </Tag>
                      ),
                    },
                    {
                      title: "Reply",
                      dataIndex: "reply",
                      width: 260,
                      render: (v: string | null) => v ?? "—",
                    },
                    {
                      title: "Calling station (MAC)",
                      dataIndex: "callingStationId",
                      width: 190,
                      render: (v: string | null) => v ?? "—",
                    },
                    {
                      title: "Called station",
                      dataIndex: "calledStationId",
                      width: 160,
                      render: (v: string | null) => v ?? "—",
                    },
                  ]}
                />
              </Card>
            ) : null}

            {likelyShortTimeMismatch || inflatedSessions.length > 0 ? (
              <Card title="Inflated billing analysis" className="mb-4" size="small">
                <p style={{ marginTop: 0, marginBottom: 12 }}>
                  Detected {inflatedSessions.length} RADIUS session(s) where <b>wall time</b> is much
                  smaller than <b>billed time</b>. This usually indicates leftover hotspot host/cookie
                  or session-time copied into STOP.
                </p>

                <Table
                  rowKey={(row) => `${row.id}-${row.startedAt}`}
                  size="small"
                  pagination={false}
                  dataSource={inflatedSessions}
                  columns={[
                    {
                      title: "Started",
                      dataIndex: "startedAt",
                      width: 200,
                      render: (value: string) => formatWifiDateTimeWithSeconds(value),
                    },
                    { title: "NAS time (Acct-Session-Time)", dataIndex: "sessionTimeSec", render: (v: number | null) => v ?? "—" },
                    { title: "Wall clock (seconds)", dataIndex: "wallSeconds" },
                    { title: "Billed seconds", dataIndex: "billedSeconds" },
                    {
                      title: "Total bytes",
                      dataIndex: "totalBytes",
                      render: (v: number | null) => formatBytes(v),
                    },
                    {
                      title: "Cause",
                      dataIndex: "terminateCause",
                      render: (v: string | null) => v ?? "—",
                    },
                  ]}
                />

                <div className="mt-3 flex flex-wrap gap-2 items-center">
                  {activeResult.token?.actions?.canClearSessions ? (
                    <Button type="primary" onClick={() => void handleTokenAction("clearSessions")}>
                      Clear sessions
                    </Button>
                  ) : null}
                  {activeResult.token?.actions?.canAllowNewDevice ? (
                    <Button onClick={() => void handleTokenAction("allowNewDevice")}>
                      Allow new device
                    </Button>
                  ) : null}
                  {activeResult.token?.actions?.canRestoreActivated ? (
                    <Button onClick={() => void handleTokenAction("restoreActivated")}>
                      Restore to activated
                    </Button>
                  ) : null}
                  {activeResult.token?.actions?.canRevertToSold ? (
                    <Button onClick={() => void handleTokenAction("revertToSold")}>
                      Revert to sold
                    </Button>
                  ) : null}
                </div>
              </Card>
            ) : null}

            {activeResult.timeline.length > 0 ? (
              <Card title="Timeline" className="mb-4" size="small">
                <Table
                  rowKey={(row) => `${row.at}-${row.kind}-${row.label}`}
                  size="small"
                  pagination={false}
                  columns={timelineColumns}
                  dataSource={activeResult.timeline}
                />
              </Card>
            ) : null}

            {activeResult.radiusSessions.length > 0 ? (
              <Card title="RADIUS sessions" className="mb-4" size="small">
                <Table
                  rowKey="id"
                  size="small"
                  pagination={false}
                  dataSource={activeResult.radiusSessions}
                  columns={[
                    {
                      title: "MAC",
                      dataIndex: "callingStationId",
                      width: 170,
                      render: (v: string | null) => v ?? "—",
                    },
                    {
                      title: "IP",
                      dataIndex: "framedIpAddress",
                      width: 160,
                      render: (v: string | null) => v ?? "—",
                    },
                    {
                      title: "Started",
                      dataIndex: "startedAt",
                      render: (value: string) => formatWifiDateTimeWithSeconds(value),
                    },
                    {
                      title: "Last RADIUS update",
                      dataIndex: "lastInterimAt",
                      width: 200,
                      render: (value: string | null, row) =>
                        formatWifiDateTimeWithSeconds(value ?? row.stoppedAt),
                    },
                    { title: "Status", dataIndex: "status" },
                    {
                      title: "NAS time",
                      dataIndex: "sessionTimeSec",
                      render: (value: number | null, row) =>
                        formatSessionDuration(value, row.startedAt, row.stoppedAt, row.status),
                    },
                    {
                      title: "Wall / billed",
                      key: "wallBilled",
                      width: 150,
                      render: (_, row) =>
                        `${row.wallSeconds}s / ${row.billedSeconds}s`,
                    },
                    {
                      title: "Data",
                      dataIndex: "totalBytes",
                      render: (value: number | null) => formatBytes(value),
                    },
                    { title: "Cause", dataIndex: "terminateCause", render: (v: string | null) => v || "—" },
                    {
                      title: "Flag",
                      dataIndex: "inflated",
                      render: (inflated: boolean) =>
                        inflated ? <Tag color="orange">Inflated time</Tag> : "—",
                    },
                  ]}
                />
              </Card>
            ) : null}

            {activeResult.relatedMacActivity.length > 0 ? (
              <Card title="Same MAC on other tokens" className="mb-4" size="small">
                <Table
                  rowKey={(row) => `${row.acctSessionId}-${row.startedAt}`}
                  size="small"
                  pagination={false}
                  dataSource={activeResult.relatedMacActivity}
                  columns={[
                    { title: "Token", dataIndex: "userName" },
                    { title: "Status", dataIndex: "status" },
                    {
                      title: "Started",
                      dataIndex: "startedAt",
                      render: (value: string) => formatWifiDateTimeWithSeconds(value),
                    },
                    { title: "NAS", dataIndex: "nasIdentifier", render: (v: string | null) => v || "—" },
                    { title: "Cause", dataIndex: "terminateCause", render: (v: string | null) => v || "—" },
                  ]}
                />
              </Card>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
};

export default CommerceTokenDiagnosePage;
