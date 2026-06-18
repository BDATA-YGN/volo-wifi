import { create } from "zustand";
import { CommonListResponse, CommonResponse } from "@/common/interface/interface";

interface MngRolesState {
  mngRolesList: CommonListResponse;
  setMngRolesList: (data: any) => void;
  mngRole: CommonResponse;
  setMngRole: (data: any) => void;
}

export const useMngRolesStore = create<MngRolesState>((set) => ({
  mngRolesList: {
    data: [],
    meta: {
      currentPage: 0,
      totalPages: 0,
      totalRows: 0,
    },
  },
  setMngRolesList: (mngRolesList) => set({ mngRolesList }),
  mngRole: {
    data: null,
  },
  setMngRole: (mngRole) => set({ mngRole }),
}));