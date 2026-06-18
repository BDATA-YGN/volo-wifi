"use client";

import { create } from 'zustand';
import { locales, Locale } from '../../i18n/config';
import { flatten, unflatten } from 'flat';

interface TranslationState {
  messages: Record<string, any>;
  allContentLanguages: any[];
  currentLocale: Locale;
  setMessages: (messages: Record<string, any>) => void;
  setAllContentLanguages: (languages: any[]) => void;
  filterMessages: (search: string) => Record<string, string>;
}

export const useTranslationStore = create<TranslationState>((set, get) => ({
  messages: {},
  allContentLanguages: [],
  currentLocale: 'en',
  setMessages: (messages: Record<string, any>) => {
    set({ messages });
  },
  setAllContentLanguages: (languages: any[]) => {
    set({ allContentLanguages: languages });
  },
  filterMessages: (search: string) => {
    const flattenedMessages = flatten(get().messages) as Record<string, string>;
    const filtered = Object.entries(flattenedMessages)
      .filter(([key, value]) => 
        key.toLowerCase().includes(search.toLowerCase()) || 
        value.toLowerCase().includes(search.toLowerCase())
      )
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {} as Record<string, string>);
    return filtered;
  },
}));