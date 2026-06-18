"use client";

import React, { useState } from "react";
import {
  App,
  Badge,
  Button,
  Divider,
  Dropdown,
  Form,
  Input,
  Modal,
  Radio,
  Space,
  Tag,
  Tooltip,
  Upload,
  theme,
} from "antd";
import {
  CloudUploadOutlined,
  DownloadOutlined,
  ExclamationCircleOutlined,
  FolderAddOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
  UndoOutlined,
} from "@ant-design/icons";

import { useEditorContext } from "../context/EditorContent";
import JsonPreview from "./JsonPreviewer";
import LanguageDiff from "./LanguageDiff";
import CommonHeader from "@/common/components/@bdata/CommonHeader";
import {
  revalidateTranslations,
  revalidateAppSettings,
} from "@/app/actions/revalidate";

const Header: React.FC = () => {
  const { modal, message } = App.useApp();
  const { token } = theme.useToken();
  const {
    saveChanges,
    exportJson,
    importJson,
    addNewKey,
    isDirty,
    resetChanges,
    availableLanguages,
  } = useEditorContext();

  const [isAddSectionModalVisible, setIsAddSectionModalVisible] =
    useState(false);
  const [newSectionForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const handleRevalidateTranslations = async () => {
    await revalidateTranslations();
    message.success("Cache updated");
  };

  const handleSave = async () => {
    if (!isDirty) {
      message.info("Nothing to save");
      return;
    }
    setSaving(true);
    try {
      await saveChanges();
      await handleRevalidateTranslations();
      message.success("Changes saved successfully");
    } catch (e) {
      modal.error({
        title: "Error",
        content: "Failed to save changes. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!isDirty) return;
    modal.confirm({
      title: "Discard changes?",
      icon: <ExclamationCircleOutlined />,
      content:
        "All unsaved edits will be reverted to the last loaded version. This cannot be undone.",
      okText: "Discard",
      okButtonProps: { danger: true },
      cancelText: "Keep editing",
      onOk: () => {
        resetChanges();
        message.success("Reverted to last loaded version");
      },
    });
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        importJson(content);
        message.success(`Imported "${file.name}"`);
      } catch {
        message.error("Failed to parse JSON file");
      }
    };
    reader.readAsText(file);
    return false;
  };

  const handleAddSection = () => {
    newSectionForm.validateFields().then((values) => {
      addNewKey(
        [],
        values.key,
        values.type === "object" ? {} : values.value ?? "",
        values.type === "object",
      );
      setIsAddSectionModalVisible(false);
      newSectionForm.resetFields();
      message.success(`Section "${values.key}" added`);
    });
  };

  const extras = (
    <Space size="small" wrap>
      <Tooltip title={isDirty ? "Unsaved changes" : "All changes saved"}>
        <Tag
          icon={
            <Badge
              status={isDirty ? "warning" : "success"}
              style={{ marginInlineEnd: 4 }}
            />
          }
          color={isDirty ? "orange" : "green"}
          style={{ marginInlineEnd: 0 }}
        >
          {isDirty ? "Unsaved" : "Saved"}
        </Tag>
      </Tooltip>
      <Tag color="blue" style={{ marginInlineEnd: 0 }}>
        {availableLanguages.length}{" "}
        {availableLanguages.length === 1 ? "language" : "languages"}
      </Tag>

      <Divider orientation="vertical" style={{ height: 24 }} />

      <Button
        icon={<FolderAddOutlined />}
        onClick={() => setIsAddSectionModalVisible(true)}
      >
        Add Section
      </Button>
      <JsonPreview />
      <LanguageDiff />

      <Divider orientation="vertical" style={{ height: 24 }} />

      <Upload
        accept=".json"
        showUploadList={false}
        beforeUpload={handleImport}
        maxCount={1}
      >
        <Button icon={<CloudUploadOutlined />}>Import</Button>
      </Upload>
      <Button icon={<DownloadOutlined />} onClick={exportJson}>
        Export
      </Button>

      <Divider orientation="vertical" style={{ height: 24 }} />

      <Tooltip title="Discard all unsaved edits">
        <Button
          icon={<UndoOutlined />}
          onClick={handleReset}
          disabled={!isDirty}
        >
          Reset
        </Button>
      </Tooltip>
      <Tooltip
        title={
          isDirty
            ? "Save edits and refresh the translation cache"
            : "Nothing to save"
        }
      >
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSave}
          loading={saving}
          disabled={!isDirty || saving}
        >
          Save Changes
        </Button>
      </Tooltip>

      <Modal
        title={
          <Space>
            <FolderAddOutlined style={{ color: token.colorPrimary }} />
            <span>Add Parent Section</span>
          </Space>
        }
        open={isAddSectionModalVisible}
        onOk={handleAddSection}
        onCancel={() => {
          setIsAddSectionModalVisible(false);
          newSectionForm.resetFields();
        }}
        okText="Add Section"
        destroyOnHidden
      >
        <Form
          form={newSectionForm}
          layout="vertical"
          initialValues={{ type: "object" }}
        >
          <Form.Item
            name="key"
            label="Section Name"
            rules={[
              { required: true, message: "Please input the section name" },
              {
                pattern: /^[a-zA-Z0-9_-]+$/,
                message:
                  "Section name can only contain letters, numbers, underscores and hyphens",
              },
            ]}
          >
            <Input
              prefix={<PlusOutlined style={{ color: token.colorTextTertiary }} />}
              placeholder="e.g. dashboard, billing, profile"
              autoFocus
            />
          </Form.Item>
          <Form.Item name="type" label="Type">
            <Radio.Group buttonStyle="solid" optionType="button">
              <Radio.Button value="object">Group (object)</Radio.Button>
              <Radio.Button value="value">Single Value</Radio.Button>
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
    </Space>
  );

  return <CommonHeader extras={extras} />;
};

export default Header;
