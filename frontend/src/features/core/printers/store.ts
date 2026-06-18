import { CommonListResponse, CommonResponse } from "@/common/interface/interface";
import { create } from 'zustand';

interface PrinterState {
  printerData: CommonResponse;
  setPrinterData: (channels: any) => void;
  printerDataList: CommonListResponse;
  setPrinterDataList: (channels: any) => void;
}

export const usePrinterStore = create<PrinterState>((set) => ({
  printerDataList: {
    data: [],
    meta: {
      currentPage: 0,
      totalPages: 0,
      totalRows: 0,
    },
  },
  setPrinterDataList: (printerDataList) => set({ printerDataList }),
  printerData: {
    data: null,
  },
  setPrinterData: (printerData) => set({ printerData }),
}));
