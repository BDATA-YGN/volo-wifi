export interface PrinterAttributes {
    id?: string;
    printerName: string;
    port: string;
    baudRate: number;
    width: string;
    height: string;
    preview: boolean;
    margin: string;
    copies: number;
    timeOutPerLine: number;
    pageSize: string;
    silent: boolean
    createdAt: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }
  
  export interface PrinterResponse {
    message?: string;
    data: PrinterAttributes[];
    meta?: Meta;
  }
  