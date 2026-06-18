"use client";
import React from "react";
import Header from "@/features/core/receiptEditor/components/ReceiptHeader";
import ElementsPanel from "@/features/core/receiptEditor/components/ElementsPanel";
import BuilderPanel from "@/features/core/receiptEditor/components/BuilderPanel";
import PropertyPanel from "@/features/core/receiptEditor/components/PropertyPanel";
import PreviewPanel from "@/features/core/receiptEditor/components/PreviewPanel";
import { useReceiptStore } from "@/features/core/receiptEditor/store";

const ReceiptEditorPage: React.FC = () => {
  const { propertiesPanelCollapsed } = useReceiptStore();

  return (
    <div>
      <Header />
      <div className="relative">
        <div className="flex flex-col lg:flex-row gap-4 h-[calc(90vh-64px)]">
          <BuilderPanel className="flex-1" />
          <PropertyPanel className={`${propertiesPanelCollapsed ? "w-0 overflow-hidden" : "flex-1 max-w-md"}`} />
          <PreviewPanel />
        </div>
        <ElementsPanel />
      </div>
    </div>
  );
};

export default ReceiptEditorPage;
