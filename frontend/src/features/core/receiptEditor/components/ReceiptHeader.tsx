"use client";
import React, { useEffect } from "react";
import { Layout, Button, Dropdown, Space, Typography, Input, Modal, Form, Radio } from "antd";
import { Menu, Download, Upload, Save, FilePlus, Settings, Printer, Eye } from "lucide-react";
import { useReceiptStore } from "../store";
import CommonHeader from "@/common/components/@bdata/CommonHeader";
import * as MainUseCase from "../useReceipt";
import { v4 as uuidv4 } from 'uuid';
import { PaperSize, ReceiptTemplate } from "../types";
import { posReceiptTemplate, serviceInvoiceTemplate } from "../sample";
import { NotificationProvider, useNotify } from "@/common/provider/NotificationProvider";
import { cleanReceiptHtml } from "../printEngine/utils";

const AppHeader: React.FC = () => {
  const notify = useNotify();
  const useCaseSource = MainUseCase.useReceipt();
  const fetchFn = useCaseSource.fetchReceipts;
  const createFn = useCaseSource.createReceipt;
  const updateFn = useCaseSource.updateReceipt;
  const loading = useCaseSource.loading;
  const testPrint = useCaseSource.testPrintReceipt;
  const error = useCaseSource.error;

  const { templates, currentTemplate, previewData, selectedPrinter, setSelectedPrinter, createNewTemplate, setCurrentTemplate, togglePreviewDrawer } = useReceiptStore();

  useEffect(() => {
    fetchFn().then(() => {
      if(templates.length > 0){
        console.log("SELECTED", templates);
        setCurrentTemplate(templates[0].id, templates[0].preview);
        setSelectedPrinter(templates[0].printerId);
      }
    }).catch(() => console.log("FETCH ERROR"));
  }, []);

  // console.log("TEMPLATES", JSON.stringify(templates));

  const [newTemplateForm] = Form.useForm();
  const [isNewTemplateModalOpen, setIsNewTemplateModalOpen] = React.useState(false);

  const showNewTemplateModal = () => {
    setIsNewTemplateModalOpen(true);
  };

  const handleCreateTemplate = () => {
    newTemplateForm.validateFields().then((values) => {
      const newTemplate: ReceiptTemplate = {
        id: uuidv4(),
        name: values.name,
        elements: values.theme === "pos" ? posReceiptTemplate.elements : serviceInvoiceTemplate.elements,
        paperSize: values.theme === "pos" ? PaperSize.THERMAL_80MM : PaperSize.A4,
        styles: values.theme === "pos" ? { ...posReceiptTemplate.styles } : { ...serviceInvoiceTemplate.styles },
        preview: values.theme === "pos" ? { ...posReceiptTemplate.preview } : { ...serviceInvoiceTemplate.preview },
        code: values.code,
        printerId: selectedPrinter || ""
      };
      createFn({ payload: newTemplate });
      createNewTemplate(newTemplate);
      setIsNewTemplateModalOpen(false);
      newTemplateForm.resetFields();
    });
  };

  const templateMenuItems = templates.map((template) => ({
    key: template.id,
    label: template.name,
    onClick: () => {
      setCurrentTemplate(template.id, template.preview);
      setSelectedPrinter(template.printerId);
    },
  }));

  const exportCurrentTemplate = () => {
    if (!currentTemplate) return;

    const templateData = JSON.stringify(currentTemplate, null, 2);
    const blob = new Blob([templateData], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentTemplate.name.replace(/\s+/g, "_")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const printReceipt = async () => {
    // Force preview mode to 'data' before printing
    testPrint({ payload: {
      code: currentTemplate?.code
    }});
  };

  const titleText = currentTemplate ? `${currentTemplate?.name} | CODE: ${currentTemplate?.code}` : "Receipt Editor";

  const formItemLayout = {
    labelCol: { span: 6 },
    wrapperCol: { span: 14 },
  };

  return (
    <>
      <CommonHeader
        title={titleText}
        extras={
          <div className="flex items-center space-x-2">
            <Dropdown
              className="w-[250px]"
              menu={{
                items: templateMenuItems,
              }}
              trigger={["click"]}
            >
              <Button disabled={loading}>
                Change Template <span className="ml-1">▼</span>
              </Button>
            </Dropdown>
            <Button type="primary" onClick={showNewTemplateModal}>
              <FilePlus size={16} /> New
            </Button>
            <Button onClick={() => {
              let updateForm = {
                ...currentTemplate,
                preview: previewData,
                printerId: selectedPrinter
              }
              delete updateForm?.id;
              updateFn({id: currentTemplate?.id || "", payload: updateForm});
              notify({
                message: "Success!",
                description: `Saved template ${currentTemplate?.name}🎉`,
                type: "success",
              })
            }}>
              <Save size={16} />
              Save
            </Button>
            <Button onClick={exportCurrentTemplate}>
              <Download size={16} />
              Export
            </Button>
            <Button>
              <Upload size={16} /> Import
            </Button>
            <Button onClick={printReceipt}>
              <Printer size={16} /> Print
            </Button>
            <Button onClick={togglePreviewDrawer}>
              <Eye size={16} /> Preview
            </Button>
            <Button>
              <Settings size={16} />
            </Button>
          </div>
        }
      />

      <Modal title="Create New Template" open={isNewTemplateModalOpen} onCancel={() => setIsNewTemplateModalOpen(false)} onOk={handleCreateTemplate}>
        <Form form={newTemplateForm} {...formItemLayout} style={{ marginTop: 20 }}>
          <Form.Item name="name" label="Name" rules={[{ required: true, message: "Please enter a template name" }]}>
            <Input placeholder="Enter template name" />
          </Form.Item>
          <Form.Item name="code" label="Code" rules={[{ required: true, message: "Please enter a template name" }]}>
            <Input placeholder="Enter template code (e.g) C1, POS1" />
          </Form.Item>
           <Form.Item
              name="theme"
              label="Select Theme"
              rules={[{ required: true, message: 'Please pick an item!' }]}
            >
              <Radio.Group>
                <Radio.Button value="pos" defaultChecked={true}>Sale Invoice (80mm)</Radio.Button>
                <Radio.Button value="invoice">Sale Invoice (A4)</Radio.Button>
              </Radio.Group>
            </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default AppHeader;
