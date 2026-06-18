"use client";

import React from 'react';
import { Switch, Typography } from 'antd';
import { Sun, Moon } from 'lucide-react';
import { ThemeMode } from '../types';

const { Text } = Typography;

interface ThemeToggleProps {
  mode: string;
  onChange: (mode: string) => void;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ mode, onChange }) => {
  return (
    <div className="flex items-center gap-2">
      <Text strong>Theme Mode:</Text>
      
      <div className="flex items-center gap-2">
        <Sun size={16} className="text-yellow-500" />
        <Switch
          checked={mode === 'dark'}
          onChange={(checked) => onChange(checked ? 'dark' : 'light')}
        />
        <Moon size={16} className="text-blue-800" />
      </div>
      
      <Text className="text-gray-500 ml-2">
        {mode === 'light' ? 'Light Mode' : 'Dark Mode'}
      </Text>
    </div>
  );
};

export default ThemeToggle;