import { create } from "zustand";
import { CommonListResponse, CommonResponse } from "@/common/interface/interface";

interface MapRoleSettingsState {
  mapRoleSettingsList: CommonListResponse;
  setMapRoleSettingsList: (data: any) => void;
  mapRoleSetting: CommonResponse;
  setMapRoleSetting: (data: any) => void;
}

export const useMapRoleSettingsStore = create<MapRoleSettingsState>((set) => ({
  mapRoleSettingsList: {
    data: [],
    meta: {
      currentPage: 0,
      totalPages: 0,
      totalRows: 0,
    },
  },
  setMapRoleSettingsList: (mapRoleSettingsList) => set({ mapRoleSettingsList }),
  mapRoleSetting: {
    data: null,
  },
  setMapRoleSetting: (mapRoleSetting) => set({ mapRoleSetting }),
}));