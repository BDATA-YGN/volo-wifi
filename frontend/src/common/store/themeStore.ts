import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { storageKey } from '@/lib/cacheKeys';

interface ThemeStore {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'dark',
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
    }),
    {
      name: storageKey('theme-storage'),
    }
  )
);
