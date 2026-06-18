import { create } from "zustand";
import { CommonListResponse, CommonResponse } from "@/common/interface/interface";

interface MngRoleSettingsState {
  mngRoleSettingsList: CommonListResponse;
  setMngRoleSettingsList: (data: any) => void;
  mngRoleSetting: CommonResponse;
  setMngRoleSetting: (data: any) => void;
}

export const useMngRoleSettingsStore = create<MngRoleSettingsState>((set) => ({
  mngRoleSettingsList: {
    data: [],
    meta: {
      currentPage: 0,
      totalPages: 0,
      totalRows: 0,
    },
  },
  setMngRoleSettingsList: (mngRoleSettingsList) => set({ mngRoleSettingsList }),
  mngRoleSetting: {
    data: null,
  },
  setMngRoleSetting: (mngRoleSetting) => set({ mngRoleSetting }),
}));