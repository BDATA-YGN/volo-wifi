"use client";

import React from "react";
import { Select, Button, Input, Space, Modal, Form, Switch, Typography, message } from "antd";
import { Theme } from "../types";
import { PlusCircle, Save, Trash2, Star, Power, Undo } from "lucide-react";

const { Text } = Typography;
const { confirm } = Modal;

interface ThemeSelectorProps {
  themes: Theme[];
  selectedTheme: Theme | null;
  isNewTheme: boolean;
  themeName: string;
  onSelectTheme: (themeId: string) => void;
  onCreateNew: () => void;
  onThemeNameChange: (name: string) => void;
  onSave: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
  onSetActive: () => void;
  onCancelCreate: () => void;
  loading: boolean;
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ themes, selectedTheme, isNewTheme, themeName, onSelectTheme, onCreateNew, onThemeNameChange, onSave, onDelete, onSetDefault, onSetActive, loading, onCancelCreate }) => {
  const showDeleteConfirm = () => {
    confirm({
      title: "Are you sure you want to delete this theme?",
      content: "This action cannot be undone.",
      okText: "Yes, delete it",
      okType: "danger",
      cancelText: "No",
      onOk() {
        onDelete();
        message.success("Theme deleted successfully");
      },
    });
  };

  return (
    <>
      <div className="flex gap-4 items-center justify-between">
        <div className="flex gap-4 items-center">
          <Button type="primary" icon={<PlusCircle size={16} />} onClick={onCreateNew}>
            New Theme
          </Button>
          {isNewTheme ? (
            <Input placeholder="Enter theme name" value={themeName} onChange={(e) => onThemeNameChange(e.target.value)} />
          ) : (
            <Select
              showSearch
              allowClear
              className="w-64"
              placeholder="Select a theme"
              value={selectedTheme?.id}
              onChange={onSelectTheme}
              filterOption={(input, option) => 
                (option?.searchText ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={themes.map((theme) => ({
                value: theme.id,
                label: (
                  <div className="flex items-center gap-2">
                    <span>{theme.name}</span>
                    {theme.isDefault && <Star size={14} className="text-yellow-500" />}
                    {theme.isActive && <Power size={14} className="text-green-500" />}
                  </div>
                ),
                searchText: theme.name.toLowerCase(),
              }))}
            />
          )}

          {!isNewTheme && selectedTheme && (
            <div className="flex gap-4 items-center">
              <Form.Item label="Set as Default" style={{ marginBottom: 0 }} tooltip="Default theme will be used for new users">
                <Switch checked={selectedTheme.isDefault} onChange={onSetDefault} />
              </Form.Item>

              <Form.Item label="Set as Active" style={{ marginBottom: 0 }} tooltip="Active theme will be applied to the current user interface">
                <Switch checked={selectedTheme.isActive} onChange={onSetActive} />
              </Form.Item>
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <Button type="primary" icon={<Save size={16} />} onClick={onSave} loading={loading}>
            Save
          </Button>

          {isNewTheme && (
            <>
              {/* <Button danger icon={<Trash2 size={16} />} onClick={showDeleteConfirm} /> */}
              <Button type="primary" icon={<Undo size={16} />} onClick={onCancelCreate} loading={loading}>
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default ThemeSelector;
