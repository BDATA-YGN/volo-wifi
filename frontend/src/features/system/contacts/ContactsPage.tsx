"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button, Form, Input, App, Card, Row, Col, Typography, Space, Divider, Alert, Spin } from "antd";
import { SaveOutlined, EditOutlined, PhoneOutlined, MailOutlined, EnvironmentOutlined, GlobalOutlined, ReloadOutlined, CloseOutlined } from "@ant-design/icons";
import { getAppSettingByKey, saveAppSetting } from "@/features/system/app-setting/query";
import type { AppSettingAttributes } from "@/features/system/app-setting/interface";
import { v4 as uuid } from "uuid";
import FilePicker from "@/common/components/FileManager/FilePicker";
import { FileLog } from "@/types";
import { UploadIcon } from "lucide-react";

const { Title, Text } = Typography;

interface ContactInfo {
  address: string;
  email: string;
  phone: string;
  facebook: string;
  instagram: string;
  twitter: string;
  youtube: string;
  linkedin: string;
  tiktok: string;
  telegram: string;
  wechat: string;
  whatsapp: string;
  direction: string;
  line: string;
  heroImages: string[];
}

const SUPPORT_CONTACTS_KEY = "support_contacts";

/** Empty form shape only — no branded defaults; data must come from `app_settings`. */
const EMPTY_CONTACTS: ContactInfo = {
  address: "",
  email: "",
  phone: "",
  facebook: "",
  instagram: "",
  twitter: "",
  youtube: "",
  linkedin: "",
  tiktok: "",
  telegram: "",
  wechat: "",
  whatsapp: "",
  direction: "",
  line: "",
  heroImages: [],
};

function parseContactJson(raw: unknown): Partial<ContactInfo> | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Partial<ContactInfo>;
    } catch {
      return null;
    }
  }
  if (typeof raw === "object") return raw as Partial<ContactInfo>;
  return null;
}

function contactsFromSetting(setting: AppSettingAttributes): ContactInfo {
  const parsed =
    parseContactJson(setting.value) ??
    parseContactJson(setting.defaultValue ?? null);
  return {
    ...EMPTY_CONTACTS,
    ...parsed,
    heroImages: Array.isArray(parsed?.heroImages) ? parsed.heroImages : [],
  };
}

const ContactsPage: React.FC = () => {
  const [form] = Form.useForm();
  const { message } = App.useApp();

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [contactData, setContactData] = useState<ContactInfo>(EMPTY_CONTACTS);
  const [error, setError] = useState<string | null>(null);
  const [currentSetting, setCurrentSetting] = useState<AppSettingAttributes | null>(null);

  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [showImagePicker, setShowImagePicker] = useState(false);

  const applyContacts = useCallback(
    (contacts: ContactInfo, setting: AppSettingAttributes | null) => {
      setContactData(contacts);
      setCurrentSetting(setting);
      form.setFieldsValue(contacts);
      setSelectedImages(contacts.heroImages ?? []);
    },
    [form],
  );

  const loadContactData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getAppSettingByKey(SUPPORT_CONTACTS_KEY);
      const setting = response?.data as AppSettingAttributes | undefined;

      if (!setting?.id) {
        applyContacts(EMPTY_CONTACTS, null);
        setError(
          'No "support_contacts" row in app_settings. Run backend seed (`yarn seed`) or create the setting in App Settings.',
        );
        return;
      }

      applyContacts(contactsFromSetting(setting), setting);
    } catch (err) {
      console.log("Failed to load contact data:", err);
      applyContacts(EMPTY_CONTACTS, null);
      setError("Failed to load contact information from the database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadContactData();
  }, []);

  const handleEdit = () => {
    if (!currentSetting?.id) {
      message.warning('Configure "support_contacts" in the database before editing.');
      return;
    }
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    form.setFieldsValue(contactData);
    setSelectedImages(contactData.heroImages ?? []);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      const values = await form.validateFields();

      if (!currentSetting?.id) {
        message.error("Support contacts setting is not available. Run database seed for app_settings.");
        return;
      }

      const payload: ContactInfo = {
        ...EMPTY_CONTACTS,
        ...values,
        heroImages: selectedImages,
      };

      await saveAppSetting({ value: JSON.stringify(payload) }, currentSetting.id);

      applyContacts(payload, currentSetting);
      setIsEditing(false);
      message.success("Contact information updated successfully!");
    } catch (err) {
      console.log("Failed to save contact data:", err);
      setError("Failed to update contact information. Please try again.");
      message.error("Failed to update contact information");
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = useCallback((files: FileLog[]) => {
    setSelectedImages(files.map((file) => file.url));
    setIsEditing(true);
  }, []);

  const handleRemoveImage = (indexToRemove: number) => {
    const updatedImages = selectedImages.filter((_, index) => index !== indexToRemove);
    setSelectedImages(updatedImages);
    setIsEditing(true);
  };

  const renderContactField = (label: string, name: keyof ContactInfo, icon: React.ReactNode, type: string = "text") => (
    <Col xs={24} sm={12} lg={8} key={name}>
      <Form.Item
        name={name}
        label={
          <Space>
            {icon}
            <Text strong>{label}</Text>
          </Space>
        }
        rules={[
          { required: name === "address" || name === "email" || name === "phone", message: `${label} is required` },
          { type: name === "email" ? "email" : undefined, message: "Please enter a valid email address" },
          {
            type: name.includes("http") || name === "direction" ? "url" : undefined,
            message: "Please enter a valid URL",
          },
        ]}
      >
        <Input placeholder={`Enter ${label.toLowerCase()}`} disabled={!isEditing} type={type} />
      </Form.Item>
    </Col>
  );

  if (loading && !currentSetting) {
    return (
      <div className="p-6">
        <Card>
          <div className="flex justify-center items-center h-64">
            <Spin size="large" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card>
        <div className="flex justify-between items-center mb-6">
          <Title level={2} className="mb-0">
            Contact Information Management
          </Title>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadContactData} loading={loading}>
              Refresh
            </Button>
            {isEditing ? (
              <>
                <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={loading}>
                  Save Changes
                </Button>
                <Button onClick={handleCancel} disabled={loading}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button type="primary" icon={<EditOutlined />} onClick={handleEdit} disabled={!currentSetting?.id}>
                Edit Contacts
              </Button>
            )}
          </Space>
        </div>

        {error && (
          <Alert message="Notice" description={error} type="warning" showIcon closable className="mb-4" />
        )}

        <Form form={form} name={uuid()} layout="vertical" className="mb-4" scrollToFirstError initialValues={EMPTY_CONTACTS}>
          <Title level={4}>Basic Information</Title>
          <Row gutter={[16, 16]}>
            {renderContactField("Address", "address", <EnvironmentOutlined />, "text")}
            {renderContactField("Email", "email", <MailOutlined />, "email")}
            {renderContactField("Phone", "phone", <PhoneOutlined />, "tel")}
          </Row>

          <Divider />

          <Title level={4}>Social Media & Communication</Title>
          <Row gutter={[16, 16]}>
            {renderContactField("Facebook", "facebook", <GlobalOutlined />, "url")}
            {renderContactField("Instagram", "instagram", <GlobalOutlined />, "url")}
            {renderContactField("Twitter", "twitter", <GlobalOutlined />, "url")}
            {renderContactField("YouTube", "youtube", <GlobalOutlined />, "url")}
            {renderContactField("LinkedIn", "linkedin", <GlobalOutlined />, "url")}
            {renderContactField("TikTok", "tiktok", <GlobalOutlined />, "url")}
            {renderContactField("Telegram", "telegram", <GlobalOutlined />, "url")}
            {renderContactField("WeChat", "wechat", <GlobalOutlined />, "url")}
            {renderContactField("WhatsApp", "whatsapp", <GlobalOutlined />, "url")}
            {renderContactField("Line", "line", <GlobalOutlined />, "url")}
            {renderContactField("Google Maps Direction", "direction", <EnvironmentOutlined />, "url")}
          </Row>

          <Divider />

          <Title level={4}>Hero Images</Title>
          <Row gutter={[16, 16]}>
            <Form.Item className="w-full">
              <Button
                icon={<UploadIcon size={12} />}
                onClick={() => setShowImagePicker(true)}
                className="w-full mb-4"
                disabled={!isEditing}
              >
                {selectedImages?.length > 0
                  ? `${selectedImages.length} Images Selected - Click to Change`
                  : "Select Profile Images"}
              </Button>
              {selectedImages?.length > 0 && (
                <div className="flex items-center space-x-3 p-2 rounded-lg">
                  {selectedImages.map((image, index) => (
                    <div key={index} className="relative group">
                      <img src={image} alt="Hero Image" className="w-20 h-20 object-cover rounded" />
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<CloseOutlined />}
                        className="absolute -top-2 -right-2 w-6 h-6 min-w-6 p-0 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
                        onClick={() => handleRemoveImage(index)}
                        disabled={!isEditing}
                      />
                    </div>
                  ))}
                </div>
              )}
            </Form.Item>
          </Row>
        </Form>

        <FilePicker
          isOpen={showImagePicker}
          onClose={() => setShowImagePicker(false)}
          onSelect={handleImageSelect}
          multiple={true}
          fileTypes={["image"]}
          title="Select Hero Images"
          selectedFiles={selectedImages}
        />
      </Card>
    </div>
  );
};

export default ContactsPage;
