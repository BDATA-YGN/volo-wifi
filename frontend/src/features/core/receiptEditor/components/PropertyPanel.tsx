"use client";
import React from "react";
import { Card, Tabs, Typography, Button, Space } from "antd";
import { Code, Layers, Printer, Settings, X } from "lucide-react";
import { useReceiptStore } from "../store";
import ElementProperties from "./properties/ElementProperties";
import TemplateProperties from "./properties/TemplateProperties";
import DataBindingPanel from "./properties/DataBindingPanel";
import CodeEditor from "./properties/CodeEditor";
import PrinterPanel from "./properties/PrinterPanel";

const { Title } = Typography;

interface PropertyPanelProps {
  className?: string;
}

const PropertyPanel: React.FC<PropertyPanelProps> = ({ className }) => {
  const { selectedElement, propertiesPanelCollapsed, togglePropertiesPanel, codeEditorOpen, toggleCodeEditor } = useReceiptStore();

  const tabItems = [
    {
      key: "element",
      label: (
        <Space>
          <Layers size={16} />
          <span>Element</span>
        </Space>
      ),
      children: selectedElement ? <ElementProperties element={selectedElement} /> : <div className="p-4 text-center text-gray-500">Select an element to edit its properties</div>,
    },
    {
      key: "template",
      label: (
        <Space>
          <Settings size={16} />
          <span>Template</span>
        </Space>
      ),
      children: <TemplateProperties />,
    },
    {
      key: "data",
      label: (
        <Space>
          <Code size={16} />
          <span>Data</span>
        </Space>
      ),
      children: <DataBindingPanel />,
    },
    {
      key: "printer",
      label: (
        <Space>
          <Printer size={16} />
          <span>Printer</span>
        </Space>
      ),
      children: <PrinterPanel />,
    },
  ];

  return (
    <div className={`property-panel ${className || ""}`}>
      {!propertiesPanelCollapsed && (
        <Card
          title={
            <div className="flex justify-between items-center">
              <Title level={5}>Properties</Title>
              <Button type="text" icon={<X size={16} />} onClick={togglePropertiesPanel} />
            </div>
          }
          style={{ overflowY: "auto", height: "var(--content-body-height)", border: "none" }}
          extra={<Button type={codeEditorOpen ? "primary" : "default"} icon={<Code size={16} />} onClick={toggleCodeEditor} size="small" />}
        >
          {codeEditorOpen ? <CodeEditor /> : <Tabs defaultActiveKey="element" items={tabItems} className="pt-2" />}
        </Card>
      )}
    </div>
  );
};

export default PropertyPanel;
