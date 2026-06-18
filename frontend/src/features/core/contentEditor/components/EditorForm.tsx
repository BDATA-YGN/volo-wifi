"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Breadcrumb,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Progress,
  Radio,
  Space,
  Tag,
  Tooltip,
  Typography,
  theme,
} from "antd";
import {
  AppstoreOutlined,
  CheckCircleFilled,
  DeleteOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  GlobalOutlined,
  HomeOutlined,
  KeyOutlined,
  PlusOutlined,
  WarningFilled,
} from "@ant-design/icons";

import { useEditorContext } from "../context/EditorContent";
import { KeyPath } from "../types";

const { Title, Text } = Typography;
const { TextArea } = Input;

type FieldDescriptor = {
  name: string;
  path: KeyPath;
  value: any;
};

const formatLanguageLabel = (lang: string) => lang.toUpperCase();

const LONG_TEXT_THRESHOLD = 60;

const EditorForm: React.FC = () => {
  const { token } = theme.useToken();
  const {
    activeSection,
    setActiveSection,
    getValueByPath,
    updateJsonValue,
    addNewKey,
    deleteKey,
    availableLanguages,
  } = useEditorContext();

  const [form] = Form.useForm();
  const [fields, setFields] = useState<FieldDescriptor[]>([]);
  const [isAddKeyModalVisible, setIsAddKeyModalVisible] = useState(false);
  const [newKeyForm] = Form.useForm();

  const currentValue = useMemo(
    () => getValueByPath(activeSection),
    [activeSection, getValueByPath],
  );
  const isObject =
    typeof currentValue === "object" &&
    currentValue !== null &&
    !Array.isArray(currentValue);
  const isEmptySelection = !activeSection || activeSection.length === 0;

  useEffect(() => {
    if (isEmptySelection) {
      setFields([]);
      form.resetFields();
      return;
    }

    const next: FieldDescriptor[] = [];
    const valueAtPath = getValueByPath(activeSection);

    if (
      valueAtPath !== null &&
      typeof valueAtPath === "object" &&
      !Array.isArray(valueAtPath)
    ) {
      Object.entries(valueAtPath).forEach(([key, value]) => {
        if (value !== null && typeof value === "object") return;
        next.push({
          name: key,
          path: [...activeSection, key],
          value,
        });
      });
    } else {
      next.push({
        name: activeSection[activeSection.length - 1],
        path: [...activeSection],
        value: valueAtPath,
      });
    }

    setFields(next);

    const formValues: Record<string, any> = {};
    next.forEach((f) => {
      availableLanguages.forEach((lang) => {
        formValues[`${f.name}_${lang}`] = getValueByPath(f.path, lang);
      });
    });
    form.setFieldsValue(formValues);
  }, [activeSection, availableLanguages, isEmptySelection, form, getValueByPath]);

  const handleValueChange = (changedValues: any) => {
    Object.keys(changedValues).forEach((compoundKey) => {
      const value = changedValues[compoundKey];
      const lastUnderscore = compoundKey.lastIndexOf("_");
      if (lastUnderscore < 0) return;
      const fieldName = compoundKey.substring(0, lastUnderscore);
      const lang = compoundKey.substring(lastUnderscore + 1);
      const field = fields.find((f) => f.name === fieldName);
      if (field) {
        updateJsonValue(field.path, value, lang);
      }
    });
  };

  const handleAddKey = () => {
    newKeyForm.validateFields().then((values) => {
      addNewKey(
        activeSection,
        values.key,
        values.type === "object" ? {} : values.value ?? "",
        values.type === "object",
      );
      setIsAddKeyModalVisible(false);
      newKeyForm.resetFields();
    });
  };

  const completion = useMemo(() => {
    if (fields.length === 0)
      return { filled: 0, total: 0, percent: 0, missing: 0 };
    let filled = 0;
    let total = 0;
    fields.forEach((field) => {
      availableLanguages.forEach((lang) => {
        total += 1;
        const v = getValueByPath(field.path, lang);
        if (v !== undefined && v !== null && String(v).trim() !== "") {
          filled += 1;
        }
      });
    });
    const percent = total === 0 ? 0 : Math.round((filled / total) * 100);
    return { filled, total, percent, missing: total - filled };
  }, [fields, availableLanguages, getValueByPath]);

  const breadcrumbItems = useMemo(
    () => [
      {
        title: (
          <Space size={4}>
            <HomeOutlined />
            <span>Root</span>
          </Space>
        ),
        onClick: () => setActiveSection([]),
      },
      ...activeSection.map((seg, idx) => ({
        title: seg,
        onClick: () => setActiveSection(activeSection.slice(0, idx + 1)),
      })),
    ],
    [activeSection, setActiveSection],
  );

  if (isEmptySelection) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
        }}
      >
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div>
              <Title level={5} type="secondary" style={{ marginTop: 12 }}>
                Select a key to start editing
              </Title>
              <Text type="secondary">
                Use the JSON Structure panel on the left, or add a new top-level
                section.
              </Text>
            </div>
          }
        />
      </div>
    );
  }

  const isNestedOnlySelection = isObject && fields.length === 0;

  const isLongValue = (val: any) =>
    typeof val === "string" && val.length > LONG_TEXT_THRESHOLD;

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <Breadcrumb
            separator="›"
            items={breadcrumbItems.map((item) => ({
              ...item,
              title: (
                <span
                  style={{ cursor: "pointer", color: token.colorTextSecondary }}
                  onClick={item.onClick}
                >
                  {item.title}
                </span>
              ),
            }))}
            style={{ marginBottom: 6, fontSize: 12 }}
          />
          <Title level={4} style={{ margin: 0, wordBreak: "break-all" }}>
            <Space size={8}>
              {isObject ? (
                <AppstoreOutlined style={{ color: token.colorPrimary }} />
              ) : (
                <FileTextOutlined style={{ color: token.colorPrimary }} />
              )}
              {activeSection[activeSection.length - 1]}
            </Space>
          </Title>
          <Space size={6} wrap style={{ marginTop: 6 }}>
            <Tag color={isObject ? "purple" : "geekblue"}>
              {isObject ? "Group" : "Value"}
            </Tag>
            <Tag color="blue" icon={<GlobalOutlined />}>
              {availableLanguages.length} languages
            </Tag>
            {!isNestedOnlySelection && (
              <Tag color="default">
                {fields.length} {fields.length === 1 ? "key" : "keys"}
              </Tag>
            )}
          </Space>
        </div>

        <Space wrap>
          {isObject && activeSection.length > 0 && (
            <Popconfirm
              title="Delete this section?"
              description="The section and all its keys will be removed across every language."
              okText="Delete"
              okButtonProps={{ danger: true }}
              cancelText="Cancel"
              icon={<ExclamationCircleOutlined style={{ color: "red" }} />}
              onConfirm={() => {
                deleteKey(activeSection);
                setActiveSection(activeSection.slice(0, -1));
              }}
            >
              <Button danger icon={<DeleteOutlined />}>
                Delete Section
              </Button>
            </Popconfirm>
          )}
          {isObject && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setIsAddKeyModalVisible(true)}
            >
              Add New Key
            </Button>
          )}
        </Space>
      </div>

      {!isNestedOnlySelection && (
        <Card
          variant="borderless"
          style={{
            marginBottom: 16,
            borderRadius: 12,
            background: token.colorFillAlter,
          }}
          styles={{ body: { padding: 16 } }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Space size={16} wrap>
              <Space size={6}>
                {completion.percent === 100 ? (
                  <CheckCircleFilled style={{ color: token.colorSuccess }} />
                ) : (
                  <WarningFilled style={{ color: token.colorWarning }} />
                )}
                <Text strong>Translation completeness</Text>
              </Space>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {completion.filled} / {completion.total} filled
                {completion.missing > 0 ? ` · ${completion.missing} missing` : ""}
              </Text>
            </Space>
            <div style={{ minWidth: 220, flex: "0 1 280px" }}>
              <Progress
                percent={completion.percent}
                size="small"
                showInfo
                strokeColor={{
                  "0%": token.colorPrimary,
                  "100%": token.colorSuccess,
                }}
              />
            </div>
          </div>
        </Card>
      )}

      {isNestedOnlySelection ? (
        <Card
          variant="borderless"
          style={{ borderRadius: 12 }}
          styles={{ body: { padding: 32 } }}
        >
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div>
                <Title level={5} type="secondary" style={{ marginTop: 8 }}>
                  This section only contains sub-groups
                </Title>
                <Text type="secondary">
                  Pick a child node on the left, or add a value key here.
                </Text>
              </div>
            }
          >
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setIsAddKeyModalVisible(true)}
            >
              Add New Key
            </Button>
          </Empty>
        </Card>
      ) : (
        <Form
          form={form}
          layout="vertical"
          onValuesChange={handleValueChange}
          requiredMark={false}
        >
          <Space orientation="vertical" size={16} style={{ width: "100%" }}>
            {fields.map((field) => {
              const longContent = availableLanguages.some((lang) =>
                isLongValue(getValueByPath(field.path, lang)),
              );
              return (
                <Card
                  key={field.path.join(".")}
                  variant="borderless"
                  style={{ borderRadius: 12 }}
                  styles={{ body: { padding: 16 } }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                      marginBottom: 12,
                    }}
                  >
                    <Space size={6} wrap style={{ minWidth: 0 }}>
                      <Tag
                        color="blue"
                        icon={<KeyOutlined />}
                        style={{
                          margin: 0,
                          fontFamily:
                            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                        }}
                      >
                        {field.name}
                      </Tag>
                      <Text
                        type="secondary"
                        style={{ fontSize: 11, fontFamily: "monospace" }}
                      >
                        {field.path.join(".")}
                      </Text>
                    </Space>
                    <Popconfirm
                      title="Delete this key?"
                      description="The key will be removed for every language."
                      onConfirm={() => deleteKey(field.path)}
                      okText="Delete"
                      okButtonProps={{ danger: true }}
                      cancelText="Cancel"
                    >
                      <Tooltip title="Delete key">
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                        />
                      </Tooltip>
                    </Popconfirm>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: `repeat(auto-fit, minmax(${longContent ? 320 : 240}px, 1fr))`,
                      gap: 12,
                    }}
                  >
                    {availableLanguages.map((lang) => {
                      const value = getValueByPath(field.path, lang);
                      const isEmpty =
                        value === undefined ||
                        value === null ||
                        String(value).trim() === "";
                      return (
                        <Form.Item
                          key={`${field.path.join(".")}_${lang}`}
                          name={`${field.name}_${lang}`}
                          label={
                            <Space size={6}>
                              <Tag
                                color={isEmpty ? "default" : "blue"}
                                style={{ marginInlineEnd: 0 }}
                              >
                                {formatLanguageLabel(lang)}
                              </Tag>
                              {isEmpty && (
                                <Text type="warning" style={{ fontSize: 11 }}>
                                  missing
                                </Text>
                              )}
                            </Space>
                          }
                          style={{ marginBottom: 0 }}
                        >
                          {longContent ? (
                            <TextArea
                              autoSize={{ minRows: 2, maxRows: 6 }}
                              placeholder={`Translation for ${formatLanguageLabel(lang)}`}
                            />
                          ) : (
                            <Input
                              placeholder={`Translation for ${formatLanguageLabel(lang)}`}
                            />
                          )}
                        </Form.Item>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </Space>
        </Form>
      )}

      <Modal
        title={
          <Space>
            <PlusOutlined style={{ color: token.colorPrimary }} />
            <span>Add New Key</span>
          </Space>
        }
        open={isAddKeyModalVisible}
        onOk={handleAddKey}
        onCancel={() => {
          setIsAddKeyModalVisible(false);
          newKeyForm.resetFields();
        }}
        okText="Add Key"
        destroyOnHidden
      >
        <Form
          form={newKeyForm}
          layout="vertical"
          initialValues={{ type: "value" }}
        >
          <Form.Item
            name="key"
            label="Key Name"
            rules={[
              { required: true, message: "Please input the key name" },
              {
                pattern: /^[a-zA-Z0-9_-]+$/,
                message:
                  "Key can only contain letters, numbers, underscores and hyphens",
              },
            ]}
          >
            <Input
              prefix={<KeyOutlined style={{ color: token.colorTextTertiary }} />}
              placeholder="e.g. welcome_title"
              autoFocus
            />
          </Form.Item>
          <Form.Item name="type" label="Type">
            <Radio.Group buttonStyle="solid" optionType="button">
              <Radio.Button value="value">Single Value</Radio.Button>
              <Radio.Button value="object">Group (object)</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) => prev.type !== curr.type}
          >
            {({ getFieldValue }) =>
              getFieldValue("type") === "value" && (
                <Form.Item
                  name="value"
                  label="Default Value (English)"
                  rules={[
                    { required: true, message: "Please input the value" },
                  ]}
                >
                  <Input placeholder="Enter the English value for this key" />
                </Form.Item>
              )
            }
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default EditorForm;
