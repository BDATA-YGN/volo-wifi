"use client";

import React, { useCallback, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { Card, Spin } from "antd";
import { useThemeStore } from "@/common/store/themeStore";
import { ChromeOutlined, SaveOutlined } from "@ant-design/icons";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <Spin spinning size="large" tip="Loading editor…">
      <div
        className="min-h-[min(70vh,720px)] w-full bg-[rgba(0,0,0,0.02)] dark:bg-[rgba(255,255,255,0.04)]"
        aria-hidden
      />
    </Spin>
  ),
});

interface JsonEditorProps {
  data: unknown;
  onChange: (data: unknown) => void;
  title: string;
  /** Identity of the document being edited (e.g. theme id + light/dark). */
  mountKey: string;
}

const JsonEditor: React.FC<JsonEditorProps> = ({
  data,
  onChange,
  title,
  mountKey,
}) => {
  const { theme } = useThemeStore();
  const lastDocRef = useRef("");
  const editorRef = useRef<any>(null);

  const monacoTheme = theme === "dark" ? "vs-dark" : "light";
  const valueStr = useMemo(() => JSON.stringify(data, null, 2), [data]);

  // When the external `data` changes (e.g. user picked another preset, or we
  // just saved), push it into the editor imperatively instead of remounting.
  // The editor is only remounted when `mountKey` changes (different theme/mode).
  useEffect(() => {
    lastDocRef.current = valueStr;
    const editor = editorRef.current;
    if (!editor) return;
    if (editor.getValue() === valueStr) return;
    const selection = editor.getSelection();
    editor.setValue(valueStr);
    if (selection) {
      try {
        editor.setSelection(selection);
      } catch {
        // selection may be out of bounds after setValue; safe to ignore
      }
    }
  }, [valueStr, mountKey]);

  const handleEditorMount = useCallback(
    (editor: any) => {
      editorRef.current = editor;
      lastDocRef.current = editor.getValue();
    },
    [],
  );

  const handleEditorChange = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      lastDocRef.current = value;
    }
  }, []);

  const handleSaveClick = useCallback(() => {
    try {
      onChange(JSON.parse(lastDocRef.current));
    } catch {
      // keep invalid JSON in editor; parent not updated
    }
  }, [onChange]);

  // Stable key per logical document. Including the Monaco theme guarantees a
  // remount when switching light/dark IDE theme, which is required by Monaco
  // for theme changes that affect the editor chrome itself.
  const editorKey = `${mountKey}:${monacoTheme}`;

  return (
    <Card
      className="h-full overflow-hidden flex flex-col"
      styles={{
        body: {
          padding: 0,
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        },
      }}
      title={
        <div className="flex items-center justify-between">
          <h5>{title}</h5>
          <div className="flex items-center gap-2">
            <a
              href="https://ant.design/theme-editor"
              target="_blank"
              rel="noreferrer"
            >
              <ChromeOutlined /> Ant Design Visual Editor
            </a>
            <button
              type="button"
              className="z-10 hover:bg-blue-700 text-white p-2 rounded border-0 bg-blue-600 cursor-pointer"
              onClick={handleSaveClick}
              aria-label="Apply JSON to theme"
            >
              <SaveOutlined />
            </button>
          </div>
        </div>
      }
    >
      <div className="relative flex-1 min-h-[min(70vh,720px)]">
        <MonacoEditor
          key={editorKey}
          height="100%"
          defaultLanguage="json"
          defaultValue={valueStr}
          onMount={handleEditorMount}
          onChange={handleEditorChange}
          options={{
            minimap: { enabled: true },
            formatOnPaste: true,
            formatOnType: true,
            automaticLayout: true,
            scrollBeyondLastLine: false,
            fontSize: 14,
            tabSize: 2,
            fixedOverflowWidgets: true,
          }}
          theme={monacoTheme}
        />
      </div>
    </Card>
  );
};

export default JsonEditor;
