"use client";
import React from "react";
import { Drawer, Typography, Button, Empty, Space, Modal, Divider } from "antd";
import { Eye, EyeOff, FileJson, FileText } from "lucide-react";
import { useReceiptStore } from "../store";
import ElementRenderer from "./elements/ElementRenderer";
import yaml from "js-yaml";

const { Title, Text } = Typography;

interface PreviewPanelProps {
  className?: string;
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({ className }) => {
  const { currentTemplate, previewData, previewDrawerVisible, togglePreviewDrawer } = useReceiptStore();

  const [previewMode, setPreviewMode] = React.useState<"data" | "design">("data");
  const [templateDataVisible, setTemplateDataVisible] = React.useState(false);
  const [dataFormat, setDataFormat] = React.useState<"yaml" | "json">("yaml");

  const getFormattedData = () => {
    if (dataFormat === "yaml") {
      return yaml.dump(previewData, { indent: 2 });
    }
    return JSON.stringify(previewData, null, 2);
  };

  return (
    <>
      <Drawer
        title={
          <Title level={5} className="!m-0">
            Preview
          </Title>
        }
        placement="right"
        closable={true}
        onClose={togglePreviewDrawer}
        open={previewDrawerVisible}
        mask={false}
        className={className}
        styles={{
          body: {
            padding: "16px",
            height: "calc(100% - 55px)",
            overflow: "auto",
          },
        }}
        size={800}
      >
        <Space orientation="vertical" className="w-full">
          <Space className="w-full justify-center">
            <Button type={previewMode === "design" ? "primary" : "default"} icon={<EyeOff size={16} />} onClick={() => setPreviewMode("design")}>
              Design
            </Button>
            <Button type={previewMode === "data" ? "primary" : "default"} icon={<Eye size={16} />} onClick={() => setPreviewMode("data")}>
              With Data
            </Button>
            <Button icon={dataFormat === "json" ? <FileJson size={16} /> : <FileText size={16} />} onClick={() => setTemplateDataVisible(true)}>
              View Data
            </Button>
          </Space>

          <Divider />

          {currentTemplate ? (
            <div className="receipt-preview bg-white rounded mx-auto" style={currentTemplate.styles as React.CSSProperties}>
              {currentTemplate.elements.length === 0 ? (
                <Empty description="No elements added yet" />
              ) : (
                <div>
                  {currentTemplate.elements.map((element) => (
                    <div key={element.id} className="preview-element">
                      <ElementRenderer element={element} preview={true} previewMode={previewMode} previewData={previewData} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Empty description="No template selected" />
          )}
        </Space>
      </Drawer>

      <Modal
        title="Template Data"
        open={templateDataVisible}
        onCancel={() => setTemplateDataVisible(false)}
        width={800}
        footer={
          <Space>
            <Button type={dataFormat === "yaml" ? "primary" : "default"} onClick={() => setDataFormat("yaml")}>
              YAML
            </Button>
            <Button type={dataFormat === "json" ? "primary" : "default"} onClick={() => setDataFormat("json")}>
              JSON
            </Button>
            <Button onClick={() => setTemplateDataVisible(false)}>Close</Button>
          </Space>
        }
      >
        <div className="p-4 rounded">
          <pre className="whitespace-pre-wrap font-mono text-sm h-[650px] overflow-auto">
            <Text copyable>{getFormattedData()}</Text>
          </pre>
        </div>
      </Modal>
    </>
  );
};

export default PreviewPanel;
