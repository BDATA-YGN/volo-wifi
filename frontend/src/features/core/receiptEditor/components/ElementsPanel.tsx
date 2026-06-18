"use client";
import React from "react";
import { Button, Tooltip } from "antd";
import { TextIcon, ImageIcon, TableIcon, BarcodeIcon, Divide, AlignJustify, Space as SpaceIcon, QrCode, X, Plus, Minimize2 } from "lucide-react";
import { useReceiptStore } from "../store";
import { ElementType } from "../types";

const ElementsPanel: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(true);
  const [isMinimized, setIsMinimized] = React.useState(false);
  const { addElement } = useReceiptStore();

  const elementTypes = [
    {
      key: ElementType.HEADER,
      icon: <AlignJustify size={18} />,
      label: "Header",
      onClick: () => addElement(ElementType.HEADER),
    },
    {
      key: ElementType.TEXT,
      icon: <TextIcon size={18} />,
      label: "Text",
      onClick: () => addElement(ElementType.TEXT),
    },
    {
      key: ElementType.IMAGE,
      icon: <ImageIcon size={18} />,
      label: "Image",
      onClick: () => addElement(ElementType.IMAGE),
    },
    {
      key: ElementType.TABLE,
      icon: <TableIcon size={18} />,
      label: "Table",
      onClick: () => addElement(ElementType.TABLE),
    },
    {
      key: ElementType.BARCODE,
      icon: <BarcodeIcon size={18} />,
      label: "Barcode",
      onClick: () => addElement(ElementType.BARCODE),
    },
    {
      key: ElementType.QR_CODE,
      icon: <QrCode size={18} />,
      label: "QR Code",
      onClick: () => addElement(ElementType.QR_CODE),
    },
    {
      key: ElementType.DIVIDER,
      icon: <Divide size={18} />,
      label: "Divider",
      onClick: () => addElement(ElementType.DIVIDER),
    },
    {
      key: ElementType.SPACER,
      icon: <SpaceIcon size={18} />,
      label: "Spacer",
      onClick: () => addElement(ElementType.SPACER),
    },
  ];

  return (
    <div className={`absolute left-4 top-1/2 -translate-y-1/2 z-50 transition-all duration-300 h-[30px] ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
      <div className={`rounded-lg border transition-all duration-300 w-16`}>
        <div className="pt-2 flex items-center justify-end">
          <Button type="text" size="small" onClick={() => setIsOpen(false)}>
            <X size={14} />
          </Button>
        </div>
        <div className={`p-2`}>
          {elementTypes.map((item) => (
            <Tooltip key={item.key} title={item.label} placement="right">
              <Button className={`flex flex-col items-center justify-center w-full mb-2 h-[30px] hover:text-blue-600 hover:border-blue-600`} onClick={item.onClick}>
                {item.icon}
              </Button>
            </Tooltip>
          ))}
        </div>
      </div>

      {!isOpen && (
        <Button className="absolute left-full top-1/2 -translate-y-1/2 ml-2" onClick={() => setIsOpen(true)}>
          <Plus size={20} />
        </Button>
      )}
    </div>
  );
};

export default ElementsPanel;
