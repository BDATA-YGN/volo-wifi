"use client";

import React, { useMemo, useState } from "react";
import { App, Button, Input, Modal, Segmented, Space, Tooltip, theme } from "antd";
import {
  CopyOutlined,
  DownloadOutlined,
  EyeOutlined,
  SearchOutlined,
} from "@ant-design/icons";

import { useEditorContext } from "../context/EditorContent";

const JsonPreview: React.FC = () => {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const { jsonData, availableLanguages } = useEditorContext();
  const [isVisible, setIsVisible] = useState(false);
  const [scope, setScope] = useState<string>("all");
  const [search, setSearch] = useState("");

  const previewData = useMemo(() => {
    if (scope === "all") return jsonData;
    return { [scope]: jsonData[scope] ?? {} } as Record<string, unknown>;
  }, [jsonData, scope]);

  const formattedJson = useMemo(
    () => JSON.stringify(previewData, null, 2),
    [previewData],
  );

  const displayed = useMemo(() => {
    if (!search) return formattedJson;
    const lines = formattedJson.split("\n");
    const matchingLines = new Set<number>();
    lines.forEach((line, idx) => {
      if (line.toLowerCase().includes(search.toLowerCase())) {
        matchingLines.add(idx);
      }
    });
    return lines
      .map((line, idx) =>
        matchingLines.has(idx) ? `► ${line}` : `  ${line}`,
      )
      .join("\n");
  }, [formattedJson, search]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(formattedJson);
    message.success("JSON copied to clipboard");
  };

  const downloadJson = () => {
    const dataUri =
      "data:application/json;charset=utf-8," +
      encodeURIComponent(formattedJson);
    const link = document.createElement("a");
    link.setAttribute("href", dataUri);
    link.setAttribute(
      "download",
      scope === "all" ? "language_all.json" : `language_${scope}.json`,
    );
    link.click();
  };

  const scopeOptions = useMemo(
    () => [
      { label: "All", value: "all" },
      ...availableLanguages.map((lang) => ({
        label: lang.toUpperCase(),
        value: lang,
      })),
    ],
    [availableLanguages],
  );

  return (
    <>
      <Button icon={<EyeOutlined />} onClick={() => setIsVisible(true)}>
        Preview
      </Button>

      <Modal
        title={
          <Space>
            <EyeOutlined style={{ color: token.colorPrimary }} />
            <span>JSON Preview</span>
          </Space>
        }
        open={isVisible}
        onCancel={() => setIsVisible(false)}
        width={880}
        footer={[
          <Button key="copy" icon={<CopyOutlined />} onClick={copyToClipboard}>
            Copy
          </Button>,
          <Button
            key="download"
            icon={<DownloadOutlined />}
            onClick={downloadJson}
          >
            Download
          </Button>,
          <Button
            key="close"
            type="primary"
            onClick={() => setIsVisible(false)}
          >
            Close
          </Button>,
        ]}
      >
        <Space orientation="vertical" size={12} style={{ width: "100%" }}>
          <Space size={12} wrap style={{ width: "100%" }}>
            <Segmented
              options={scopeOptions}
              value={scope}
              onChange={(val) => setScope(String(val))}
            />
            <Input
              allowClear
              placeholder="Find inside JSON..."
              prefix={
                <SearchOutlined style={{ color: token.colorTextTertiary }} />
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: 220 }}
            />
          </Space>
          <pre
            style={{
              padding: 16,
              borderRadius: 8,
              background: token.colorFillAlter,
              border: `1px solid ${token.colorBorderSecondary}`,
              overflow: "auto",
              maxHeight: "60vh",
              fontSize: 12,
              lineHeight: 1.5,
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              color: token.colorText,
            }}
          >
            <code>{displayed}</code>
          </pre>
          <Tooltip title="Use Copy/Download to export the visible scope">
            <span style={{ fontSize: 12, color: token.colorTextTertiary }}>
              Showing scope: <strong>{scope.toUpperCase()}</strong>
              {search ? ` · filtered by "${search}"` : ""}
            </span>
          </Tooltip>
        </Space>
      </Modal>
    </>
  );
};

export default JsonPreview;
