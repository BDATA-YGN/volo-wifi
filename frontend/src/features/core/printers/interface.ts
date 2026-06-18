import { PrinterAttributes } from "@/features/core/printers/types";
export interface Printers extends PrinterAttributes {};

export enum SearchColumns {
    FULLNAME = "printerName",
    USERNAME = "username",
    EMAIL = "email",
  }