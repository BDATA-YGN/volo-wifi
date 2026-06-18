"use client";

import { useRequest } from "ahooks";
import * as UseCases from "@/features/core/permissions/query";
import { CommonListResponse, CommonResponse } from "@/common/interface/interface";
import { useMapRoleSettingsStore } from "@/features/core/permissions/store/mapRoleSettingsStore";
import { useMngRolesStore } from "@/features/core/permissions/store/mngRolesStore";
import { useMngRoleSettingsStore } from "@/features/core/permissions/store/mngRoleSettingsStore";
import { PaginationParams } from "@/common/interface/interface";

export const useManagement = () => {
  // Map Role Settings Store
  const {
    mapRoleSettingsList,
    setMapRoleSettingsList,
    mapRoleSetting,
    setMapRoleSetting
  } = useMapRoleSettingsStore();

  // Management Roles Store
  const {
    mngRolesList,
    setMngRolesList,
    mngRole,
    setMngRole
  } = useMngRolesStore();

  // Management Role Settings Store
  const {
    mngRoleSettingsList,
    setMngRoleSettingsList,
    mngRoleSetting,
    setMngRoleSetting
  } = useMngRoleSettingsStore();

  // Fetch Map Role Settings
  const fetchMapRoleSettingsRequest = useRequest(
    async (id?: string, paginationParams?: PaginationParams) => {
      const data = await UseCases.getMapRoleSettings(id, paginationParams);
      if (Array.isArray(data.data)) {
        setMapRoleSettingsList(data as CommonListResponse);
      } else {
        setMapRoleSetting(data as CommonResponse);
      }
      return data;
    },
    {
      manual: true,
      onError: (error) => {
        console.error("Fetch map role settings error:", error);
      },
    }
  );

  // Create Map Role Setting
  const createMapRoleSettingRequest = useRequest(
    async (payload: any) => {
      const data = (await UseCases.createMapRoleSetting(payload)) as CommonResponse;
      setMapRoleSetting(data);
      return data;
    },
    {
      manual: true,
      onError: (error) => {
        console.error("Create map role setting error:", error);
      },
    }
  );

  // Update Map Role Setting
  const updateMapRoleSettingRequest = useRequest(
    async ({ id, payload }: { id: string; payload: any }) => {
      const data = (await UseCases.updateMapRoleSetting(id, payload)) as CommonResponse;
      setMapRoleSetting(data);
      return data;
    },
    {
      manual: true,
      onError: (error) => {
        console.error("Update map role setting error:", error);
      },
    }
  );

  // Delete Map Role Setting
  const deleteMapRoleSettingRequest = useRequest(
    async (id: string) => {
      const data = (await UseCases.deleteMapRoleSetting(id)) as CommonResponse;
      setMapRoleSetting(data);
      return data;
    },
    {
      manual: true,
      onError: (error) => {
        console.error("Delete map role setting error:", error);
      },
    }
  );

  // Fetch Management Roles
  const fetchMngRolesRequest = useRequest(
    async (id?: string, paginationParams?: PaginationParams) => {
      const data = await UseCases.getMngRoles(id, paginationParams);
      if (Array.isArray(data.data)) {
        setMngRolesList(data as CommonListResponse);
      } else {
        setMngRole(data as CommonResponse);
      }
      return data;
    },
    {
      manual: true,
      onError: (error) => {
        console.error("Fetch management roles error:", error);
      },
    }
  );

  // Create Management Role
  const createMngRoleRequest = useRequest(
    async (payload: any) => {
      const data = (await UseCases.createMngRole(payload)) as CommonResponse;
      setMngRole(data);
      return data;
    },
    {
      manual: true,
      onError: (error) => {
        console.error("Create management role error:", error);
      },
    }
  );

  // Update Management Role
  const updateMngRoleRequest = useRequest(
    async ({ id, payload }: { id: string; payload: any }) => {
      const data = (await UseCases.updateMngRole(id, payload)) as CommonResponse;
      setMngRole(data);
      return data;
    },
    {
      manual: true,
      onError: (error) => {
        console.error("Update management role error:", error);
      },
    }
  );

  // Delete Management Role
  const deleteMngRoleRequest = useRequest(
    async (id: string) => {
      const data = (await UseCases.deleteMngRole(id)) as CommonResponse;
      setMngRole(data);
      return data;
    },
    {
      manual: true,
      onError: (error) => {
        console.error("Delete management role error:", error);
      },
    }
  );

  // Fetch Management Role Settings
  const fetchMngRoleSettingsRequest = useRequest(
    async (id?: string, paginationParams?: PaginationParams) => {
      const data = await UseCases.getMngRoleSettings(id, paginationParams);
      if (Array.isArray(data.data)) {
        setMngRoleSettingsList(data as CommonListResponse);
      } else {
        setMngRoleSetting(data as CommonResponse);
      }
      return data;
    },
    {
      manual: true,
      onError: (error) => {
        console.error("Fetch management role settings error:", error);
      },
    }
  );

  // Create Management Role Setting
  const createMngRoleSettingRequest = useRequest(
    async (payload: any) => {
      const data = (await UseCases.createMngRoleSetting(payload)) as CommonResponse;
      setMngRoleSetting(data);
      return data;
    },
    {
      manual: true,
      onError: (error) => {
        console.error("Create management role setting error:", error);
      },
    }
  );

  // Update Management Role Setting
  const updateMngRoleSettingRequest = useRequest(
    async ({ id, payload }: { id: string; payload: any }) => {
      const data = (await UseCases.updateMngRoleSetting(id, payload)) as CommonResponse;
      setMngRoleSetting(data);
      return data;
    },
    {
      manual: true,
      onError: (error) => {
        console.error("Update management role setting error:", error);
      },
    }
  );

  // Delete Management Role Setting
  const deleteMngRoleSettingRequest = useRequest(
    async (id: string) => {
      const data = (await UseCases.deleteMngRoleSetting(id)) as CommonResponse;
      setMngRoleSetting(data);
      return data;
    },
    {
      manual: true,
      onError: (error) => {
        console.error("Delete management role setting error:", error);
      },
    }
  );

  // Helper functions for manual triggering
  const createMapRoleSetting = (payload: any) => createMapRoleSettingRequest.run(payload);
  const updateMapRoleSetting = (id: string, payload: any) => updateMapRoleSettingRequest.run({ id, payload });
  const deleteMapRoleSetting = (id: string) => deleteMapRoleSettingRequest.run(id);
  const fetchMapRoleSettings = (id?: string, paginationParams?: PaginationParams) => fetchMapRoleSettingsRequest.run(id, paginationParams);

  const createMngRole = (payload: any) => createMngRoleRequest.run(payload);
  const updateMngRole = (id: string, payload: any) => updateMngRoleRequest.run({ id, payload });
  const deleteMngRole = (id: string) => deleteMngRoleRequest.run(id);
  const fetchMngRoles = (id?: string, paginationParams?: PaginationParams) => fetchMngRolesRequest.run(id, paginationParams);

  const createMngRoleSetting = (payload: any) => createMngRoleSettingRequest.run(payload);
  const updateMngRoleSetting = (id: string, payload: any) => updateMngRoleSettingRequest.run({ id, payload });
  const deleteMngRoleSetting = (id: string) => deleteMngRoleSettingRequest.run(id);
  const fetchMngRoleSettings = (id?: string, paginationParams?: PaginationParams) => fetchMngRoleSettingsRequest.run(id, paginationParams);

  return {
    // Map Role Settings Data
    mapRoleSettingsList: mapRoleSettingsList?.data ?? [],
    mapRoleSetting: mapRoleSetting?.data ?? {},

    // Management Roles Data
    mngRolesList: mngRolesList?.data ?? [],
    mngRole: mngRole?.data ?? {},

    // Management Role Settings Data
    mngRoleSettingsList: mngRoleSettingsList?.data ?? [],
    mngRoleSetting: mngRoleSetting?.data ?? {},

    // Fetch functions
    fetchMngRoles,
    fetchMapRoleSettings,
    fetchMngRoleSettings,

    // Create functions
    createMngRole,
    createMapRoleSetting,
    createMngRoleSetting,

    // Update functions
    updateMngRole,
    updateMapRoleSetting,
    updateMngRoleSetting,

    // Delete functions
    deleteMngRole,
    deleteMapRoleSetting,
    deleteMngRoleSetting,

    // Loading states
    loading: {
      fetchMngRoles: fetchMngRolesRequest.loading,
      createMngRole: createMngRoleRequest.loading,
      updateMngRole: updateMngRoleRequest.loading,
      deleteMngRole: deleteMngRoleRequest.loading,
      fetchMapRoleSettings: fetchMapRoleSettingsRequest.loading,
      createMapRoleSetting: createMapRoleSettingRequest.loading,
      updateMapRoleSetting: updateMapRoleSettingRequest.loading,
      deleteMapRoleSetting: deleteMapRoleSettingRequest.loading,
      fetchMngRoleSettings: fetchMngRoleSettingsRequest.loading,
      createMngRoleSetting: createMngRoleSettingRequest.loading,
      updateMngRoleSetting: updateMngRoleSettingRequest.loading,
      deleteMngRoleSetting: deleteMngRoleSettingRequest.loading,
    },

    // Error states
    error: {
      fetchMngRoles: fetchMngRolesRequest.error,
      createMngRole: createMngRoleRequest.error,
      updateMngRole: updateMngRoleRequest.error,
      deleteMngRole: deleteMngRoleRequest.error,
      fetchMapRoleSettings: fetchMapRoleSettingsRequest.error,
      createMapRoleSetting: createMapRoleSettingRequest.error,
      updateMapRoleSetting: updateMapRoleSettingRequest.error,
      deleteMapRoleSetting: deleteMapRoleSettingRequest.error,
      fetchMngRoleSettings: fetchMngRoleSettingsRequest.error,
      createMngRoleSetting: createMngRoleSettingRequest.error,
      updateMngRoleSetting: updateMngRoleSettingRequest.error,
      deleteMngRoleSetting: deleteMngRoleSettingRequest.error,
    },

    // Response data
    response: {
      fetchMngRoles: fetchMngRolesRequest.data,
      createMngRole: createMngRoleRequest.data,
      updateMngRole: updateMngRoleRequest.data,
      deleteMngRole: deleteMngRoleRequest.data,
      fetchMapRoleSettings: fetchMapRoleSettingsRequest.data,
      createMapRoleSetting: createMapRoleSettingRequest.data,
      updateMapRoleSetting: updateMapRoleSettingRequest.data,
      deleteMapRoleSetting: deleteMapRoleSettingRequest.data,
      fetchMngRoleSettings: fetchMngRoleSettingsRequest.data,
      createMngRoleSetting: createMngRoleSettingRequest.data,
      updateMngRoleSetting: updateMngRoleSettingRequest.data,
      deleteMngRoleSetting: deleteMngRoleSettingRequest.data,
    },

    // Store functions for Map Role Settings
    setMapRoleSettingsList,
    setMapRoleSetting,

    // Store functions for Management Roles
    setMngRolesList,
    setMngRole,

    // Store functions for Management Role Settings
    setMngRoleSettingsList,
    setMngRoleSetting,

    // Pagination for Map Role Settings
    mapRoleSettingsPagination: {
      currentPage: mapRoleSettingsList?.meta?.currentPage ?? 1,
      totalPages: mapRoleSettingsList?.meta?.totalPages ?? 0,
      totalRows: mapRoleSettingsList?.meta?.totalRows ?? 0,
    },

    // Pagination for Management Roles
    mngRolesPagination: {
      currentPage: mngRolesList?.meta?.currentPage ?? 1,
      totalPages: mngRolesList?.meta?.totalPages ?? 0,
      totalRows: mngRolesList?.meta?.totalRows ?? 0,
    },

    // Pagination for Management Role Settings
    mngRoleSettingsPagination: {
      currentPage: mngRoleSettingsList?.meta?.currentPage ?? 1,
      totalPages: mngRoleSettingsList?.meta?.totalPages ?? 0,
      totalRows: mngRoleSettingsList?.meta?.totalRows ?? 0,
    },

    // Run functions (for direct access if needed)
    run: {
      fetchMngRoles: fetchMngRolesRequest.run,
      createMngRole: createMngRoleRequest.run,
      updateMngRole: updateMngRoleRequest.run,
      deleteMngRole: deleteMngRoleRequest.run,
      fetchMapRoleSettings: fetchMapRoleSettingsRequest.run,
      createMapRoleSetting: createMapRoleSettingRequest.run,
      updateMapRoleSetting: updateMapRoleSettingRequest.run,
      deleteMapRoleSetting: deleteMapRoleSettingRequest.run,
      fetchMngRoleSettings: fetchMngRoleSettingsRequest.run,
      createMngRoleSetting: createMngRoleSettingRequest.run,
      updateMngRoleSetting: updateMngRoleSettingRequest.run,
      deleteMngRoleSetting: deleteMngRoleSettingRequest.run,
    },

    // Mutate functions for optimistic updates
    mutate: {
      fetchMngRoles: fetchMngRolesRequest.mutate,
      fetchMapRoleSettings: fetchMapRoleSettingsRequest.mutate,
      fetchMngRoleSettings: fetchMngRoleSettingsRequest.mutate,
    },
  };
};