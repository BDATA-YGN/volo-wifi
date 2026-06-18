"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button, Form, App, Input, Flex, Splitter, Typography, Select } from "antd";
import { EditOutlined, DeleteOutlined, SaveOutlined, ClearOutlined, UserOutlined, CloseOutlined } from "@ant-design/icons";
import * as MainUseCase from "@/features/core/printers/usePrinters";
import { ConfiguredColumn, generateColumns } from "@/common/components/Tables/columnUtils";
import { useTranslations } from "next-intl";
import FormItemBuilder from "@/common/components/Form/FormItemBuilder";
import MasterTable from "@/common/components/Tables/MasterTable";
import { v4 as uuid } from "uuid";
import { handleKeyDownForAcceptNumbers, handleKeyDownForNumberPxPercent, handlePasteForNumberPxPercent, handlePasteForOnlyNumber } from "@/common/components/Form/Validators";
import PRESETS from "./presets";

const { Option } = Select;

interface PrinterPageProps {
  activeKey: string;
  onHeaderExtraChange?: (buttons: React.ReactNode) => void;
}

const PrintersPage: React.FC<PrinterPageProps> = ({ activeKey, onHeaderExtraChange }) => {
  const [form] = Form.useForm();
  const { message, modal } = App.useApp();
  const useCaseSource = MainUseCase.usePrinters();
  const error = useCaseSource.error;

  const dataList = useCaseSource.list;
  const pagination = useCaseSource.pagination;
  const loading = useCaseSource.loading;

  const createFn = useCaseSource.createPrinter;
  const updateFn = useCaseSource.updatePrinter;
  const fetchFn = useCaseSource.fetchPrinters;
  const deleteFn = useCaseSource.deletePrinter;

  const [editingKey, setEditingKey] = useState<any | null>(null);
  const [tableState, setTableState] = useState<any | null>(null);
  const [searchWords, setSearchWords] = useState<string | null>(null);
  const [params, setParams] = useState<any | null>(null);

  const t = useTranslations("permissions");
  const buttonTexts = useTranslations("buttons");

  const filter = useMemo(
    () => ({
      ...tableState,
      ...params,
      search: searchWords || undefined,
    }),
    [searchWords, tableState]
  );

  useEffect(() => {
    if (activeKey === "1") {
      fetchFn(filter).catch(() => message.error("Failed to fetch users"));
    }
  }, [filter, activeKey, fetchFn, message]);

  const isEditing = (record: any) => record?.id === editingKey?.id;

  const edit = (record: any) => {
    form.setFieldsValue({
      ...record,
    });
    setEditingKey(record);
  };

  const cancel = () => {
    form.resetFields();
    setEditingKey(null);
  };

  const handleFormValuesChange = (changedValues: any, allValues: any) => {
    const hasValues = Object.values(allValues).some((value) => !!value);
  };

  const handleSubmit = async () => {
    try {
      const row = await form.validateFields();
      const payload = { ...row };
      delete payload.confirmPassword;

      if (editingKey) {
        delete payload.password;
        await updateFn({ id: editingKey?.id, payload });
        message.success("Edited successfully");
        cancel();
      } else {
        await createFn({ payload });
        message.success("Added successfully");
        cancel();
      }
      fetchFn(filter);
    } catch (err) {
      message.error(`Failed to ${editingKey ? "edit" : "add"}`);
    }
  };

  const handleDelete = async (record: any) => {
    try {
      await deleteFn({ id: record?.id });
      fetchFn(filter);
      message.success("Deleted successfully");
    } catch (err) {
      message.error("Failed to delete");
    }
  };

  const t_delete = useTranslations("modals.delete");
  const handleConfirm = async (record: any) => {
    modal.confirm({
      title: t_delete("title"),
      content: t_delete("content"),
      okText: t_delete("okText"),
      cancelText: t_delete("cancelText"),
      onOk: () => handleDelete(record),
    });
  };

  const renderActions = (record: any) => {
    const editable = isEditing(record);
    return editable ? (
      <span>
        <Button type="link" icon={<CloseOutlined />} onClick={cancel}>
          {buttonTexts("cancel")}
        </Button>
      </span>
    ) : (
      <span>
        <Button type="link" icon={<EditOutlined />} onClick={() => edit(record)}>
          {buttonTexts("edit")}
        </Button>
        <Button type="link" icon={<DeleteOutlined />} onClick={() => handleConfirm(record)}>
          {buttonTexts("delete")}
        </Button>
      </span>
    );
  };

  const columnConfig: ConfiguredColumn = [
    { key: "printerName", title: "Printer Name", visible: true, icon: "solidprinter" },
    { key: "port", title: "Port", visible: true, icon: "fausb" },
    { key: "desc", title: "Description", visible: true, icon: "solidprinter" },
    { key: "type", title: "Type", visible: true, icon: "solidprinter" },
    { key: "width", title: "Width", visible: true, icon: "riexpandwidthfill" },
    { key: "height", title: "Height", visible: true, icon: "riexpandheightfill" },
    { key: "margin", title: "Margin", visible: true, icon: "tbboxmargin" },
    { key: "copies", title: "Copy", visible: true, icon: "faregcopy" },
    { key: "pageSize", title: "Page Size", visible: true, icon: "faregfile" },
    { title: t("action"), visible: true, isAction: true, icon: "iosettingssharp" },
  ];

  const columns = generateColumns(columnConfig, renderActions);

  const key = Form.useWatch("printerName", form);
  const hasFormValues = !key;

  useEffect(() => {
    if (onHeaderExtraChange) {
      onHeaderExtraChange(
        <div className="flex gap-2 items-center">
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} onClick={() => form.submit()} disabled={hasFormValues}>
            {editingKey ? buttonTexts("edit") : buttonTexts("add")}
          </Button>
          <Button type="default" onClick={cancel} icon={<ClearOutlined />} disabled={hasFormValues}>
            {buttonTexts("reset")}
          </Button>
        </div>
      );
    }
  }, [editingKey, hasFormValues, form, buttonTexts, t, form]);

  const formItemLayout = {
    labelCol: {
      xs: { span: 6 },
      sm: { span: 8 },
    },
    wrapperCol: {
      xs: { span: 6 },
      sm: { span: 16 },
    },
  };

  const splitterWrapper = {
    margin: 10,
  };

  const types = [
    {
      label: "A4",
      value: "A4",
    },
    {
      label: "POS",
      value: "POS",
    },
    {
      label: "PDF",
      value: "PDF",
    }
  ];

  const handleTypeChange = (value: string) => {
    form.setFieldsValue({ type: value });
  };

  return (
    <div className="p-1">
      <Form form={form} name={uuid()} onFinish={handleSubmit} className="mb-4" scrollToFirstError onValuesChange={handleFormValuesChange} {...formItemLayout}>
        <Splitter orientation="horizontal">
          <Splitter.Panel style={splitterWrapper}>
            <FormItemBuilder name="printerName" label="Printer Name" required={true} inputType="text" placeholder="Enter Printer Name" icon="solidprinter" />
            <FormItemBuilder name="desc" label="Printer Desc" required={false} inputType="text" placeholder="Enter Printer Desc" icon="solidprinter" />
            <FormItemBuilder name="type" label={"Type"} required inputType="select" options={types.map((type) => ({ label: type.label, value: type.value }))} onChange={handleTypeChange} />
            <FormItemBuilder name="preview" label="Preview" required={true} inputType="boolean" icon="aioutlinefilesearch" placeholder="Enter Preview" />
            <FormItemBuilder name="silent" label="Silent" required={true} inputType="boolean" icon="favolumexmark" placeholder="Enter silent" />
          </Splitter.Panel>
          <Splitter.Panel style={splitterWrapper}>
            <FormItemBuilder
              name="width"
              label="Width"
              required={true}
              inputType="text"
              icon="riexpandwidthfill"
              placeholder="Enter Width"
              onKeyDown={handleKeyDownForNumberPxPercent}
              onPaste={handlePasteForNumberPxPercent}
            />
            <FormItemBuilder
              name="height"
              label="Height"
              required={true}
              inputType="text"
              icon="riexpandheightfill"
              placeholder="Enter Height"
              onKeyDown={handleKeyDownForNumberPxPercent}
              onPaste={handlePasteForNumberPxPercent}
            />
            <FormItemBuilder
              name="margin"
              label="Margin"
              required={true}
              inputType="text"
              icon="tbboxmargin"
              placeholder="Enter Margin"
              onKeyDown={handleKeyDownForNumberPxPercent}
              onPaste={handlePasteForNumberPxPercent}
            />
            {/* <FormItemBuilder name="pageSize" label="Page Size" required={true} inputType="text" icon="faregfile" placeholder="Enter Page Size" /> */}
            <Form.Item label="Page Size" name="pageSize">
              <Select placeholder="Select page size preset">
                {Object.keys(PRESETS).map(key => (
                  <Option key={key} value={key}>{key} ({PRESETS[key].width}mm{PRESETS[key].height ? ` x ${PRESETS[key].height}mm` : ''})</Option>
                ))}
                <Option value="custom">Custom</Option>
              </Select>
            </Form.Item>
            <FormItemBuilder name="port" label="Port" required={true} inputType="text" icon="fausb" placeholder="Enter Port" />
          </Splitter.Panel>
          <Splitter.Panel style={splitterWrapper}>
            <FormItemBuilder name="baudRate" label="Baud Rate" required={true} inputType="number" icon="sispeedtest" placeholder="Enter Baud Rate" onKeyDown={handleKeyDownForAcceptNumbers} />
            <FormItemBuilder name="timeOutPerLine" label="Time Out Per Line" required={true} inputType="number" icon="faregclock" placeholder="Enter Time Out Per Line" onKeyDown={handleKeyDownForAcceptNumbers} />
            <FormItemBuilder name="copies" label="Copies" required={true} inputType="number" icon="faregcopy" placeholder="Enter Copies" onKeyDown={handleKeyDownForAcceptNumbers} onPaste={handlePasteForOnlyNumber} />
          </Splitter.Panel>
        </Splitter>
      </Form>

      <MasterTable
        title={""}
        extra={
          <>
            <Input.Search allowClear placeholder={t("search")} onSearch={(value) => {
                  setSearchWords(value || "");
                  setTableState((prev: any) => ({
                  ...prev,
                  page: 1, // reset to first page
                  }));
                }} />
          </>
        }
        dataSource={dataList.map((item: any, index: any) => ({
          ...item,
          key: item.id || `item-${index}`,
        }))}
        onStateChange={setTableState}
        totalCount={pagination.totalRows}
        loading={loading}
        columns={columns}
        renderActions={renderActions}
      />
    </div>
  );
};

export default PrintersPage;
