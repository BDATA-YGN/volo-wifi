import { CSSProperties } from 'react';

export interface ReceiptElement {
  id: string;
  type: ElementType;
  content: string;
  styles: CSSProperties;
  dataBinding?: string;
  children?: ReceiptElement[];
  tableConfig?: {
    columns: {
      key: string;
      title: string;
      dataBinding: string;
      align: 'left' | 'center' | 'right';
      width?: string;
    }[];
  };
}

export enum ElementType {
  HEADER = 'header',
  TEXT = 'text',
  IMAGE = 'image',
  TABLE = 'table',
  BARCODE = 'barcode',
  QR_CODE = 'qrcode',
  DIVIDER = 'divider',
  SPACER = 'spacer',
}

export interface ReceiptTemplate {
  id: string;
  name: string;
  elements: ReceiptElement[];
  paperSize: PaperSize;
  styles: CSSProperties;
  preview?: any;
}

export enum PaperSize {
  THERMAL_80MM = 'thermal_80mm',
  A4 = 'a4',
  LETTER = 'letter',
  CUSTOM = 'custom',
}

export interface ReceiptData {
  [key: string]: any;
}