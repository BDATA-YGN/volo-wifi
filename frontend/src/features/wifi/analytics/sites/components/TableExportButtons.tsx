"use client";

import React, { useState } from "react";
import { Button, Space, message } from "antd";
import { ExportOutlined, FileExcelOutlined, FilePdfOutlined } from "@ant-design/icons";
import {
  downloadCsv,
  downloadExcel,
  downloadPdf,
  type TableExportPayload,
} from "../table-export";

type Props = {
  payload: TableExportPayload | null;
  disabled?: boolean;
};

const TableExportButtons: React.FC<Props> = ({ payload, disabled }) => {
  const [busy, setBusy] = useState<"excel" | "pdf" | "csv" | null>(null);
  const inactive = disabled || !payload || payload.rows.length === 0;

  const run = async (kind: "excel" | "pdf" | "csv") => {
    if (!payload) return;
    setBusy(kind);
    try {
      if (kind === "excel") await downloadExcel(payload);
      else if (kind === "csv") downloadCsv(payload);
      else await downloadPdf(payload);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Export failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Space size={8} wrap>
      <Button
        size="small"
        icon={<FileExcelOutlined />}
        disabled={inactive}
        loading={busy === "excel"}
        onClick={() => void run("excel")}
      >
        Excel
      </Button>
      <Button
        size="small"
        icon={<FilePdfOutlined />}
        disabled={inactive}
        loading={busy === "pdf"}
        onClick={() => void run("pdf")}
      >
        PDF
      </Button>
      <Button
        size="small"
        icon={<ExportOutlined />}
        disabled={inactive}
        loading={busy === "csv"}
        onClick={() => void run("csv")}
      >
        Export
      </Button>
    </Space>
  );
};

export default TableExportButtons;
