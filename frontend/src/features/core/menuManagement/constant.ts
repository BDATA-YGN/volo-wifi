
export const MENU_API_ROUTES = {
  getAllMenuGroups: "/menus-groups",
  getSingleMenuGroup: (id: number | string) => `/menus-groups/${id}`,
  createMenuGroup: "/menus-groups",
  updateMenuGroup: (id: number | string) => `/menus-groups/${id}`,
  deleteMenuGroup: (id: number | string) => `/menus-groups/${id}`,
  updateMenuGroupPositions: "/menus-groups/positions",
  getAllMenuItemsForGroup: (groupId: number | string) => `/menus-groups/${groupId}/menu-items`,
  getSingleMenuItem: (id: number | string) => `/menu-items/${id}`,
  createMenuItem: (groupId: number | string) => `/menu-items/${groupId}/menu-items`,
  updateMenuItem: (id: number | string) => `/menu-items/${id}`,
  deleteMenuItem: (id: number | string) => `/menu-items/${id}`,
  updateMenuItemPositions: (groupId: number | string) => `/menus-groups/${groupId}/menu-items/positions`,
};