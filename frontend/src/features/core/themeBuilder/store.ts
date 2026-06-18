import { create } from 'zustand';

// Define the ThemeEditorState interface (assumed based on provided code)
interface Theme {
  id?: string;
  name: string;
  light: Record<string, string>;
  dark: Record<string, string>;
  isActive?: boolean;
  isDefault?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

interface ThemeEditorState {
  themes: Theme[];
  selectedTheme: Theme | null;
  selectedSystem: Theme | null;
  currentMode: 'light' | 'dark';
  editingTheme: {
    light: Record<string, string>;
    dark: Record<string, string>;
  };
  isNewTheme: boolean;
  themeName: string;
  setState: (newState: Partial<ThemeEditorState>) => void;
  loadThemes: (mockThemes: Theme[]) => void;
}

// Create the Zustand store
export const useThemeStore = create<ThemeEditorState>((set) => ({
  themes: [],
  selectedTheme: null,
  selectedSystem: null,
  currentMode: 'light',
  editingTheme: {
    light: {},
    dark: {},
  },
  isNewTheme: false,
  themeName: '',
  setState: (newState) => set((state) => ({ ...state, ...newState })),
  loadThemes: (mockThemes) =>
    set({
      themes: mockThemes,
      selectedTheme: mockThemes.find((t) => t.isActive) || mockThemes[0],
    }),
}));