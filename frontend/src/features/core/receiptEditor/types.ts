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
  paperSize: any;
  styles: CSSProperties;
  preview?: any;
  code?: string;
  printerId?: string;
}

export const PaperSize = {
  THERMAL_44MM : '44mm',
  THERMAL_57MM : '57mm',
  THERMAL_58MM : '58mm',
  THERMAL_76MM : '76mm',
  THERMAL_78MM : '78mm',
  THERMAL_80MM : '80mm',
  A4 : 'A4',
  LETTER : 'letter',
  LABEL50x30 : 'LABEL50x30',
  LABEL100x150 : 'LABEL100x150',
  CUSTOM : 'custom'
}

export interface ReceiptData {
  [key: string]: any;
}