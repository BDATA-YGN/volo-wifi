import { create } from 'zustand';
import { MenuGroup, MenuItem } from './types';

interface MenuState {
  menuGroups: MenuGroup[];
  setMenuGroups: (groups: MenuGroup[]) => void;
  addMenuGroup: (group: MenuGroup) => void;
  updateMenuGroup: (id: number, group: Partial<MenuGroup>) => void;
  removeMenuGroup: (id: number) => void;
  addMenuItem: (groupId: number, item: MenuItem) => void;
  updateMenuItem: (groupId: number, itemId: number, item: Partial<MenuItem>) => void;
  removeMenuItem: (groupId: number, itemId: number) => void;
}

export const useMenuManagementStore = create<MenuState>((set) => ({
  menuGroups: [],
  setMenuGroups: (groups) => set(() => ({ menuGroups: groups })),

  addMenuGroup: (group) =>
    set((state) => ({
      menuGroups: [
        ...state.menuGroups,
        {
          ...group,
        }
      ]
    })),

  updateMenuGroup: (id, group) =>
    set((state) => ({
      menuGroups: state.menuGroups.map(g =>
        g.id === id ? { ...g, ...group, updatedAt: new Date().toISOString() } : g
      )
    })),

  removeMenuGroup: (id) =>
    set((state) => ({
      menuGroups: state.menuGroups.filter(g => g.id !== id)
    })),

  addMenuItem: (groupId, item) =>
    set((state) => ({
      menuGroups: state.menuGroups.map(group =>
        group.id === groupId
          ? {
              ...group,
              items: [
                ...group.items,
                {
                  ...item,
                  groupId,
                }
              ],
              updatedAt: new Date().toISOString()
            }
          : group
      )
    })),

  updateMenuItem: (groupId, itemId, item) =>
    set((state) => ({
      menuGroups: state.menuGroups.map(group =>
        group.id === groupId
          ? {
              ...group,
              items: group.items.map(i =>
                i.id === itemId ? { ...i, ...item, updatedAt: new Date().toISOString() } : i
              ),
              updatedAt: new Date().toISOString()
            }
          : group
      )
    })),

  removeMenuItem: (groupId, itemId) =>
    set((state) => ({
      menuGroups: state.menuGroups.map(group =>
        group.id === groupId
          ? {
              ...group,
              items: group.items.filter(i => i.id !== itemId),
              updatedAt: new Date().toISOString()
            }
          : group
      )
    })),
}));