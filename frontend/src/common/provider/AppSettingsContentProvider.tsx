'use client';

import { createContext, useContext, ReactNode } from 'react';

// Define the shape of appSettings (adjust based on your actual appSettings structure)
export interface AppSettings {
  app_name: string;
  app_short_code: string;
  app_version: string;
  app_icon: string;
  login_text: string;
  show_menu_logo: boolean;
  show_menu_text: boolean;
  login_icon: string;
  notifications_enabled: boolean;
  site_name?: string;
  site_description?: string;
  default_locale?: string;
  currency_code?: string;
  currency_symbol?: string;
  maintenance_mode?: boolean;
  maintenance_message?: string;
  sms_company_legal_name?: string;
  support_contacts?: string | Record<string, unknown>;
}

// Define the context type
interface AppSettingsContextType {
  appSettings: AppSettings | null;
}

// Create the context
const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

// Custom hook to use the context
export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (!context) {
    // Return a default value instead of throwing an error
    // This prevents crashes in error boundaries or other contexts where provider might not be available
    return { appSettings: null };
  }
  return context;
}

// Provider component
export function AppSettingsProvider({
  children,
  appSettings,
}: {
  children: ReactNode;
  appSettings: AppSettings | null;
}) {
  return (
    <AppSettingsContext.Provider value={{ appSettings }}>
      {children}
    </AppSettingsContext.Provider>
  );
}