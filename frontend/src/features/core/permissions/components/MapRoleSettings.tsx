"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  App,
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  Progress,
  Row,
  Segmented,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  theme,
} from "antd";
import {
  SaveOutlined,
  EyeFilled,
  EyeInvisibleOutlined,
  LockFilled,
  UnlockOutlined,
  InfoCircleOutlined,
  SearchOutlined,
  KeyOutlined,
  CheckCircleFilled,
  CloseCircleOutlined,
  ReloadOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";

import * as MainUseCase from "@/features/core/permissions/usePermission";
import { useSafeMenuTranslate } from "@/features/core/permissions/useSafeMenuTranslate";
import { useTranslations } from "next-intl";

const { Title, Text } = Typography;

type Mapping = {
  roleId: number;
  settingKey: string;
  enable: boolean;
  visibility: boolean;
  createdAt: Date;
};

type StatCardProps = {
  title: string;
  value: number;
  total?: number;
  color: string;
  bg: string;
  icon: React.ReactNode;
};

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  total,
  color,
  bg,
  icon,
}) => (
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

const MapRoleSettings = ({ activeKey }: { activeKey: string }) => {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const { token } = theme.useToken();

  const {
    fetchMngRoles,
    fetchMapRoleSettings,
    fetchMngRoleSettings,
    updateMapRoleSetting,
    mngRoleSettingsList,
    mngRolesList,
    mapRoleSettingsList,
  } = MainUseCase.useManagement();

  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [tempMappings, setTempMappings] = useState<Mapping[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<
    "all" | "granted" | "visible" | "none"
  >("all");

  const buttonTexts = useTranslations("buttons");
  const tp = useTranslations("permissions");
  const safeMenuTranslate = useSafeMenuTranslate();

  useEffect(() => {
    if (activeKey === "map") {
      void fetchInitialData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey]);

  useEffect(() => {
    if (activeKey === "map" && selectedRole !== null) {
      void fetchRoleMappings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRole]);

  useEffect(() => {
    if (selectedRole && mapRoleSettingsList) {
      if (mapRoleSettingsList.length === 0) {
        setTempMappings(createDefaultMappings());
      } else {
        setTempMappings(mapRoleSettingsList);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapRoleSettingsList, selectedRole]);

  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      await Promise.all([
        fetchMngRoleSettings("", { take: 1000, skip: 0, page: 1, limit: 1000 }),
        fetchMngRoles("", { take: 1000, skip: 0, page: 1, limit: 1000 }),
      ]);
    } catch (error) {
      message.error("Failed to fetch initial data");
    } finally {
      setIsLoading(false);
    }
  };

  const createDefaultMappings = (): Mapping[] => {
    return mngRoleSettingsList.map((setting: any) => ({
      roleId: selectedRole!,
      settingKey: setting.id,
      enable: false,
      visibility: false,
      createdAt: new Date(),
    }));
  };

  const fetchRoleMappings = async () => {
    if (!selectedRole) return;
    try {
      setIsLoading(true);
      fetchMapRoleSettings("", {
        take: 1000,
        skip: 0,
        page: 1,
        limit: 1000,
        search: selectedRole ?? "",
      });
    } catch (error) {
      message.error("Failed to fetch role mappings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = (value: number) => {
    setSelectedRole(value);
    setSearchQuery("");
    setFilterMode("all");
  };

  const handlePermissionChange = (
    settingKey: string,
    type: "enable" | "visibility",
    value: boolean
  ) => {
    setTempMappings((prev) => {
      const mapping = prev.find((m) => m.settingKey === settingKey);
      if (!mapping) {
        return [
          ...prev,
          {
            roleId: selectedRole!,
            settingKey,
            enable: type === "enable" ? value : false,
            visibility: type === "visibility" ? value : false,
            createdAt: new Date(),
          },
        ];
      }
      return prev.map((m) =>
        m.settingKey === settingKey ? { ...m, [type]: value } : m
      );
    });
  };

  // Filtered settings derived from search + filter mode
  const filteredSettings = useMemo(() => {
    let result = mngRoleSettingsList;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (setting: any) =>
          (setting.settingKey &&
            setting.settingKey.toLowerCase().includes(query)) ||
          (setting.description &&
            setting.description.toLowerCase().includes(query)) ||
          (setting.id && setting.id.toLowerCase().includes(query))
      );
    }

    if (filterMode !== "all") {
      result = result.filter((setting: any) => {
        const m = tempMappings.find((x) => x.settingKey === setting.id);
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

  const handleBulkSetAll = (
    type: "enable" | "visibility",
    value: boolean
  ) => {
    const settingKeys = filteredSettings.map((s: any) => s.id);
    setTempMappings((prev) => {
      const updated = [...prev];
      settingKeys.forEach((settingKey: string) => {
        const idx = updated.findIndex((m) => m.settingKey === settingKey);
        if (idx === -1) {
          updated.push({
            roleId: selectedRole!,
            settingKey,
            enable: type === "enable" ? value : false,
            visibility: type === "visibility" ? value : false,
            createdAt: new Date(),
          });
        } else {
          updated[idx] = { ...updated[idx], [type]: value };
        }
      });
      return updated;
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
    const total = filteredSettings.length;
    const enabled = tempMappings.filter(
      (m) => m.enable && filteredSettings.some((s: any) => s.id === m.settingKey)
    ).length;
    const visible = tempMappings.filter(
      (m) =>
        m.visibility && filteredSettings.some((s: any) => s.id === m.settingKey)
    ).length;
    const both = tempMappings.filter(
      (m) =>
        m.enable &&
        m.visibility &&
        filteredSettings.some((s: any) => s.id === m.settingKey)
    ).length;
    return { total, enabled, visible, both };
  }, [tempMappings, filteredSettings]);

  const accessPercent =
    statistics.total > 0
      ? Math.round((statistics.enabled / statistics.total) * 100)
      : 0;

  const selectedRoleObj = useMemo(
    () => mngRolesList.find((role: any) => role.roleId === selectedRole),
    [mngRolesList, selectedRole]
  );

  const handleSave = async () => {
    if (!selectedRole || tempMappings.length === 0) return;
    setIsSaving(true);
    try {
      updateMapRoleSetting("all", tempMappings);
      message.success(
        `Permissions for ${selectedRoleObj?.roleName ?? "role"} saved`
      );
      await fetchRoleMappings();
    } catch (error) {
      message.error("Failed to update permissions");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetCurrentRole = () => {
    if (!selectedRole) return;
    setTempMappings(createDefaultMappings());
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
    [tp]
  );

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
        const hasAccess = mapping?.enable ?? false;
        return (
          <Switch
            checked={hasAccess}
            checkedChildren={<UnlockOutlined />}
            unCheckedChildren={<LockFilled />}
            onChange={(checked) =>
              handlePermissionChange(record.id!, "enable", checked)
            }
            disabled={isLoading}
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
        const isVisible = mapping?.visibility ?? false;
        return (
          <Switch
            checked={isVisible}
            checkedChildren={<EyeFilled />}
            unCheckedChildren={<EyeInvisibleOutlined />}
            onChange={(checked) =>
              handlePermissionChange(record.id!, "visibility", checked)
            }
            disabled={isLoading}
          />
        );
      },
    },
  ];

  const cardStyle: React.CSSProperties = {
    borderRadius: 12,
    boxShadow:
      "0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 1px rgba(15, 23, 42, 0.03)",
  };

  return (
    <Row gutter={[20, 20]}>
      <Col span={24}>
        <Card
          variant="borderless"
          style={cardStyle}
          styles={{ body: { padding: 20 } }}
        >
          <Row gutter={[20, 16]} align="middle">
            <Col xs={24} md={10} lg={8}>
              <Form form={form} layout="vertical" style={{ marginBottom: 0 }}>
                <Form.Item
                  label={
                    <Space>
                      <KeyOutlined style={{ color: token.colorPrimary }} />
                      <Text strong>{tp("selectRole")}</Text>
                      <Badge
                        count={mngRolesList.length}
                        style={{
                          backgroundColor: token.colorPrimaryBg,
                          color: token.colorPrimary,
                        }}
                        showZero
                      />
                    </Space>
                  }
                  style={{ marginBottom: 0 }}
                >
                  <Select
                    value={selectedRole ?? undefined}
                    placeholder={tp("selectRolePlaceholder")}
                    onChange={handleRoleChange}
                    loading={isLoading}
                    disabled={isLoading}
                    size="large"
                    style={{ width: "100%" }}
                    options={mngRolesList.map((role: any) => ({
                      value: role.roleId,
                      label: (
                        <Space>
                          <Text>{role.roleName}</Text>
                          <Tag color="blue" style={{ marginLeft: 0 }}>
                            ID {role.roleId}
                          </Tag>
                        </Space>
                      ),
                    }))}
                  />
                </Form.Item>
              </Form>
            </Col>

            {selectedRole && (
              <Col xs={24} md={14} lg={16}>
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
            )}
          </Row>
        </Card>
      </Col>

      {!selectedRole ? (
        <Col span={24}>
          <Card
            variant="borderless"
            style={cardStyle}
            styles={{ body: { padding: 48 } }}
          >
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div>
                  <Title level={5} type="secondary" style={{ marginTop: 16 }}>
                    {tp("selectRole")}
                  </Title>
                  <Text type="secondary">
                    {tp("selectRolePlaceholder")}
                  </Text>
                </div>
              }
            />
          </Card>
        </Col>
      ) : (
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
                    <Tag color="blue">{selectedRoleObj?.roleName}</Tag>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Showing {filteredSettings.length} of{" "}
                      {mngRoleSettingsList.length}
                    </Text>
                  </Space>
                </Col>
                <Col>
                  <Space>
                    <Tooltip title="Reset unsaved changes for this role">
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={handleResetCurrentRole}
                        disabled={isLoading || isSaving}
                      >
                        Reset
                      </Button>
                    </Tooltip>
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      onClick={handleSave}
                      loading={isSaving}
                      disabled={
                        isLoading || isSaving || tempMappings.length === 0
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
                    placeholder="Search by key, description, or ID..."
                    prefix={
                      <SearchOutlined
                        style={{ color: token.colorTextTertiary }}
                      />
                    }
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    allowClear
                    size="middle"
                  />
                </Col>
                <Col xs={24} md={14}>
                  <Space wrap style={{ width: "100%", justifyContent: "flex-end" }}>
                    <Segmented
                      value={filterMode}
                      onChange={(val) => setFilterMode(val as any)}
                      size="middle"
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
                      <Button
                        size="middle"
                        icon={<UnlockOutlined />}
                        onClick={() => handleBulkSetAll("enable", true)}
                        disabled={isLoading || filteredSettings.length === 0}
                      >
                        Grant
                      </Button>
                    </Tooltip>
                    <Tooltip title="Revoke access from all filtered rows">
                      <Button
                        size="middle"
                        icon={<LockFilled />}
                        onClick={() => handleBulkSetAll("enable", false)}
                        disabled={isLoading || filteredSettings.length === 0}
                      >
                        Revoke
                      </Button>
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
                        Search: "{searchQuery}"
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
                      {filteredCounts.enabled} granted ·{" "}
                      {filteredCounts.visible} visible ·{" "}
                      {filteredCounts.both} full
                    </Text>
                  </Space>
                </div>
              )}
            </div>

            <div style={{ padding: 0 }}>
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
                loading={isLoading}
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
            </div>
          </Card>
        </Col>
      )}
    </Row>
  );
};

export default MapRoleSettings;
