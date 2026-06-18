"use client";

import React, { useEffect, useState } from "react";
import {
  Input,
  InputNumber,
  Switch,
  Button,
  Tag,
  App,
  Select,
  theme,
  Spin,
  Empty,
  Divider,
  Typography,
  Modal,
  Tooltip,
} from "antd";
import {
  SaveOutlined,
  CodeOutlined,
  CheckOutlined,
  FolderOpenOutlined,
  UndoOutlined,
  EyeOutlined,
} from "@ant-design/icons";

import { useAppSetting } from "../useAppSetting";
import type {
  AppSettingAttributes,
  AppSettingCategory,
  AppSettingControlType,
} from "../interface";
import FilePicker from "@/common/components/FileManager/FilePicker";
import type { FileLog } from "@/types";
import DOMPurify from "dompurify";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import AppSettingRichTextEditor from "./AppSettingRichTextEditor";

const { Text } = Typography;

// ── static maps ─────────────────────────────────────────────────────────────

const TYPE_COLOR: Record<string, string> = {
  STRING: "blue",
  NUMBER: "green",
  BOOLEAN: "orange",
  JSON: "purple",
  LIST: "purple",
  IMAGE: "blue",
  IMAGE_LIST: "blue",
  SELECT: "cyan",
  MARKDOWN: "blue",
  TEXTAREA: "blue",
  TEXT: "blue",
  RICHTEXT: "blue",
};

// ── tiny helpers ────────────────────────────────────────────────────────────

const parseList = (raw: string): string[] => {
  try {
    const p = JSON.parse(raw);
    if (Array.isArray(p)) return p.map(String);
  } catch {}
  return raw ? [raw] : [];
};

const parseOptions = (raw?: string | null): { label: string; value: string }[] => {
  try {
    return JSON.parse(raw ?? "[]");
  } catch {
    return [];
  }
};

const jsonSummary = (raw: string): string => {
  try {
    const p = JSON.parse(raw);
    if (Array.isArray(p)) return `Array  ·  ${p.length} items`;
    if (typeof p === "object" && p !== null) return `Object  ·  ${Object.keys(p).length} keys`;
  } catch {}
  return raw.slice(0, 50);
};

const parsedJson = (raw: string) => {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};

const smartParseScalar = (raw: string): unknown => {
  const t = raw.trim();
  if (!t) return "";
  try {
    return JSON.parse(t);
  } catch {
    return raw;
  }
};

// ── SettingRow ─────────────────────────────────────────────────────────────

interface RowProps {
  record: AppSettingAttributes;
  /** Full save + list refresh — used for TEXT, NUMBER, JSON, etc. */
  onSave: (id: string, value: string) => Promise<void>;
  /** Patch value locally without refresh — used for BOOLEAN auto-save. */
  onToggle: (id: string, value: string) => Promise<void>;
  saving: boolean;
}

const SettingRow: React.FC<RowProps> = ({ record, onSave, onToggle, saving }) => {
  const { token } = theme.useToken();
  const [value, setValue] = useState(record.value);
  const [dirty, setDirty] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [listDraft, setListDraft] = useState("");

  useEffect(() => {
    setValue(record.value);
    setDirty(false);
    setListDraft("");
  }, [record.value]);

  const change = (v: string) => {
    setValue(v);
    setDirty(v !== record.value);
    setJustSaved(false);
  };

  const save = async () => {
    await onSave(record.id, value);
    setDirty(false);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);
  };

  const resetToDefault = () => {
    if (record.defaultValue != null) change(record.defaultValue);
  };

  const SaveBtn = ({ className = "" }: { className?: string }) => (
    <Button
      type="primary"
      size="small"
      icon={justSaved ? <CheckOutlined /> : <SaveOutlined />}
      disabled={!dirty}
      loading={saving}
      onClick={save}
      className={className}
    >
      {justSaved ? "Saved" : "Save"}
    </Button>
  );

  const ResetBtn = () =>
    record.defaultValue != null && dirty ? (
      <Tooltip title={`Reset to: ${record.defaultValue.slice(0, 60)}`}>
        <Button size="small" type="text" icon={<UndoOutlined />} onClick={resetToDefault}>
          Reset
        </Button>
      </Tooltip>
    ) : null;

  const SavedHint = () => {
    const ct = record.controlType;
    if (ct === "BOOLEAN") return null;
    let hint = record.value;
    if (ct === "JSON" || ct === "LIST" || ct === "IMAGE_LIST") hint = jsonSummary(record.value);
    else if (record.value.length > 80) hint = `${record.value.length} characters`;
    return (
      <div className="mt-1 text-xs" style={{ color: token.colorTextSecondary }}>
        Saved:{" "}
        <span className="font-mono" style={{ color: token.colorTextTertiary }}>
          {hint || "(empty)"}
        </span>
        {record.defaultValue && record.defaultValue !== record.value && (
          <span className="ml-2" style={{ color: token.colorWarning }}>
            · Default:{" "}
            <span className="font-mono">
              {record.defaultValue.length > 40
                ? record.defaultValue.slice(0, 40) + "…"
                : record.defaultValue}
            </span>
          </span>
        )}
      </div>
    );
  };

  // ═════════════════════════════════════════════════════════════════════════
  //  Control renderers
  // ═════════════════════════════════════════════════════════════════════════

  const ctrl = (): React.ReactNode => {
    const ct: AppSettingControlType = (record.controlType ?? "TEXT") as AppSettingControlType;

    // ── BOOLEAN ──
    if (ct === "BOOLEAN") {
      const handleToggle = async (checked: boolean) => {
        const prev = value;
        const next = checked ? "true" : "false";
        setValue(next); // optimistic
        try {
          await onToggle(record.id, next);
          setJustSaved(true);
          setTimeout(() => setJustSaved(false), 2000);
        } catch {
          setValue(prev); // revert on error
        }
      };
      return (
        <div className="flex items-center gap-3">
          <Switch
            checked={value === "true"}
            onChange={handleToggle}
            loading={saving}
            checkedChildren="Enabled"
            unCheckedChildren="Disabled"
            style={{ minWidth: 90 }}
          />
          {justSaved && (
            <Text type="success" className="text-xs">
              <CheckOutlined /> Saved
            </Text>
          )}
        </div>
      );
    }

    // ── NUMBER ──
    if (ct === "NUMBER") {
      return (
        <div className="flex items-center gap-2 flex-wrap">
          <InputNumber
            value={Number(value)}
            min={0}
            onChange={(v) => change(String(v ?? 0))}
            style={{ width: 160 }}
          />
          <SaveBtn />
          <ResetBtn />
        </div>
      );
    }

    // ── SELECT ──
    if (ct === "SELECT") {
      const opts = parseOptions(record.options);
      return (
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={value} options={opts} onChange={(v) => change(v)} style={{ minWidth: 200 }} />
          <SaveBtn />
          <ResetBtn />
        </div>
      );
    }

    // ── LIST (string array tag input) ──
    if (ct === "LIST") {
      const items = parseList(value);
      return (
        <div className="space-y-2">
          <div className="space-y-1.5" style={{ maxWidth: 520 }}>
            {items.length === 0 ? (
              <div className="text-xs text-gray-400 border border-dashed border-gray-200 rounded-md px-3 py-2">
                No items yet.
              </div>
            ) : (
              <div
                className="rounded-md divide-y overflow-auto"
                style={{
                  maxHeight: 240,
                  background: token.colorBgContainer,
                  border: `1px solid ${token.colorBorderSecondary}`,
                }}
              >
                {items.map((it, idx) => (
                  <div key={`${it}-${idx}`} className="flex items-center justify-between px-3 py-2 gap-3">
                    <div className="text-sm break-all" style={{ color: token.colorText }}>
                      {it}
                    </div>
                    <Button
                      size="small"
                      danger
                      onClick={() => {
                        Modal.confirm({
                          title: "Remove item?",
                          content: (
                            <div className="text-xs break-all" style={{ color: token.colorTextSecondary }}>
                              {it}
                            </div>
                          ),
                          okText: "Remove",
                          okButtonProps: { danger: true },
                          cancelText: "Cancel",
                          onOk: () => {
                            const next = items.filter((_, i) => i !== idx);
                            change(JSON.stringify(next));
                          },
                        });
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap" style={{ maxWidth: 520 }}>
            <Input
              value={listDraft}
              onChange={(e) => setListDraft(e.target.value)}
              placeholder="Add new item…"
              onPressEnter={() => {
                const t = listDraft.trim();
                if (!t) return;
                const next = [...items, t];
                change(JSON.stringify(next));
                setListDraft("");
              }}
            />
            <Button
              onClick={() => {
                const t = listDraft.trim();
                if (!t) return;
                const next = [...items, t];
                change(JSON.stringify(next));
                setListDraft("");
              }}
            >
              Add
            </Button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <SaveBtn />
            <Text type="secondary" className="text-xs">
              {items.length} items
            </Text>
            <ResetBtn />
          </div>
        </div>
      );
    }

    // ── IMAGE (single) ──
    if (ct === "IMAGE") {
      return (
        <div className="space-y-2">
          {value && (
            <img
              src={value}
              alt={record.key}
              className="h-16 w-16 rounded-md object-cover border border-gray-200 bg-gray-50"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          <div className="flex gap-2 items-center flex-wrap">
            <Input
              value={value}
              onChange={(e) => change(e.target.value)}
              placeholder="Enter URL or browse…"
              style={{ maxWidth: 280 }}
            />
            <Button size="small" icon={<FolderOpenOutlined />} onClick={() => setPickerOpen(true)}>
              Browse
            </Button>
            <SaveBtn />
            <ResetBtn />
          </div>
          <FilePicker
            isOpen={pickerOpen}
            onClose={() => setPickerOpen(false)}
            onSelect={(files: FileLog[]) => {
              if (files[0]) change(files[0].url);
              setPickerOpen(false);
            }}
            multiple={false}
            fileTypes={["image"]}
            title={`Select image — ${record.labelEn || record.key}`}
          />
        </div>
      );
    }

    // ── IMAGE_LIST (array of image URLs) ──
    if (ct === "IMAGE_LIST") {
      const urls: string[] = parseList(value);
      return (
        <div className="space-y-2">
          {urls.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {urls.map((url, i) => (
                <div key={i} className="relative group">
                  <img
                    src={url}
                    alt={`banner-${i}`}
                    className="h-16 w-24 rounded-md object-cover border border-gray-200 bg-gray-50"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <button
                    onClick={() => change(JSON.stringify(urls.filter((_, idx) => idx !== i)))}
                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-4 h-4 text-xs
                               flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 items-center flex-wrap">
            <Button size="small" icon={<FolderOpenOutlined />} onClick={() => setPickerOpen(true)}>
              {urls.length > 0 ? "Add / Replace Images" : "Browse Images"}
            </Button>
            <SaveBtn />
            <ResetBtn />
          </div>
          <FilePicker
            isOpen={pickerOpen}
            onClose={() => setPickerOpen(false)}
            onSelect={(files: FileLog[]) => {
              change(JSON.stringify(files.map((f) => f.url)));
              setPickerOpen(false);
            }}
            multiple={true}
            fileTypes={["image"]}
            title={`Select images — ${record.labelEn || record.key}`}
            selectedFiles={urls}
          />
        </div>
      );
    }

    // ── JSON — table / key-value / textarea (auto-detected) ──
    if (ct === "JSON") {
      const parsed = parsedJson(value);

      const isObjectArray =
        Array.isArray(parsed) &&
        parsed.length > 0 &&
        parsed.every((x) => typeof x === "object" && x !== null && !Array.isArray(x));

      const objArrayCols: string[] = isObjectArray
        ? Array.from(new Set((parsed as Record<string, unknown>[]).flatMap(Object.keys)))
        : [];

      const isPlainObject =
        !Array.isArray(parsed) && parsed !== null && typeof parsed === "object";

      // ── TABLE mode (array of objects) ──
      if (isObjectArray) {
        const items = parsed as Record<string, unknown>[];

        const updateCell = (rowIdx: number, col: string, rawVal: string) => {
          const next = items.map((row, i) =>
            i === rowIdx ? { ...row, [col]: smartParseScalar(rawVal) } : row,
          );
          change(JSON.stringify(next, null, 2));
        };

        const addRow = () => {
          const empty: Record<string, unknown> = {};
          for (const c of objArrayCols) empty[c] = "";
          change(JSON.stringify([...items, empty], null, 2));
        };

        const removeRow = (rowIdx: number) => {
          Modal.confirm({
            title: `Remove row ${rowIdx + 1}?`,
            okText: "Remove",
            okButtonProps: { danger: true },
            cancelText: "Cancel",
            onOk: () => {
              change(JSON.stringify(items.filter((_, i) => i !== rowIdx), null, 2));
            },
          });
        };

        return (
          <div className="space-y-2" style={{ maxWidth: 760 }}>
            <div className="inline-flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-md px-3 py-1.5 text-xs font-mono text-purple-700">
              <CodeOutlined className="shrink-0 text-purple-400" />
              <span>
                {items.length} {items.length === 1 ? "row" : "rows"}  ·  {objArrayCols.length} columns
              </span>
            </div>

            <div
              className="rounded-md overflow-auto"
              style={{
                maxHeight: 300,
                background: token.colorBgContainer,
                border: `1px solid ${token.colorBorderSecondary}`,
              }}
            >
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr style={{ background: token.colorFillAlter }}>
                    <th
                      className="px-3 py-1.5 text-left text-xs font-semibold w-10"
                      style={{
                        color: token.colorTextSecondary,
                        borderBottom: `1px solid ${token.colorBorderSecondary}`,
                      }}
                    >
                      #
                    </th>
                    {objArrayCols.map((col) => (
                      <th
                        key={col}
                        className="px-3 py-1.5 text-left text-xs font-semibold"
                        style={{
                          color: token.colorTextSecondary,
                          borderBottom: `1px solid ${token.colorBorderSecondary}`,
                        }}
                      >
                        {col}
                      </th>
                    ))}
                    <th
                      className="px-3 py-1.5 w-16"
                      style={{ borderBottom: `1px solid ${token.colorBorderSecondary}` }}
                    />
                  </tr>
                </thead>
                <tbody>
                  {items.map((row, rowIdx) => (
                    <tr
                      key={rowIdx}
                      className="border-b last:border-b-0"
                      style={{ borderColor: token.colorBorderSecondary }}
                      onMouseEnter={(e) => {
                        (e.currentTarget.style.background = token.colorFillQuaternary);
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget.style.background = "");
                      }}
                    >
                      <td className="px-3 py-1.5 text-xs" style={{ color: token.colorTextTertiary }}>
                        {rowIdx + 1}
                      </td>
                      {objArrayCols.map((col) => (
                        <td key={col} className="px-2 py-1.5">
                          <Input
                            size="small"
                            value={
                              typeof row[col] === "string"
                                ? (row[col] as string)
                                : row[col] === undefined || row[col] === null
                                ? ""
                                : JSON.stringify(row[col])
                            }
                            onChange={(e) => updateCell(rowIdx, col, e.target.value)}
                          />
                        </td>
                      ))}
                      <td className="px-2 py-1.5 text-center">
                        <Button size="small" danger onClick={() => removeRow(rowIdx)}>
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button onClick={addRow}>Add row</Button>
              <SaveBtn />
              {justSaved && (
                <Text type="success" className="text-xs">
                  <CheckOutlined /> Saved
                </Text>
              )}
              <ResetBtn />
            </div>
          </div>
        );
      }

      // ── KEY/VALUE mode (plain object) ──
      if (isPlainObject) {
        const entries = Object.entries(parsed as Record<string, unknown>);

        const setKV = (nextEntries: [string, unknown][]) => {
          const out: Record<string, unknown> = {};
          for (const [k, v] of nextEntries) {
            const key = k.trim();
            if (!key) continue;
            out[key] = v;
          }
          change(JSON.stringify(out, null, 2));
        };

        return (
          <div className="space-y-2" style={{ maxWidth: 660 }}>
            <div className="inline-flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-md px-3 py-1.5 text-xs font-mono text-purple-700 max-w-sm">
              <CodeOutlined className="shrink-0 text-purple-400" />
              <span className="truncate">{jsonSummary(value)}</span>
            </div>

            <div
              className="rounded-md divide-y overflow-auto"
              style={{
                maxHeight: 240,
                background: token.colorBgContainer,
                border: `1px solid ${token.colorBorderSecondary}`,
              }}
            >
              {entries.length === 0 ? (
                <div className="text-xs text-gray-400 px-3 py-2">No keys yet.</div>
              ) : (
                entries.map(([k, v], idx) => (
                  <div
                    key={`${k}-${idx}`}
                    className="grid gap-2 items-center px-3 py-2"
                    style={{ gridTemplateColumns: "200px 1fr auto" }}
                  >
                    <Input
                      value={k}
                      onChange={(e) => {
                        const next = entries.slice() as [string, unknown][];
                        next[idx] = [e.target.value, next[idx][1]];
                        setKV(next);
                      }}
                      placeholder="Key"
                    />
                    <Input
                      value={
                        typeof v === "string"
                          ? v
                          : v === undefined
                          ? ""
                          : JSON.stringify(v)
                      }
                      onChange={(e) => {
                        const next = entries.slice() as [string, unknown][];
                        next[idx] = [next[idx][0], smartParseScalar(e.target.value)];
                        setKV(next);
                      }}
                      placeholder="Value"
                    />
                    <Button
                      size="small"
                      danger
                      onClick={() => {
                        Modal.confirm({
                          title: "Remove row?",
                          okText: "Remove",
                          okButtonProps: { danger: true },
                          cancelText: "Cancel",
                          onOk: () => {
                            setKV(entries.filter((_, i) => i !== idx) as [string, unknown][]);
                          },
                        });
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button onClick={() => setKV([...entries, ["", ""]] as [string, unknown][])}>
                Add row
              </Button>
              <SaveBtn />
              {justSaved && (
                <Text type="success" className="text-xs">
                  <CheckOutlined /> Saved
                </Text>
              )}
              <ResetBtn />
            </div>
          </div>
        );
      }

      // ── Fallback: raw JSON textarea ──
      return (
        <div className="space-y-2" style={{ maxWidth: 600 }}>
          <div className="inline-flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-md px-3 py-1.5 text-xs font-mono text-purple-700 max-w-sm">
            <CodeOutlined className="shrink-0 text-purple-400" />
            <span className="truncate">{jsonSummary(value)}</span>
          </div>
          <Input.TextArea
            value={value}
            onChange={(e) => change(e.target.value)}
            autoSize={{ minRows: 5, maxRows: 14 }}
            className="!font-mono !text-xs"
            placeholder='Enter JSON here… e.g. { "key": "value" }'
          />
          <div className="flex items-center gap-2 flex-wrap">
            <SaveBtn />
            {justSaved && (
              <Text type="success" className="text-xs">
                <CheckOutlined /> Saved
              </Text>
            )}
            <ResetBtn />
          </div>
        </div>
      );
    }

    // ── RICHTEXT — WYSIWYG (HTML) + rendered preview ──
    if (ct === "RICHTEXT") {
      return (
        <div className="space-y-2" style={{ maxWidth: 720 }}>
          <div
            className="overflow-hidden rounded-lg"
            style={{ border: `1px solid ${token.colorBorderSecondary}` }}
          >
            <AppSettingRichTextEditor value={value} onChange={change} minHeight={280} />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <SaveBtn />
            <Button size="small" icon={<EyeOutlined />} onClick={() => setPreviewOpen(true)}>
              Preview
            </Button>
            <ResetBtn />
          </div>
          <Modal
            open={previewOpen}
            title={`Preview — ${record.labelEn || record.key}`}
            onCancel={() => setPreviewOpen(false)}
            footer={null}
            width={720}
            destroyOnHidden
          >
            <div
              className="overflow-auto rounded-md border px-5 py-4 text-[15px] leading-relaxed"
              style={{
                maxHeight: 520,
                borderColor: token.colorBorderSecondary,
                background: token.colorFillQuaternary,
                color: token.colorText,
              }}
            >
              <div
                className="app-setting-html-preview [&_a]:text-blue-600 [&_a]:underline [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-2 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-1"
                // eslint-disable-next-line react/no-danger -- sanitized admin legal HTML
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(value || "", { USE_PROFILES: { html: true } }) }}
              />
            </div>
          </Modal>
        </div>
      );
    }

    // ── MARKDOWN — plain textarea + markdown preview ──
    if (ct === "MARKDOWN") {
      return (
        <div className="space-y-2" style={{ maxWidth: 600 }}>
          <Input.TextArea
            value={value}
            onChange={(e) => change(e.target.value)}
            autoSize={{ minRows: 5, maxRows: 18 }}
            className="!font-mono !text-xs"
          />
          <div className="flex items-center gap-2 flex-wrap">
            <SaveBtn />
            <Button size="small" icon={<EyeOutlined />} onClick={() => setPreviewOpen(true)}>
              Preview
            </Button>
            <ResetBtn />
          </div>
          <Modal
            open={previewOpen}
            title={`Preview — ${record.labelEn || record.key}`}
            onCancel={() => setPreviewOpen(false)}
            footer={null}
            width={700}
            destroyOnHidden
          >
            <div
              className="overflow-auto rounded-md border px-5 py-4 text-sm leading-relaxed"
              style={{
                maxHeight: 520,
                borderColor: token.colorBorderSecondary,
                background: token.colorFillQuaternary,
                color: token.colorText,
              }}
            >
              <div className="[&_a]:text-blue-600 [&_a]:underline [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:text-lg [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5">
                {value.trim() ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
                ) : (
                  <span style={{ color: token.colorTextTertiary }}>Nothing to preview.</span>
                )}
              </div>
            </div>
          </Modal>
        </div>
      );
    }

    // ── TEXTAREA — plain multi-line, no formatting ──
    if (ct === "TEXTAREA") {
      return (
        <div className="space-y-2" style={{ maxWidth: 520 }}>
          <Input.TextArea
            value={value}
            onChange={(e) => change(e.target.value)}
            autoSize={{ minRows: 3, maxRows: 8 }}
          />
          <div className="flex items-center gap-2">
            <SaveBtn />
            <ResetBtn />
          </div>
        </div>
      );
    }

    // ── TEXT (default) ──
    return (
      <div className="flex gap-2 items-center flex-wrap">
        <Input value={value} onChange={(e) => change(e.target.value)} style={{ maxWidth: 360 }} />
        <SaveBtn />
        <ResetBtn />
      </div>
    );
  };

  // ═════════════════════════════════════════════════════════════════════════
  //  Row layout
  // ═════════════════════════════════════════════════════════════════════════
  const ctLabel = record.controlType ?? record.valueType;

  return (
    <>
      <div className="grid gap-x-8 py-5" style={{ gridTemplateColumns: "260px 1fr" }}>
        <div className="pt-0.5">
          <div className="font-semibold text-sm leading-snug" style={{ color: token.colorText }}>
            {record.labelEn || record.key}
          </div>
          {record.labelMy && (
            <div className="text-xs mt-0.5" style={{ color: token.colorTextSecondary }}>
              {record.labelMy}
            </div>
          )}
          <code className="text-xs mt-1 block" style={{ color: token.colorTextSecondary }}>
            {record.key}
          </code>
          <div className="flex flex-wrap gap-1 mt-1.5">
            <Tag
              color={TYPE_COLOR[ctLabel] ?? "default"}
              style={{ fontSize: 10, padding: "0 5px", lineHeight: "18px", margin: 0 }}
            >
              {ctLabel}
            </Tag>
            {record.isPublic && (
              <Tag color="cyan" style={{ fontSize: 10, padding: "0 5px", lineHeight: "18px", margin: 0 }}>
                Public
              </Tag>
            )}
          </div>
        </div>

        <div>
          {ctrl()}
          <SavedHint />
          {record.description && (
            <p className="mt-1.5 text-xs text-gray-500 leading-relaxed m-0 max-w-lg">
              {record.description}
            </p>
          )}
        </div>
      </div>

      <Divider style={{ margin: 0 }} />
    </>
  );
};

// ── AppSettingsTable ───────────────────────────────────────────────────────

interface Props {
  category: AppSettingCategory;
  activeTab: string;
}

const AppSettingsTable: React.FC<Props> = ({ category, activeTab }) => {
  const { message } = App.useApp();
  const { list, loading, fetchSettings, saveSetting, patchSetting } = useAppSetting(category);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (category === activeTab) void fetchSettings({ category });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, category]);

  /** Full save + refresh — used for TEXT, NUMBER, JSON, LIST, IMAGE, etc. */
  const handleSave = async (id: string, value: string) => {
    setSavingId(id);
    try {
      await saveSetting({ payload: { value }, id });
      message.success("Setting saved");
    } catch {
      message.error("Failed to save setting");
      throw new Error("save failed"); // propagate so SettingRow can revert
    } finally {
      setSavingId(null);
    }
  };

  /** Patch only — no refresh (BOOLEAN auto-save). */
  const handleToggle = async (id: string, value: string) => {
    setSavingId(id);
    try {
      await patchSetting({ id, value });
      message.success("Setting saved");
    } catch {
      message.error("Failed to save setting");
      throw new Error("save failed");
    } finally {
      setSavingId(null);
    }
  };

  const filtered = list
    .filter((item) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        item.key.toLowerCase().includes(q) ||
        (item.labelEn ?? "").toLowerCase().includes(q) ||
        (item.labelMy ?? "").toLowerCase().includes(q) ||
        (item.description ?? "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.key.localeCompare(b.key));

  if (loading && !list.length) {
    return (
      <div className="flex justify-center items-center py-20">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <Input.Search
          allowClear
          placeholder="Search settings…"
          value={search}
          onSearch={setSearch}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 280 }}
        />
        <span className="text-xs text-gray-400 select-none">
          {filtered.length} {filtered.length === 1 ? "setting" : "settings"}
        </span>
      </div>

      <Divider style={{ margin: "0 0 0 0" }} />

      {filtered.length === 0 ? (
        <Empty description="No settings found" className="py-16" />
      ) : (
        filtered.map((record) => (
          <SettingRow
            key={record.id}
            record={record}
            onSave={handleSave}
            onToggle={handleToggle}
            saving={savingId === record.id}
          />
        ))
      )}
    </div>
  );
};

export default AppSettingsTable;
