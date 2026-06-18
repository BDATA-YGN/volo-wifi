"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  App,
  Button,
  Card,
  Col,
  Empty,
  Input,
  Progress,
  Row,
  Segmented,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  theme,
} from "antd";
import {
  AppstoreOutlined,
  CheckCircleFilled,
  CloseCircleOutlined,
  EyeFilled,
  EyeInvisibleOutlined,
  InfoCircleOutlined,
  LockFilled,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SaveOutlined,
  SearchOutlined,
  UnlockOutlined,
} from "@ant-design/icons";
import { useTranslations } from "next-intl";

import * as MainUseCase from "@/features/core/permissions/usePermission";
import { useSafeMenuTranslate } from "@/features/core/permissions/useSafeMenuTranslate";

const { Title, Text } = Typography;

export type Mapping = {
  roleId: number;
  settingKey: string;
  enable: boolean;
  visibility: boolean;
  createdAt: Date;
};

type FilterMode = "all" | "granted" | "visible" | "none";

interface SelectedRole {
  roleId: number;
  roleName: string;
}

interface Props {
  selectedRole: SelectedRole | null;
  /** Called whenever mapping state changes so the parent can update sidebar counts. */
  onMappingsChange?: (roleId: number, mappings: Mapping[]) => void;
}

const StatCard: React.FC<{
  title: string;
  value: number;
  total?: number;
  color: string;
  bg: string;
  icon: React.ReactNode;
}> = ({ title, value, total, color, bg, icon }) => (
  <div
    style={{
      padding: 12,
      borderRadius: 10,
      background: bg,
      display: "flex",
      alignItems: "center",
      gap: 12,
      height: "100%",
    }}
  >
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 8,
        background: "#fff",
        color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 16,
        flexShrink: 0,
      }}
    >
      {icon}
    </div>
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          fontSize: 12,
          color: "#64748b",
          letterSpacing: 0.2,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color }}>
        {value}
        {typeof total === "number" && (
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "#94a3b8",
              marginLeft: 4,
            }}
          >
            / {total}
          </span>
        )}
      </div>
    </div>
  </div>
);

const RolePermissionsPanel: React.FC<Props> = ({
  selectedRole,
  onMappingsChange,
}) => {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const tp = useTranslations("permissions");
  const buttonTexts = useTranslations("buttons");
  const safeMenuTranslate = useSafeMenuTranslate();

  const {
    fetchMapRoleSettings,
    fetchMngRoleSettings,
    updateMapRoleSetting,
    mngRoleSettingsList,
    mapRoleSettingsList,
    loading,
  } = MainUseCase.useManagement();

  const [tempMappings, setTempMappings] = useState<Mapping[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  // Load setting catalog once on mount
  useEffect(() => {
    void fetchMngRoleSettings("", { take: 1000, skip: 0, page: 1, limit: 1000 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh mappings whenever the selected role changes
  useEffect(() => {
    setSearchQuery("");
    setFilterMode("all");
    if (!selectedRole) {
      setTempMappings([]);
      return;
    }
    void fetchMapRoleSettings("", {
      take: 1000,
      skip: 0,
      page: 1,
      limit: 1000,
      search: selectedRole.roleId,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRole?.roleId]);

  const buildDefaultMappings = (roleId: number): Mapping[] =>
    mngRoleSettingsList.map((setting: any) => ({
      roleId,
      settingKey: setting.id,
      enable: false,
      visibility: false,
      createdAt: new Date(),
    }));

  // Sync mappings from store into local state
  useEffect(() => {
    if (!selectedRole) return;
    const nextMappings =
      mapRoleSettingsList.length === 0
        ? buildDefaultMappings(selectedRole.roleId)
        : (mapRoleSettingsList as Mapping[]);
    setTempMappings(nextMappings);
    onMappingsChange?.(selectedRole.roleId, nextMappings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapRoleSettingsList, selectedRole?.roleId, mngRoleSettingsList.length]);

  const handlePermissionChange = (
    settingKey: string,
    type: "enable" | "visibility",
    value: boolean,
  ) => {
    if (!selectedRole) return;
    setTempMappings((prev) => {
      const existing = prev.find((m) => m.settingKey === settingKey);
      const next = existing
        ? prev.map((m) =>
            m.settingKey === settingKey ? { ...m, [type]: value } : m,
          )
        : [
            ...prev,
            {
              roleId: selectedRole.roleId,
              settingKey,
              enable: type === "enable" ? value : false,
              visibility: type === "visibility" ? value : false,
              createdAt: new Date(),
            },
          ];
      onMappingsChange?.(selectedRole.roleId, next);
      return next;
    });
  };

  const filteredSettings = useMemo(() => {
    let result = mngRoleSettingsList;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (s: any) =>
          (s.settingKey && s.settingKey.toLowerCase().includes(q)) ||
          (s.description && s.description.toLowerCase().includes(q)) ||
          (s.id && s.id.toLowerCase().includes(q)),
      );
    }

    if (filterMode !== "all") {
      result = result.filter((s: any) => {
        const m = tempMappings.find((x) => x.settingKey === s.id);
        const enable = m?.enable ?? false;
        const visibility = m?.visibility ?? false;
        if (filterMode === "granted") return enable;
        if (filterMode === "visible") return visibility;
        if (filterMode === "none") return !enable && !visibility;
        return true;
      });
    }

    return result;
  }, [mngRoleSettingsList, searchQuery, filterMode, tempMappings]);

  const handleBulkSetAll = (type: "enable" | "visibility", value: boolean) => {
    if (!selectedRole) return;
    const keys = filteredSettings.map((s: any) => s.id);
    setTempMappings((prev) => {
      const next = [...prev];
      for (const key of keys) {
        const idx = next.findIndex((m) => m.settingKey === key);
        if (idx === -1) {
          next.push({
            roleId: selectedRole.roleId,
            settingKey: key,
            enable: type === "enable" ? value : false,
            visibility: type === "visibility" ? value : false,
            createdAt: new Date(),
          });
        } else {
          next[idx] = { ...next[idx], [type]: value };
        }
      }
      onMappingsChange?.(selectedRole.roleId, next);
      return next;
    });
  };

  const statistics = useMemo(() => {
    const total = mngRoleSettingsList.length;
    const enabled = tempMappings.filter((m) => m.enable).length;
    const visible = tempMappings.filter((m) => m.visibility).length;
    const both = tempMappings.filter((m) => m.enable && m.visibility).length;
    return { total, enabled, visible, both };
  }, [tempMappings, mngRoleSettingsList]);

  const filteredCounts = useMemo(() => {
    const inFiltered = (key: string) =>
      filteredSettings.some((s: any) => s.id === key);
    const total = filteredSettings.length;
    const enabled = tempMappings.filter((m) => m.enable && inFiltered(m.settingKey)).length;
    const visible = tempMappings.filter((m) => m.visibility && inFiltered(m.settingKey)).length;
    const both = tempMappings.filter(
      (m) => m.enable && m.visibility && inFiltered(m.settingKey),
    ).length;
    return { total, enabled, visible, both };
  }, [tempMappings, filteredSettings]);

  const accessPercent =
    statistics.total > 0
      ? Math.round((statistics.enabled / statistics.total) * 100)
      : 0;

  const handleSave = async () => {
    if (!selectedRole || tempMappings.length === 0) return;
    setIsSaving(true);
    try {
      updateMapRoleSetting("all", tempMappings);
      message.success(`Permissions for ${selectedRole.roleName} saved`);
      void fetchMapRoleSettings("", {
        take: 1000,
        skip: 0,
        page: 1,
        limit: 1000,
        search: selectedRole.roleId,
      });
    } catch {
      message.error("Failed to update permissions");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetCurrentRole = () => {
    if (!selectedRole) return;
    setTempMappings(buildDefaultMappings(selectedRole.roleId));
    message.info("Reverted unsaved changes for this role");
  };

  const kindLabel = useMemo(
    () =>
      ({
        menuGroup: { label: tp("kindMenuGroup"), color: "purple" },
        menu: { label: tp("kindMenu"), color: "blue" },
        button: { label: tp("kindButton"), color: "geekblue" },
        feature: { label: tp("kindFeature"), color: "green" },
      }) as Record<string, { label: string; color: string }>,
    [tp],
  );

  const cardStyle: React.CSSProperties = {
    borderRadius: token.borderRadiusLG,
    boxShadow:
      "0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 1px rgba(15, 23, 42, 0.03)",
  };

  if (!selectedRole) {
    return (
      <Card
        variant="borderless"
        style={cardStyle}
        styles={{ body: { padding: 48, height: "100%" } }}
      >
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div>
              <Title level={5} type="secondary" style={{ marginTop: 16 }}>
                {tp("selectRole")}
              </Title>
              <Text type="secondary">
                Select a role on the left to manage its permissions.
              </Text>
            </div>
          }
        />
      </Card>
    );
  }

  const columns = [
    {
      title: tp("settingKey"),
      dataIndex: "settingKey",
      key: "settingKey",
      width: 320,
      render: (_: any, record: any) => (
        <Space size={6} wrap style={{ maxWidth: "100%" }}>
          <Tag
            color="blue"
            style={{
              margin: 0,
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontSize: 12,
              maxWidth: "100%",
              whiteSpace: "normal",
              wordBreak: "break-all",
              lineHeight: 1.4,
            }}
          >
            {record.settingKey}
          </Tag>
          {record.kind && (
            <Tag
              color={(kindLabel[record.kind] ?? kindLabel.feature).color}
              style={{ margin: 0 }}
            >
              {(kindLabel[record.kind] ?? kindLabel.feature).label}
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: tp("description"),
      dataIndex: "description",
      key: "description",
      render: (_: any, record: any) => {
        const translated = safeMenuTranslate(record.description);
        const hasTranslation = translated && translated !== record.description;
        return (
          <div style={{ minWidth: 0 }}>
            <Text style={{ fontSize: 13 }}>
              {translated || record.description || "—"}
            </Text>
            {hasTranslation && (
              <div>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {record.description}
                </Text>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: (
        <Tooltip title="User can perform actions in this section">
          <Space>
            <LockFilled style={{ color: token.colorPrimary }} />
            <span>{tp("access")}</span>
            <InfoCircleOutlined style={{ color: token.colorTextTertiary }} />
          </Space>
        </Tooltip>
      ),
      key: "enable",
      width: 120,
      align: "center" as const,
      render: (_: any, record: any) => {
        const mapping = tempMappings.find((m) => m.settingKey === record.id);
        return (
          <Switch
            checked={mapping?.enable ?? false}
            checkedChildren={<UnlockOutlined />}
            unCheckedChildren={<LockFilled />}
            onChange={(checked) =>
              handlePermissionChange(record.id!, "enable", checked)
            }
            disabled={!!loading?.fetchMapRoleSettings}
          />
        );
      },
    },
    {
      title: (
        <Tooltip title="Setting is visible to the user">
          <Space>
            <EyeFilled style={{ color: "#f59e0b" }} />
            <span>{tp("visibility")}</span>
            <InfoCircleOutlined style={{ color: token.colorTextTertiary }} />
          </Space>
        </Tooltip>
      ),
      key: "visibility",
      width: 120,
      align: "center" as const,
      render: (_: any, record: any) => {
        const mapping = tempMappings.find((m) => m.settingKey === record.id);
        return (
          <Switch
            checked={mapping?.visibility ?? false}
            checkedChildren={<EyeFilled />}
            unCheckedChildren={<EyeInvisibleOutlined />}
            onChange={(checked) =>
              handlePermissionChange(record.id!, "visibility", checked)
            }
            disabled={!!loading?.fetchMapRoleSettings}
          />
        );
      },
    },
  ];

  return (
    <Row gutter={[0, 16]}>
      {/* Stat summary */}
      <Col span={24}>
        <Card
          variant="borderless"
          style={cardStyle}
          styles={{ body: { padding: 20 } }}
        >
          <Row gutter={[12, 12]} align="middle">
            <Col xs={24} md={6}>
              <Space>
                <SafetyCertificateOutlined style={{ color: token.colorPrimary }} />
                <Text strong>{selectedRole.roleName}</Text>
                <Tag color="blue" style={{ margin: 0 }}>
                  ID {selectedRole.roleId}
                </Tag>
              </Space>
            </Col>
            <Col xs={24} md={18}>
              <Row gutter={[10, 10]}>
                <Col xs={12} md={6}>
                  <StatCard
                    title={tp("settingKey")}
                    value={statistics.total}
                    color="#0f172a"
                    bg="#f1f5f9"
                    icon={<AppstoreOutlined />}
                  />
                </Col>
                <Col xs={12} md={6}>
                  <StatCard
                    title={tp("access")}
                    value={statistics.enabled}
                    total={statistics.total}
                    color="#1677ff"
                    bg="#eff6ff"
                    icon={<LockFilled />}
                  />
                </Col>
                <Col xs={12} md={6}>
                  <StatCard
                    title={tp("visibility")}
                    value={statistics.visible}
                    total={statistics.total}
                    color="#d97706"
                    bg="#fffbeb"
                    icon={<EyeFilled />}
                  />
                </Col>
                <Col xs={12} md={6}>
                  <StatCard
                    title="Full Access"
                    value={statistics.both}
                    total={statistics.total}
                    color="#059669"
                    bg="#ecfdf5"
                    icon={<CheckCircleFilled />}
                  />
                </Col>
              </Row>
              <div style={{ marginTop: 12 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 4,
                  }}
                >
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Access progress
                  </Text>
                  <Text strong style={{ fontSize: 12 }}>
                    {statistics.enabled}/{statistics.total} ({accessPercent}%)
                  </Text>
                </div>
                <Progress
                  percent={accessPercent}
                  size="small"
                  strokeColor={{ "0%": "#1677ff", "100%": "#10b981" }}
                  showInfo={false}
                />
              </div>
            </Col>
          </Row>
        </Card>
      </Col>

      {/* Permissions table */}
      <Col span={24}>
        <Card
          variant="borderless"
          style={cardStyle}
          styles={{ body: { padding: 0 } }}
        >
          <div
            style={{
              padding: 16,
              borderBottom: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            <Row gutter={[12, 12]} align="middle" justify="space-between">
              <Col flex="auto">
                <Space wrap>
                  <Title level={5} style={{ margin: 0 }}>
                    <LockFilled
                      style={{ color: token.colorPrimary, marginRight: 8 }}
                    />
                    {tp("permissions")}
                  </Title>
                  <Tag color="blue">{selectedRole.roleName}</Tag>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Showing {filteredSettings.length} of {mngRoleSettingsList.length}
                  </Text>
                </Space>
              </Col>
              <Col>
                <Space>
                  <Tooltip title="Reset unsaved changes for this role">
                    <span>
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={handleResetCurrentRole}
                        disabled={!!loading?.fetchMapRoleSettings || isSaving}
                      >
                        Reset
                      </Button>
                    </span>
                  </Tooltip>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={handleSave}
                    loading={isSaving}
                    disabled={
                      !!loading?.fetchMapRoleSettings ||
                      isSaving ||
                      tempMappings.length === 0
                    }
                  >
                    {isSaving ? "Saving..." : buttonTexts("save")}
                  </Button>
                </Space>
              </Col>
            </Row>

            <Row gutter={[12, 12]} align="middle" style={{ marginTop: 12 }}>
              <Col xs={24} md={10}>
                <Input
                  placeholder="Search by key, description, or ID…"
                  prefix={
                    <SearchOutlined style={{ color: token.colorTextTertiary }} />
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  allowClear
                />
              </Col>
              <Col xs={24} md={14}>
                <Space wrap style={{ width: "100%", justifyContent: "flex-end" }}>
                  <Segmented
                    value={filterMode}
                    onChange={(val) => setFilterMode(val as FilterMode)}
                    options={[
                      { value: "all", label: "All" },
                      {
                        value: "granted",
                        label: (
                          <span>
                            <LockFilled
                              style={{ color: "#1677ff", marginRight: 4 }}
                            />
                            Granted
                          </span>
                        ),
                      },
                      {
                        value: "visible",
                        label: (
                          <span>
                            <EyeFilled
                              style={{ color: "#f59e0b", marginRight: 4 }}
                            />
                            Visible
                          </span>
                        ),
                      },
                      {
                        value: "none",
                        label: (
                          <span>
                            <CloseCircleOutlined
                              style={{ color: "#94a3b8", marginRight: 4 }}
                            />
                            None
                          </span>
                        ),
                      },
                    ]}
                  />
                  <Tooltip title="Grant access to all filtered rows">
                    <span>
                      <Button
                        icon={<UnlockOutlined />}
                        onClick={() => handleBulkSetAll("enable", true)}
                        disabled={
                          !!loading?.fetchMapRoleSettings ||
                          filteredSettings.length === 0
                        }
                      >
                        Grant
                      </Button>
                    </span>
                  </Tooltip>
                  <Tooltip title="Revoke access from all filtered rows">
                    <span>
                      <Button
                        icon={<LockFilled />}
                        onClick={() => handleBulkSetAll("enable", false)}
                        disabled={
                          !!loading?.fetchMapRoleSettings ||
                          filteredSettings.length === 0
                        }
                      >
                        Revoke
                      </Button>
                    </span>
                  </Tooltip>
                </Space>
              </Col>
            </Row>

            {(filterMode !== "all" || searchQuery) && (
              <div style={{ marginTop: 12 }}>
                <Space wrap size="small">
                  {searchQuery && (
                    <Tag
                      closable
                      onClose={() => setSearchQuery("")}
                      color="blue"
                    >
                      Search: &ldquo;{searchQuery}&rdquo;
                    </Tag>
                  )}
                  {filterMode !== "all" && (
                    <Tag
                      closable
                      onClose={() => setFilterMode("all")}
                      color="purple"
                    >
                      Filter: {filterMode}
                    </Tag>
                  )}
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {filteredCounts.enabled} granted · {filteredCounts.visible}{" "}
                    visible · {filteredCounts.both} full
                  </Text>
                </Space>
              </div>
            )}
          </div>

          <Table
            columns={columns}
            dataSource={filteredSettings}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "50", "100"],
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} of ${total}`,
            }}
            loading={!!loading?.fetchMapRoleSettings}
            size="middle"
            tableLayout="fixed"
            scroll={{ x: 720 }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    searchQuery || filterMode !== "all"
                      ? "No settings match the current filters"
                      : "No settings available"
                  }
                />
              ),
            }}
          />
        </Card>
      </Col>
    </Row>
  );
};

export default RolePermissionsPanel;
