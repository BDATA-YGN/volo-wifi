import { create } from "zustand";

interface PermissionDataState {
  permissionData: null;
  setPermissionData: (data: any) => void;
}

export const usePermissionStore = create<PermissionDataState>((set, get) => ({
  permissionData: null,
  setPermissionData: (permissionData) => set((state) => state.permissionData !== permissionData ? { permissionData } : {}),
}));
