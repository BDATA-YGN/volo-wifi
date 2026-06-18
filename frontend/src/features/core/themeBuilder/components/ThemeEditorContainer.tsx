"use client";

import React, { useState, useEffect } from "react";
import { Space, App, ConfigProvider, Card } from "antd";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Theme, ThemeMode, ThemeEditorState } from "../types";
import JsonEditor from "./JsonEditor";
import ThemePreview from "./ThemePreview";
import ThemeSelector from "./ThemeSelector";
import { useRequest } from "ahooks";
import { useTheme } from "../useThemes";
import { useThemeStore } from "@/common/store/themeStore";
import { getApiErrorMessage } from "@/common/exceptions/handleApiError";

interface PageProps {
  onHeaderExtraChange?: (buttons: React.ReactNode) => void;
}

const ThemeEditorContainer: React.FC<PageProps> = ({ onHeaderExtraChange }) => {
  const { message } = App.useApp();

  const { fetchThemes, updateTheme, createTheme, deleteTheme } = useTheme();
  const { theme, toggleTheme } = useThemeStore();

  const [state, setState] = useState<ThemeEditorState>({
    themes: [],
    selectedTheme: null,
    currentMode: theme,
    editingTheme: {
      light: {},
      dark: {},
    },
    isNewTheme: false,
    themeName: "",
  });

  const { loading, run: fetchAllThemes } = useRequest(
    async () => {
      return fetchThemes();
    },
    {
      manual: true,
      onSuccess: (data: any) => {
        setState((prev) => ({
          ...prev,
          themes: data.data,
          selectedTheme: data.data.find((t: any) => t.isActive) || data.data[0],
        }));
      },
      onError: (error: any) => {
        message.error(getApiErrorMessage(error, "Request failed"));
      },
    }
  );

  const { loading: loadingUpdatingTheme, run: updateThemeX } = useRequest(
    async () => {
      const updatedThemes = {
        name: state.themeName,
        lightTheme: state.editingTheme.light,
        darkTheme: state.editingTheme.dark,
        isDefault: state.selectedTheme?.isDefault,
        isActive: state.selectedTheme?.isActive,
        updatedAt: new Date().toISOString(),
      };
      
      return updateTheme(state.selectedTheme?.id as string, updatedThemes);
    },
    {
      manual: true,
      onSuccess: (data: any) => {
        fetchAllThemes();
        message.success("Theme updated successfully");
      },
      onError: (error: any) => {
        message.error(getApiErrorMessage(error, "Request failed"));
      },
    }
  );

  const { loading: loadingCreatingTheme, run: createThemeX } = useRequest(
    async () => {
      const newTheme: Theme = {
        name: state.themeName,
        lightTheme: state.editingTheme.light,
        darkTheme: state.editingTheme.dark,
        isDefault: false,
        isActive: false,
        createdAt: new Date().toISOString(),
        updatedAt: null,
        deletedAt: null,
      };

      return createTheme(newTheme);
    },
    {
      manual: true,
      onSuccess: (data: any) => {
        fetchAllThemes();
        message.success("Theme created successfully");
        setState((prev) => ({
          ...prev,
          isNewTheme: false,
        }));
      },
      onError: (error: any) => {
        message.error(getApiErrorMessage(error, "Request failed"));
      },
    }
  );

  useEffect(() => {
    fetchAllThemes();
  }, []);

  // Update editing theme when selected theme changes
  useEffect(() => {
    if (state.selectedTheme) {
      setState((prev) => ({
        ...prev,
        editingTheme: {
          light: prev.selectedTheme?.lightTheme || {},
          dark: prev.selectedTheme?.darkTheme || {},
        },
        themeName: prev.selectedTheme?.name || "",
      }));
    }
  }, [state.selectedTheme]);

  const handleThemeSelect = (themeId: string) => {
    const selected = state.themes.find((theme) => theme.id === themeId);
    if (selected) {
      setState((prev) => ({
        ...prev,
        selectedTheme: selected,
        isNewTheme: false,
      }));
    }
  };

  const handleCreateNew = () => {
    setState((prev) => ({
      ...prev,
      isNewTheme: true,
      selectedTheme: null,
      themeName: "New Theme",
      editingTheme: {
        light: {
          token: {
            colorPrimary: "#1677ff",
            colorInfo: "#1677ff",
            colorSuccess: "#52c41a",
            colorWarning: "#faad14",
            colorError: "#ff4d4f",
            colorLink: "#1677ff",
            fontSize: 14,
            sizeStep: 4,
            sizeUnit: 4,
            borderRadius: 6,
          },
          components: {},
        },
        dark: {
          token: {
            colorPrimary: "#1668dc",
            colorInfo: "#1668dc",
            colorSuccess: "#49aa19",
            colorWarning: "#d89614",
            colorError: "#d32029",
            colorLink: "#1668dc",
            fontSize: 14,
            sizeStep: 4,
            sizeUnit: 4,
            borderRadius: 6,
          },
          components: {},
        },
      },
    }));
  };

  const handleThemeNameChange = (name: string) => {
    setState((prev) => ({
      ...prev,
      themeName: name,
    }));
  };

  const handleJsonChange = (mode: ThemeMode, data: any) => {
    setState((prev) => ({
      ...prev,
      editingTheme: {
        ...prev.editingTheme,
        [mode]: data,
      },
    }));
  };

  const handleModeChange = (mode: ThemeMode) => {
    setState((prev) => ({
      ...prev,
      currentMode: mode,
    }));
    toggleTheme();
  };

  const handleSave = () => {
    if (state.isNewTheme) {
      createThemeX();
    } else if (state.selectedTheme) {
      updateThemeX();
    }
  };

  const forceReloadDialog = () => {
    const confirmed = window.confirm("Reload page to see the changes?");
    if (confirmed) {
      window.location.reload();
    }
  }

  const handleDelete = () => {
    if (!state.selectedTheme) return;

    const filteredThemes = state.themes.filter((theme) => theme.id !== state.selectedTheme?.id);

    setState((prev) => ({
      ...prev,
      themes: filteredThemes,
      selectedTheme: filteredThemes[0] || null,
    }));
  };

  const handleSetDefault = () => {
    if (!state.selectedTheme) return;

    const updatedThemes = state.themes.map((theme) => ({
      ...theme,
      isDefault: theme.id === state.selectedTheme?.id,
    }));

    setState((prev) => ({
      ...prev,
      themes: updatedThemes,
      selectedTheme: updatedThemes.find((t) => t.id === state.selectedTheme?.id) || null,
    }));
  };

  const handleSetActive = () => {
    if (!state.selectedTheme) return;

    const updatedThemes = state.themes.map((theme) => ({
      ...theme,
      isActive: theme.id === state.selectedTheme?.id,
    }));

    setState((prev) => ({
      ...prev,
      themes: updatedThemes,
      selectedTheme: updatedThemes.find((t) => t.id === state.selectedTheme?.id) || null,
    }));
  };

  const currentThemeForPreview = theme === "light" ? state.editingTheme.light : state.editingTheme.dark;

  const isLoading = loading || loadingCreatingTheme || loadingUpdatingTheme;

  useEffect(() => {
    if (onHeaderExtraChange) {
      onHeaderExtraChange(
        <ThemeSelector
          themes={state.themes}
          selectedTheme={state.selectedTheme}
          isNewTheme={state.isNewTheme}
          themeName={state.themeName}
          onSelectTheme={handleThemeSelect}
          onCreateNew={handleCreateNew}
          onThemeNameChange={handleThemeNameChange}
          onSave={handleSave}
          onDelete={handleDelete}
          onSetDefault={handleSetDefault}
          onSetActive={handleSetActive}
          loading={isLoading}
          onCancelCreate={() => {
            setState((prev) => ({ ...prev, isNewTheme: false }));
            fetchAllThemes();
          }}
        />
      );
    }
  }, [state.themes, state.selectedTheme, state.isNewTheme, state.themeName, onHeaderExtraChange]);

  return (
    <div style={{ overflowY: "auto", height: "var(--content-body-height)", border: "none" }}>
        <PanelGroup direction="horizontal">
          <Panel defaultSize={50} minSize={30}>
            <JsonEditor
              mountKey={`${state.selectedTheme?.id ?? "new"}-${theme}`}
              data={theme === "light" ? state.editingTheme.light : state.editingTheme.dark}
              onChange={(data) => handleJsonChange(theme, data)}
              title={`${theme === "light" ? "Light" : "Dark"} Theme JSON`}
            />
          </Panel>
          <PanelResizeHandle className="w-1 transition-colors" />
          <Panel defaultSize={50} minSize={30}>
            <ThemePreview theme={currentThemeForPreview} title={`${theme === "light" ? "Light" : "Dark"} Theme`} state={state} onModeChange={handleModeChange} systemThemeMode={theme}/>
          </Panel>
        </PanelGroup>
    </div>
  );
};

export default ThemeEditorContainer;
