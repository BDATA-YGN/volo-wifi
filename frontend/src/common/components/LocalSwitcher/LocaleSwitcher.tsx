"use client";

import { useLocale, useTranslations } from 'next-intl';
import LocaleSwitcherSelect from './LocaleSwitcherSelect';
import { useRequest } from 'ahooks';
import { useAppTranslations } from "@/features/core/translations/useTranslation";

const LOCAL_MAPPING: Record<string, string> = {
  en: 'English',
  my: 'Myanmar',
  ta: 'Tamil',
  hi: 'Hindi',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  fr: 'French'
};

export default function LocaleSwitcher() {
  const t = useTranslations('LocaleSwitcher');
  const locale = useLocale();
  const { getLocalLanguages } = useAppTranslations();

  const { data, loading, error } = useRequest(getLocalLanguages);

  if (loading) return null;
  if (error) return <div>Failed to load languages</div>;

  const items =
    data?.data?.map((item: any) => ({
      value: item.locale,
      label: LOCAL_MAPPING[item.locale] || item.locale
    })) || [];

  return (
    <LocaleSwitcherSelect
      defaultValue={locale}
      items={items}
      label={t('label')}
    />
  );
}
