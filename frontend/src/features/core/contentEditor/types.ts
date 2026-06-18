export interface AppConfig {
  [key: string]: any;
}

export type KeyPath = Array<string | number>;

export interface Section {
  key: string;
  title: string;
  children?: Section[];
}

export interface LanguageStats {
  total: number;
  filled: number;
  missing: number;
}

export interface EditorContextType {
  jsonData: Record<string, AppConfig>;
  originalData: Record<string, AppConfig>;
  updateJsonValue: (path: KeyPath, value: any, lang?: string) => void;
  getValueByPath: (path: KeyPath, lang?: string) => any;
  activeSection: string[];
  setActiveSection: (section: string[]) => void;
  saveChanges: (data?: Record<string, AppConfig>) => Promise<void>;
  exportJson: () => void;
  importJson: (data: string) => void;
  addNewKey: (parentPath: KeyPath, key: string, value: any, isObject: boolean) => void;
  deleteKey: (path: KeyPath) => void;
  replaceLanguage: (lang: string, data: AppConfig) => void;
  availableLanguages: string[];
  loading: boolean;
  isDirty: boolean;
  resetChanges: () => void;
  languageStats: Record<string, LanguageStats>;
}