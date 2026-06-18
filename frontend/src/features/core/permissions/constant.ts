export const MAP_ROLE_SETTINGS = {
    createOrUpdate: (id?: string) => `/menu-permission/map-role-settings/${id}`,
    delete: (id: string) => `/menu-permission/map-role-settings/delete/${id}`,
    listOrDetails: (id?: string) => `/menu-permission/map-role-settings/${id}`,
  }
  
  export const MNG_ROLES = {
    createOrUpdate: (id?: string) => `/menu-permission/mng-roles/${id}`,
    delete: (id: string) => `/menu-permission/mng-roles/delete/${id}`,
    listOrDetails: (id?: string) => `/menu-permission/mng-roles/${id}`,
  }
  
  export const MNG_ROLE_SETTINGS = {
    createOrUpdate: (id?: string) => `/menu-permission/mng-role-settings/${id}`,
    delete: (id: string) => `/menu-permission/mng-role-settings/delete/${id}`,
    listOrDetails: (id?: string) => `/menu-permission/mng-role-settings/${id}`,
  }