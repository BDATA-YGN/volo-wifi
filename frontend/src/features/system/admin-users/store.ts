import { create } from "zustand";
import type {
  CommonListResponse,
  CommonResponse,
} from "@/common/interface/interface";

interface AdminState {
  adminData: CommonResponse;
  setAdminData: (data: any) => void;
  adminDataList: CommonListResponse;
  setAdminDataList: (data: any) => void;
}

export const useAdminStore = create<AdminState>((set) => ({
  adminDataList: {
    data: [],
    meta: {
      currentPage: 0,
      totalPages: 0,
      totalRows: 0,
    },
  },
  setAdminDataList: (adminDataList) => set({ adminDataList }),
  adminData: {
    data: null,
  },
  setAdminData: (adminData) => set({ adminData }),
}));
