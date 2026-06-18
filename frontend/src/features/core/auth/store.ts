import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { storageKey } from '@/lib/cacheKeys';
import { LoggedUser } from '@/features/core/auth/types';
import dayjs, { Dayjs } from 'dayjs';


interface AuthStore {
  authData: LoggedUser | null; // Keep it nullable
  setAuthData: (data: LoggedUser) => void;
  clearAuthData: () => void;
  age: Dayjs | null; // Use Dayjs type for age timestamp
  setAge: (date: Dayjs | Date | string | number) => void; // Flexible input
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      authData: null,
      age: null,
      setAge: (date: Dayjs | Date | string | number) => {
              const newAge = dayjs(date);
              set({ age: newAge });
            },
      setAuthData: (authData) => {
        const currentState = get();
        if (currentState.authData !== authData) {
          if ('token' in authData) {
            set({ authData });
          } else {
            set({ authData }); // Reset user in case of an error
          }
        }
      },
      clearAuthData: () => set({ authData: null, age: null }),
    }),
    {
      name: storageKey('auth-storage'),
    }
  )
);
