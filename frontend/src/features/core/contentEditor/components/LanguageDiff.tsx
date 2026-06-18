"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  App,
  Button,
  Modal,
  Segmented,
  Select,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
  theme,
} from "antd";
import {
  SaveOutlined,
  SwapOutlined,
  TranslationOutlined,
} from "@ant-design/icons";
import dynamic from "next/dynamic";
import { cloneDeep } from "lodash";

const DiffEditor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.DiffEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[320px] items-center justify-center">
        <Spin size="large" />
      </div>
    ),
  },
);

import { useEditorContext } from "../context/EditorContent";

const { Text } = Typography;

const LanguageDiff: React.FC = () => {
  const { token } = theme.useToken();
  const { modal, message } = App.useApp();
  const { jsonData, availableLanguages, saveChanges } = useEditorContext();

  const [open, setOpen] = useState(false);
  const [leftLang, setLeftLang] = useState<string>(availableLanguages[0] || "en");
  const [rightLang, setRightLang] = useState<string>(
    availableLanguages[1] || availableLanguages[0] || "en",
  );
  const [modified, setModified] = useState<string | undefined>(undefined);
  const [originalEdited, setOriginalEdited] = useState<string | undefined>(
    undefined,
  );
  const [layout, setLayout] = useState<"side-by-side" | "inline">(
    "side-by-side",
  );
  const [saving, setSaving] = useState(false);

  const leftValue = useMemo(
    () => JSON.stringify(jsonData[leftLang] || {}, null, 2),
    [jsonData, leftLang],
  );
  const rightValue = useMemo(
    () => JSON.stringify(jsonData[rightLang] || {}, null, 2),
    [jsonData, rightLang],
  );

  const swapSides = () => {
    setLeftLang(rightLang);
    setRightLang(leftLang);
  };

  useEffect(() => {
    if (!availableLanguages.includes(leftLang)) {
      setLeftLang(availableLanguages[0] || "en");
    }
    if (!availableLanguages.includes(rightLang)) {
      setRightLang(availableLanguages[1] || availableLanguages[0] || "en");
    }
  }, [availableLanguages, leftLang, rightLang]);

  useEffect(() => {
    if (open) {
      setModified(undefined);
      setOriginalEdited(undefined);
    }
  }, [rightLang, leftLang, jsonData, open]);

  const validateJson = (input: string | undefined) => {
    if (typeof input !== "string") return { ok: false, value: undefined };
    try {
      const parsed = JSON.parse(input);
      return { ok: true, value: parsed };
    } catch {
      return { ok: false, value: undefined };
    }
  };

  const leftStatus = validateJson(originalEdited ?? leftValue);
  const rightStatus = validateJson(modified ?? rightValue);

  const handleApplyAndSaveBoth = async () => {
    setSaving(true);
    try {
      const newData = cloneDeep(jsonData);
      let appliedAny = false;
      if (leftStatus.ok && typeof originalEdited === "string") {
        newData[leftLang] = leftStatus.value;
        appliedAny = true;
      }
      if (rightStatus.ok && typeof modified === "string") {
        newData[rightLang] = rightStatus.value;
        appliedAny = true;
      }
      if (!appliedAny) {
        modal.error({
          title: "No valid changes",
          content: "Provide valid JSON on at least one side before saving.",
        });
        return;
      }
      await saveChanges(newData);
      message.success("Changes saved successfully");
    } catch {
      modal.error({
        title: "Error",
        content: "Failed to save. Check JSON or try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button icon={<SwapOutlined />} onClick={() => setOpen(true)}>
        Compare Languages
      </Button>
      <Modal
        title={
          <Space>
            <TranslationOutlined style={{ color: token.colorPrimary }} />
            <span>Compare Languages</span>
          </Space>
        }
        open={open}
        onCancel={() => setOpen(false)}
        width="92vw"
        styles={{ body: { paddingTop: 12 } }}
        footer={
          <Space wrap>
            <Tooltip title="Apply edits from both sides (valid JSON only) and save to server">
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleApplyAndSaveBoth}
                loading={saving}
                disabled={!leftStatus.ok && !rightStatus.ok}
              >
                Apply & Save
              </Button>
            </Tooltip>
            <Button onClick={() => setOpen(false)}>Close</Button>
          </Space>
        }
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <Space size={6} wrap>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Left
            </Text>
            <Select
              value={leftLang}
              style={{ width: 140 }}
              options={availableLanguages.map((l) => ({
                value: l,
                label: l.toUpperCase(),
              }))}
              onChange={setLeftLang}
            />
            <Tag color={leftStatus.ok ? "green" : "red"}>
              {leftStatus.ok ? "Valid JSON" : "Invalid JSON"}
            </Tag>
          </Space>
          <Button icon={<SwapOutlined />} onClick={swapSides}>
            Swap
          </Button>
          <Space size={6} wrap>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Right
            </Text>
            <Select
              value={rightLang}
              style={{ width: 140 }}
              options={availableLanguages.map((l) => ({
                value: l,
                label: l.toUpperCase(),
              }))}
              onChange={setRightLang}
            />
            <Tag color={rightStatus.ok ? "green" : "red"}>
              {rightStatus.ok ? "Valid JSON" : "Invalid JSON"}
            </Tag>
          </Space>
          <div style={{ marginLeft: "auto" }}>
            <Segmented
              value={layout}
              onChange={(v) => setLayout(v as "side-by-side" | "inline")}
              options={[
                { label: "Side by side", value: "side-by-side" },
                { label: "Inline", value: "inline" },
              ]}
            />
          </div>
        </div>
        <div
          style={{
            height: "70vh",
            border: `1px solid ${token.colorBorderSecondary}`,
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          <DiffEditor
            height="100%"
            key={`${leftLang}-${rightLang}-${layout}`}
            language="json"
            original={leftValue}
            modified={modified ?? rightValue}
            options={{
              readOnly: false,
              renderSideBySide: layout === "side-by-side",
              automaticLayout: true,
              originalEditable: true,
              minimap: { enabled: false },
              fontSize: 12,
              scrollBeyondLastLine: false,
            }}
            theme="vs"
            onMount={(diffEditor: any) => {
              const mod = diffEditor.getModifiedEditor();
              const orig = diffEditor.getOriginalEditor();
              mod.updateOptions({ readOnly: false });
              orig.updateOptions({ readOnly: false });
              setModified(mod.getValue());
              setOriginalEdited(orig.getValue());
              mod.onDidChangeModelContent(() => {
                setModified(mod.getValue());
              });
              orig.onDidChangeModelContent(() => {
                setOriginalEdited(orig.getValue());
              });
            }}
          />
        </div>
      </Modal>
    </>
  );
};

export default LanguageDiff;
