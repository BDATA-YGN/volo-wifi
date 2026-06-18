import { create } from "zustand";
import { persist } from "zustand/middleware";

export type MobileColorScheme = "light" | "dark";

interface MobileThemeStore {
  theme: MobileColorScheme;
  setTheme: (theme: MobileColorScheme) => void;
  toggleTheme: () => void;
}

export const useMobileThemeStore = create<MobileThemeStore>()(
  persist(
    (set) => ({
      theme: "light",
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),
    }),
    { name: "volo-mobile-theme" },
  ),
);
