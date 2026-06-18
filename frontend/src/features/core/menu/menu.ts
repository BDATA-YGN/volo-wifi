import { create } from "zustand";
import { persist } from 'zustand/middleware';
import { storageKey } from '@/lib/cacheKeys';

interface MenuStore {
  isMenuShow: boolean;
  setMenuShow: (status: boolean) => void;
  isMenuCollapsed: boolean;
  // current UI state (may be auto-collapsed on small screens)
  setMenuCollapsed: (collapsed: boolean) => void;
  // user's persisted preference (used to restore after refresh / breakpoint)
  menuCollapsedPreference: boolean;
  setMenuCollapsedPreference: (collapsed: boolean) => void;
  menuLayout: "sidebar" | "top";
  setMenuLayout: (layout: "sidebar" | "top") => void;
  toggleMenuLayout: () => void;
  lastMenuClick: string;
  setLastMenuClick: (menuItem: string) => void;
  lastMenuGroup: string;
  setLastMenuGroup: (menuGroup: string) => void;
  lastMenuMode: "menu" | "module";
  setLastMenuMode: (menuMode: "menu" | "module") => void;
  menus: Record<string, unknown>;
  setMenus: (menus: Record<string, unknown>) => void;
}

export const useMenuStore = create<MenuStore>()(
  persist(
    (set, get) => ({
      isMenuShow: false,
      setMenuShow: (status) => set((state) => state.isMenuShow !== status ? { isMenuShow: status } : {}),
      isMenuCollapsed: false,
      setMenuCollapsed: (collapsed) => set((state) => state.isMenuCollapsed !== collapsed ? { isMenuCollapsed: collapsed } : {}),
      menuCollapsedPreference: false,
      setMenuCollapsedPreference: (collapsed) =>
        set((state) =>
          state.menuCollapsedPreference !== collapsed || state.isMenuCollapsed !== collapsed
            ? { menuCollapsedPreference: collapsed, isMenuCollapsed: collapsed }
            : {}
        ),
      menuLayout: "sidebar",
      setMenuLayout: (layout) => set((state) => (state.menuLayout !== layout ? { menuLayout: layout } : {})),
      toggleMenuLayout: () =>
        set((state) => ({ menuLayout: state.menuLayout === "sidebar" ? "top" : "sidebar" })),
      lastMenuClick: '',
      setLastMenuClick: (menuItem) => set((state) => state.lastMenuClick !== menuItem ? { lastMenuClick: menuItem } : {}),
      lastMenuGroup: '',
      setLastMenuGroup: (menuGroup) => set((state) => state.lastMenuGroup !== menuGroup ? { lastMenuGroup: menuGroup } : {}),
      lastMenuMode: 'menu',
      setLastMenuMode: (menuMode) => set((state) => state.lastMenuMode !== menuMode ? { lastMenuMode: menuMode } : {}),
      menus: {},
      setMenus: (menus) => set((state) => state.menus !== menus ? { menus: menus } : {})
    }),
    {
      name: storageKey('menu-storage'),
      version: 1,
      partialize: (state) => ({
        isMenuCollapsed: state.isMenuCollapsed,
        menuCollapsedPreference: state.menuCollapsedPreference,
        menuLayout: state.menuLayout,
        lastMenuClick: state.lastMenuClick,
        lastMenuGroup: state.lastMenuGroup,
        lastMenuMode: state.lastMenuMode,
        // menus is server-derived; don't persist to reduce stale state risk
      }),
    }
  )
);
