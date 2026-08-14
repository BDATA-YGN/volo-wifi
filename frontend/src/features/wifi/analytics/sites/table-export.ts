import type { Cell } from "exceljs";
import { saveAs } from "file-saver";
import { unparse } from "papaparse";

export type TableExportColumn = {
  title: string;
  align?: "left" | "right";
  format?: "text" | "integer" | "amount";
};

export type TableExportCell = string | number | null | undefined;

export type TableExportPayload = {
  filename: string;
  title: string;
  subtitle?: string;
  columns: TableExportColumn[];
  rows: TableExportCell[][];
  footer?: TableExportCell[];
};

function safeFilename(name: string) {
  return name.replace(/[^\w.\-]+/g, "_").replace(/_+/g, "_");
}

function cellText(value: TableExportCell): string {
  if (value == null) return "";
  return String(value);
}

function colLetter(index: number) {
  let n = index + 1;
  let label = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    label = String.fromCharCode(65 + rem) + label;
    n = Math.floor((n - 1) / 26);
  }
  return label;
}

function applyCell(cell: Cell, value: TableExportCell, column: TableExportColumn) {
  const isNumber =
    (column.format === "integer" || column.format === "amount") &&
    typeof value === "number" &&
    Number.isFinite(value);

  if (isNumber) {
    cell.value = value;
    cell.numFmt = "#,##0";
  } else {
    cell.value = cellText(value);
  }

  cell.alignment = {
    vertical: "middle",
    horizontal: column.align === "right" || isNumber ? "right" : "left",
    wrapText: true,
  };
  cell.font = { name: "Calibri", size: 10 };
  cell.border = {
    top: { style: "thin", color: { argb: "FFD9D9D9" } },
    left: { style: "thin", color: { argb: "FFD9D9D9" } },
    bottom: { style: "thin", color: { argb: "FFD9D9D9" } },
    right: { style: "thin", color: { argb: "FFD9D9D9" } },
  };
}

export async function downloadExcel(payload: TableExportPayload) {
  const exceljs = await import("exceljs");
  const workbook = new exceljs.Workbook();
  workbook.creator = "volo-wifi";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(payload.title.slice(0, 31) || "Export", {
    views: [{ state: "frozen", ySplit: payload.subtitle ? 4 : 3, showGridLines: false }],
  });

  const colCount = Math.max(payload.columns.length, 1);
  const lastCol = colLetter(colCount - 1);

  sheet.mergeCells(`A1:${lastCol}1`);
  const titleCell = sheet.getCell("A1");
  titleCell.value = payload.title;
  titleCell.font = { name: "Calibri", size: 16, bold: true, color: { argb: "FF1F1F1F" } };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };
  sheet.getRow(1).height = 24;

  let headerRowIndex = 3;
  if (payload.subtitle) {
    sheet.mergeCells(`A2:${lastCol}2`);
    const subtitleCell = sheet.getCell("A2");
    subtitleCell.value = payload.subtitle;
    subtitleCell.font = { name: "Calibri", size: 10, color: { argb: "FF666666" } };
    headerRowIndex = 4;
  }

  payload.columns.forEach((column, index) => {
    const width =
      column.format === "amount"
        ? 16
        : column.format === "integer"
          ? 12
          : Math.min(28, Math.max(12, column.title.length + 4));
    sheet.getColumn(index + 1).width = width;
  });

  const headerRow = sheet.getRow(headerRowIndex);
  headerRow.height = 22;
  payload.columns.forEach((column, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = column.title;
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1677FF" },
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: column.align === "right" ? "right" : "left",
      wrapText: true,
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FF1677FF" } },
      left: { style: "thin", color: { argb: "FF1677FF" } },
      bottom: { style: "thin", color: { argb: "FF1677FF" } },
      right: { style: "thin", color: { argb: "FF1677FF" } },
    };
  });

  payload.rows.forEach((row, rowIndex) => {
    const excelRow = sheet.getRow(headerRowIndex + 1 + rowIndex);
    excelRow.height = 18;
    payload.columns.forEach((column, colIndex) => {
      const cell = excelRow.getCell(colIndex + 1);
      applyCell(cell, row[colIndex], column);
      if (rowIndex % 2 === 1) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF7F9FC" },
        };
      }
    });
  });

  if (payload.footer) {
    const footerRow = sheet.getRow(headerRowIndex + 1 + payload.rows.length);
    footerRow.height = 20;
    payload.columns.forEach((column, colIndex) => {
      const cell = footerRow.getCell(colIndex + 1);
      applyCell(cell, payload.footer?.[colIndex], column);
      cell.font = { name: "Calibri", size: 10, bold: true };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFEEF3FB" },
      };
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as ArrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, `${safeFilename(payload.filename)}.xlsx`);
}

export function downloadCsv(payload: TableExportPayload) {
  const header = payload.columns.map((c) => c.title);
  const data = [header, ...payload.rows];
  if (payload.footer) data.push(payload.footer);
  const csv = unparse(data);
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  saveAs(blob, `${safeFilename(payload.filename)}.csv`);
}

export async function downloadPdf(payload: TableExportPayload) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const wide = payload.columns.length > 8;
  const doc = new jsPDF({
    orientation: wide ? "landscape" : "portrait",
    unit: "pt",
    format: "a4",
  });

  doc.setFontSize(13);
  doc.text(payload.title, 28, 32);
  if (payload.subtitle) {
    doc.setFontSize(9);
    doc.setTextColor(90);
    doc.text(payload.subtitle, 28, 46);
    doc.setTextColor(0);
  }

  const formatPdf = (value: TableExportCell) => {
    if (typeof value === "number" && Number.isFinite(value)) return value.toLocaleString();
    return cellText(value);
  };

  autoTable(doc, {
    startY: payload.subtitle ? 58 : 44,
    head: [payload.columns.map((c) => c.title)],
    body: payload.rows.map((row) => row.map(formatPdf)),
    foot: payload.footer ? [payload.footer.map(formatPdf)] : undefined,
    styles: {
      fontSize: wide ? 6.5 : 8,
      cellPadding: 3,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [22, 119, 255],
      textColor: 255,
      fontStyle: "bold",
    },
    footStyles: {
      fillColor: [245, 245, 245],
      textColor: 20,
      fontStyle: "bold",
    },
    columnStyles: Object.fromEntries(
      payload.columns.map((col, index) => [
        index,
        { halign: col.align === "right" ? "right" : "left" },
      ])
    ),
    margin: { left: 28, right: 28 },
  });

  doc.save(`${safeFilename(payload.filename)}.pdf`);
}
