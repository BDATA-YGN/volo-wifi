'use client';

import { useTransition } from 'react';
import { Select } from 'antd';
import { setUserLocale } from '../../../i18n/locale';

type Props = {
  defaultValue: string;
  items: Array<{ value: string; label: string }>;
  label: string;
};

export default function LocaleSwitcherSelect({
  defaultValue,
  items,
}: Props) {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      defaultValue={defaultValue}
      style={{ width: 120 }}
      options={items}
      onChange={(v: any) =>
        startTransition(() => {
          setUserLocale(v)
        })
      }
    />
  );
}
