"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { App, Button, Form, Input, Modal, Select } from "antd";
import { SaveOutlined, ClearOutlined } from "@ant-design/icons";
import { MenuItem, MenuItemFormData } from "../types";
import TheIcon, { Name, iconOptions } from "@/common/components/@bdata/IconPicker/icons";
import { useTranslations } from "next-intl";
import IconPicker from "@/common/components/@bdata/IconPicker";

interface MenuItemFormProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (data: MenuItemFormData) => void;
  initialValues?: MenuItem;
  title: string;
  groupId: number;
  messages: any;
}

// Placeholder for FormItemBuilder, assuming it’s a wrapper around Form.Item
const FormItemBuilder: React.FC<{
  name: string;
  label: string;
  required?: boolean;
  inputType?: string;
  placeholder?: string;
  icon?: string;
  rules?: any[];
}> = ({ name, label, required, inputType, placeholder, rules }) => (
  <Form.Item
    name={name}
    label={label}
    rules={[
      ...(required ? [{ required: true, message: `Please input ${label.toLowerCase()}!` }] : []),
      ...(rules || []),
    ]}
  >
    {inputType === "password" ? (
      <Input.Password placeholder={placeholder} />
    ) : (
      <Input placeholder={placeholder} />
    )}
  </Form.Item>
);

const MenuItemForm: React.FC<MenuItemFormProps> = ({
  visible,
  onCancel,
  onSubmit,
  initialValues,
  title,
  groupId,
  messages
}) => {
  const [form] = Form.useForm<MenuItemFormData>();
  const { message } = App.useApp();
  const [selectedIcon, setSelectedIcon] = useState<Name | null>("home");
  const t = useTranslations("menuItemForm"); // Adjust namespace as needed
  const buttonTexts = useTranslations("buttons");

  useEffect(() => {
    if (visible && initialValues) {
      const sanitizedValues = {
        key: initialValues.key,
        title: initialValues.title,
        icon: initialValues.icon as Name,
        url: initialValues.url,
        groupId,
      };
      form.setFieldsValue(sanitizedValues);
      setSelectedIcon(initialValues.icon as Name);
    } else if (visible) {
      form.resetFields();
      form.setFieldsValue({ groupId });
      setSelectedIcon("home");
    }
  }, [visible, initialValues, form, groupId]);

  const handleIconSelect = useCallback((value: Name) => {
    form.setFieldsValue({ icon: value });
    setSelectedIcon(value);
  }, [form]);

  const handleSubmit = async (values: MenuItemFormData) => {
    try {
      await onSubmit({ ...values, groupId });
      message.success(t("success"));
      form.resetFields();
      setSelectedIcon("home");
      onCancel();
    } catch (err) {
      message.error(t("error"));
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setSelectedIcon("home");
    onCancel();
  };

  const hasFormValues = !Form.useWatch("title", form);

  const selectOptions = useMemo(() => {
    return iconOptions.map((option) => ({
      value: option.value,
      label: <TheIcon name={option.value} />,
    }));
  }, []);

  const menuItemsOptions = useMemo(() => {
      const menuItems = messages?.menu?.menus || {};
      return Object.entries(menuItems).map(([key, value]) => ({
        value: `menus.${key}`,
        label: value as string,
      }));
    }, [messages]);
  
    const handleTitleSelect = useCallback((value: string) => {
      form.setFieldsValue({ title: value });
    }, [form]);

  return (
    <Modal
      open={visible}
      title={title}
      footer={null}
      onCancel={handleCancel}
      width={520}
    >
      <Form
        form={form}
        name="menuItemForm"
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ icon: "home", groupId }}
        scrollToFirstError
      >
        <div className="grid grid-cols-1 gap-4 p-2">
          <Form.Item
            label={t("title")}
            name="title"
            rules={[{ required: true, message: t("titlePlaceholder") }]}
          >
            <Select
              placeholder={t("titlePlaceholder")}
              onChange={handleTitleSelect}
              options={menuItemsOptions}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <FormItemBuilder
            name="key"
            label={t("key")}
            required
            inputType="text"
            placeholder={t("keyPlaceholder")}
            icon="key"
            rules={[
              {
                message: t("keyValidation"),
              },
            ]}
          />
          <Form.Item label={t("icon")} name="icon" required>
            <Select
              placeholder={t("iconPlaceholder")}
              value={selectedIcon}
              onChange={handleIconSelect}
              options={selectOptions}
              popupRender={() => (
                <IconPicker
                  onSelect={handleIconSelect}
                  selectedIcon={selectedIcon}
                  searchPlaceholder={"Search icons..."}
                />
              )}
            />
          </Form.Item>
          <FormItemBuilder
            name="url"
            label={t("url")}
            inputType="text"
            placeholder={t("urlPlaceholder")}
            icon="url"
          />
          <Form.Item name="groupId" hidden>
            <Input type="hidden" />
          </Form.Item>
        </div>
        <Form.Item className="flex justify-end">
          <Button
            type="primary"
            htmlType="submit"
            className="mr-2"
            disabled={hasFormValues}
          >
            <SaveOutlined />
            {buttonTexts("save")}
          </Button>
          <Button
            type="default"
            onClick={handleCancel}
            disabled={hasFormValues}
          >
            <ClearOutlined />
            {buttonTexts("cancel")}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default MenuItemForm;