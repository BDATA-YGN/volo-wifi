"use client";

import React, { useMemo } from "react";
import JoditEditor from "jodit-react";
import "jodit/es2018/jodit.min.css";

export interface AppSettingRichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  readOnly?: boolean;
}

/** Minimal toolbar: basic text formatting only (no tables, media, source). */
const MINIMAL_BUTTONS = [
  "bold",
  "italic",
  "underline",
  "|",
  "ul",
  "ol",
  "|",
  "paragraph",
  "|",
  "link",
  "|",
  "undo",
  "redo",
  "|",
  "eraser",
] as const;

/**
 * Small WYSIWYG for app settings stored as HTML (`controlType: RICHTEXT`).
 * Uses Jodit (same stack as `ContentEditor`) with a reduced toolbar.
 */
const AppSettingRichTextEditor: React.FC<AppSettingRichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "Write content…",
  minHeight = 280,
  readOnly = false,
}) => {
  const config = useMemo(
    () => ({
      readonly: readOnly,
      height: minHeight,
      placeholder,
      toolbar: true,
      spellcheck: true,
      toolbarButtonSize: "middle" as const,
      buttons: [...MINIMAL_BUTTONS],
      showCharsCounter: true,
      showWordsCounter: false,
      showXPathInStatusbar: false,
      askBeforePasteHTML: false,
      askBeforePasteFromWord: true,
      uploader: { insertImageAsBase64URI: false },
      link: {
        openInNewTabCheckbox: true,
      },
    }),
    [readOnly, minHeight, placeholder],
  );

  return (
    <div className="app-setting-rich-text-editor [&_.jodit-container]:!border-0 [&_.jodit-workplace]:!min-h-[200px]">
      <JoditEditor value={value} config={config} onChange={onChange} />
    </div>
  );
};

export default AppSettingRichTextEditor;
