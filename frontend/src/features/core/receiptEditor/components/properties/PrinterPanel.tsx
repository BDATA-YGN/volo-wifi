"use client";
import React, { useEffect, useState } from "react";
import { Form, Select, Typography, Divider } from "antd";
import { useReceiptStore } from "../../store";
import * as MainUseCase from "@/features/core/printers/usePrinters";

const { Option } = Select;
const { Title } = Typography;

const PrinterPanel: React.FC = () => {
  const { currentTemplate, setSelectedPrinter, selectedPrinter } = useReceiptStore();

  const useCaseSource = MainUseCase.usePrinters();
  const dataList = useCaseSource.list || [];
  const loading = useCaseSource.loading;
  const fetchFn = useCaseSource.fetchPrinters;

  useEffect(() => {
    fetchFn({}).catch(() => {
        console.log("ERROR fetch printers");
      });
  }, []);

  if (!currentTemplate) {
    return (
      <div className="p-4 text-center text-gray-500">No template selected</div>
    );
  }

  const handlePrinterChange = (value: string) => {
    setSelectedPrinter(value);
  };

  return (
    <div className="p-1">
      <Form layout="vertical">
        <Title level={5}>Printer Mapping</Title>
        <Divider className="mt-2 mb-4" />

        <Form.Item label="Select Printer">
          <Select
            value={selectedPrinter ?? undefined}
            onChange={handlePrinterChange}
            className="w-full"
            loading={loading}
            placeholder="Choose a printer"
          >
            {dataList.map((printer: any) => (
              <Option key={printer.id} value={printer.id}>
                {printer.printerName} - {printer.desc}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Title level={5} className="mt-4">
          Margins
        </Title>
      </Form>
    </div>
  );
};

export default PrinterPanel;
