export interface LanguageFile {
    id: string;
    name: string;
    data: Record<string, any>;
  }
  
  export interface TranslationKey {
    id: string;
    key: string;
    path: string[];
    value: any;
    hasChildren: boolean;
  }
  
  export interface AppState {
    languages: LanguageFile[];
    currentLanguage: string;
    setCurrentLanguage: (languageId: string) => void;
    
    keys: TranslationKey[];
    filteredKeys: TranslationKey[];
    loadKeys: () => void;
    setFilteredKeys: (keys: TranslationKey[]) => void;
    searchKeys: (searchTerm: string) => void;
    
    selectedKey: TranslationKey | null;
    setSelectedKey: (key: TranslationKey | null) => void;
    
    isDrawerOpen: boolean;
    setDrawerOpen: (isOpen: boolean) => void;
    
    updateTranslation: (key: string, value: any) => void;
    createNode: (parentPath: string[], key: string, isObject?: boolean) => void;
    deleteNode: (path: string[]) => void;
    saveTranslations: () => void;
    
    currentPath: string[];
    setCurrentPath: (path: string[]) => void;
    navigateTo: (path: string[]) => void;
    
    unsavedChanges: boolean;
    changedKeys: Set<string>;
  }