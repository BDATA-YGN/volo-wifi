"use client";

import React, { useMemo, useState } from 'react';
import TheIcon, { Name, iconOptions } from "./icons";
import { Input } from 'antd';
import { useTranslations } from 'next-intl';

interface IconPickerProps {
  onSelect: (value: Name) => void;
  selectedIcon?: Name | null;
  searchPlaceholder?: string;
  className?: string;
}

const IconPicker: React.FC<IconPickerProps> = ({
  onSelect,
  selectedIcon,
  searchPlaceholder,
  className = '',
}) => {
  const [searchText, setSearchText] = useState('');
  const t = useTranslations('menuGroupForm'); // Adjust namespace as needed

  // Filter icons based on search text
  const filteredIcons = useMemo(() => {
    return searchText
      ? iconOptions.filter((icon) =>
          icon.keywords.some((keyword) =>
            keyword.toLowerCase().includes(searchText.toLowerCase())
          )
        )
      : iconOptions;
  }, [searchText]);

  return (
    <div className={`icon-picker ${className}`}>
      <Input
        placeholder={searchPlaceholder || t('iconSearchPlaceholder')}
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        className="mb-2"
        allowClear
      />
      <div className="grid grid-cols-8 gap-2 max-h-64 overflow-y-auto">
        {filteredIcons.map((option) => (
          <div
            key={option.value}
            className={`p-2 text-lg cursor-pointer hover:border hover:border-blue-500 rounded flex items-center justify-center ${
              selectedIcon === option.value ? 'border border-blue-500' : ''
            }`}
            onClick={() => onSelect(option.value)}
          >
            <TheIcon name={option.value} />
          </div>
        ))}
      </div>
      {filteredIcons.length === 0 && (
        <div className="text-center py-4 text-gray-500">{t('noIcons')}</div>
      )}
    </div>
  );
};

export default IconPicker;