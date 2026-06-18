import { ThemeConfig } from 'antd';

export interface Theme {
  id?: string;
  name: string;
  lightTheme: ThemeConfig;
  darkTheme: ThemeConfig;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
}

export type ThemeMode = 'light' | 'dark';

export interface ThemeEditorState {
  themes: Theme[];
  selectedTheme: Theme | null;
  currentMode: ThemeMode;
  editingTheme: {
    light: any;
    dark: any;
  };
  isNewTheme: boolean;
  themeName: string;
}