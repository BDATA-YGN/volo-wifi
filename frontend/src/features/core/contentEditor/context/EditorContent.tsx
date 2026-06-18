"use client";

import React, { createContext, useState, useContext, useCallback, useEffect, useMemo, useRef } from 'react';
import { AppConfig, EditorContextType, KeyPath, LanguageStats } from '../types';
import * as UseCase from "@/features/core/translations/useTranslation";
import { useRequest } from 'ahooks';
import { get, set, cloneDeep, isEqual } from 'lodash';

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export const useEditorContext = () => {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditorContext must be used within an EditorProvider');
  }
  return context;
};

export const EditorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getLocalLanguages, createOrUpdateTranslationByLocale } = UseCase.useAppTranslations();

  // Initialize languageData and originalData with empty objects for each language
  const initialLanguageData = { en: {}, my: {} };
  const [languageData, setLanguageData] = useState<Record<string, AppConfig>>(initialLanguageData);
  const languageDataRef = useRef(languageData);
  useEffect(() => {
    languageDataRef.current = languageData;
  }, [languageData]);
  const [originalData, setOriginalData] = useState<Record<string, AppConfig>>(initialLanguageData);
  const [activeSection, setActiveSection] = useState<string[]>(['application']);
  // removed isDirty per request
  const [availableLanguages, setAvailableLanguages] = useState<string[]>(['en']);

  const getValueByPath = useCallback((path: KeyPath, lang?: string) => {
    return get(languageData[lang || 'en'], path);
  }, [languageData]);

  const { loading, run: fetchMenuGroups } = useRequest(async () => {
    return getLocalLanguages();
  }, {
    manual: true,
    onSuccess: (data) => {
      if (data) {
        const pgResult = data.data;
        const result = pgResult.reduce((acc: Record<string, AppConfig>, { locale, messages }: any) => {
          const parsed = typeof messages === 'string' ? safelyParseJson(messages) : messages;
          acc[locale] = parsed || {};
          return acc;
        }, {});

        setLanguageData(result);
        setOriginalData(cloneDeep(result)); // Ensure deep copy to avoid reference issues
        setAvailableLanguages(Object.keys(result));
      }
    },
    onError: () => {
      console.log('Failed to fetch menu data');
    }
  });

  useEffect(() => {
    fetchMenuGroups();
  }, []);

  const safelyParseJson = (input: string) => {
    try {
      return JSON.parse(input);
    } catch (e) {
      console.error('Failed to parse messages JSON for locale:', e);
      return undefined;
    }
  };

  const updateJsonValue = useCallback((path: KeyPath, value: any, lang?: string) => {
    setLanguageData(prevData => {
      const newData = cloneDeep(prevData);
      const targetLang = lang || 'en';
      set(newData[targetLang], path, value);
      return newData;
    });
  }, []);

  const addNewKey = useCallback((parentPath: KeyPath, key: string, value: any, isObject: boolean = false) => {
    setLanguageData(prevData => {
      const newData = cloneDeep(prevData);
      
      availableLanguages.forEach(lang => {
        if (parentPath.length) {
          const existingParent = get(newData[lang], parentPath);
          if (existingParent === undefined || typeof existingParent !== 'object' || existingParent === null) {
            set(newData[lang], parentPath, {});
          }
          const newValue = isObject ? {} : (lang === 'en' ? value : '');
          set(newData[lang], [...parentPath, key], newValue);
        } else {
          const newValue = isObject ? {} : (lang === 'en' ? value : '');
          newData[lang][key] = newValue;
        }
      });
      
      return newData;
    });
  }, [availableLanguages]);

  const deleteKey = useCallback((path: KeyPath) => {
    setLanguageData(prevData => {
      const newData = cloneDeep(prevData);
      
      availableLanguages.forEach(lang => {
        if (path.length === 1) {
          delete newData[lang][path[0]];
        } else {
          const parentPath = path.slice(0, -1);
          const key = path[path.length - 1];
          const parentObj = get(newData[lang], parentPath);
          
          if (typeof parentObj === 'object' && parentObj !== null) {
            delete parentObj[key];
          }
        }
      });
      
      return newData;
    });
  }, [availableLanguages]);

  const saveChanges = useCallback(async (dataToSave?: Record<string, AppConfig>) => {
    const finalData = dataToSave || languageDataRef.current;
    try {
      await Promise.all(
        Object.keys(finalData).map(async (lang) => {
          const payload = cloneDeep(finalData[lang]); // Deep copy to avoid mutations
          await createOrUpdateTranslationByLocale(lang, { messages: payload });
          console.log(`Saved language_${lang}.json:`, payload);
        })
      );
      setLanguageData(finalData);
      setOriginalData(cloneDeep(finalData)); // Update originalData with deep copy
      // Re-fetch to ensure state matches backend serialization
      fetchMenuGroups();
    } catch (err) {
      console.error('Failed to save changes:', err);
      throw err;
    }
  }, [createOrUpdateTranslationByLocale, fetchMenuGroups]);

  const exportJson = useCallback(() => {
    const dataStr = JSON.stringify(languageData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `language_all.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }, [languageData]);

  const importJson = useCallback((data: string) => {
    try {
      const parsedData = JSON.parse(data);
      setLanguageData(prevData => {
        const newData = cloneDeep(prevData);
        Object.assign(newData, parsedData);
        return newData;
      });
      
    } catch (error) {
      console.error('Invalid JSON format:', error);
    }
  }, []);

  const replaceLanguage = useCallback((lang: string, data: AppConfig) => {
    setLanguageData(prev => ({
      ...prev,
      [lang]: data || {}
    }));
  }, []);

  const resetChanges = useCallback(() => {
    setLanguageData(cloneDeep(originalData));
  }, [originalData]);

  const isDirty = useMemo(
    () => !isEqual(languageData, originalData),
    [languageData, originalData],
  );

  const languageStats = useMemo<Record<string, LanguageStats>>(() => {
    const collectLeafPaths = (obj: AppConfig, prefix: string[] = [], out: string[][] = []): string[][] => {
      if (obj === null || typeof obj !== 'object') return out;
      Object.entries(obj).forEach(([k, v]) => {
        if (v !== null && typeof v === 'object') {
          collectLeafPaths(v, [...prefix, k], out);
        } else {
          out.push([...prefix, k]);
        }
      });
      return out;
    };

    const allPaths = new Set<string>();
    availableLanguages.forEach((lang) => {
      collectLeafPaths(languageData[lang] ?? {}).forEach((p) => allPaths.add(p.join('.')));
    });

    const result: Record<string, LanguageStats> = {};
    availableLanguages.forEach((lang) => {
      let filled = 0;
      allPaths.forEach((p) => {
        const value = get(languageData[lang] ?? {}, p.split('.'));
        if (value !== undefined && value !== null && value !== '') filled += 1;
      });
      result[lang] = {
        total: allPaths.size,
        filled,
        missing: Math.max(0, allPaths.size - filled),
      };
    });
    return result;
  }, [languageData, availableLanguages]);

  const value = useMemo(() => ({
    jsonData: languageData,
    originalData,
    updateJsonValue,
    getValueByPath,
    activeSection,
    setActiveSection,
    saveChanges,
    exportJson,
    importJson,
    replaceLanguage,
    addNewKey,
    deleteKey,
    availableLanguages,
    loading,
    isDirty,
    resetChanges,
    languageStats,
  }), [languageData, originalData, updateJsonValue, getValueByPath, activeSection, saveChanges, exportJson, importJson, replaceLanguage, addNewKey, deleteKey, availableLanguages, loading, isDirty, resetChanges, languageStats]);

  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  );
};