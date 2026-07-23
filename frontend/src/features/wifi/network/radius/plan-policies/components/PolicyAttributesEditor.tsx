"use client";

import React from "react";
import { App, Button, Empty, Input, InputNumber, Select, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined } from "@ant-design/icons";
import type {
  CatalogAttributeOption,
  PlanPolicyAttributeInput,
  RadiusAttrValueType,
} from "../types";
import {
  OP_OPTIONS,
  PHASE_FORM_OPTIONS,
  VALUE_TYPE_OPTIONS,
  VENDOR_POLICY_TEMPLATES,
  resolveVendorPolicyTemplateId,
} from "../constant";
import RadiusValueConverter from "./RadiusValueConverter";

const { Text } = Typography;

type Row = PlanPolicyAttributeInput & { key: string };

type Props = {
  value: PlanPolicyAttributeInput[];
  catalog: CatalogAttributeOption[];
  onChange: (value: PlanPolicyAttributeInput[]) => void;
  /** Highlight the matching vendor template button (from Scope). */
  preferredVendor?: string | null;
};

function newRow(partial?: Partial<PlanPolicyAttributeInput>): PlanPolicyAttributeInput {
  return {
    phase: "REPLY",
    attributeName: "",
    op: ":=",
    valueType: "STRING",
    value: "",
    priority: 100,
    note: "",
    ...partial,
  };
}

function mergeTemplate(
  existing: PlanPolicyAttributeInput[],
  templateRows: PlanPolicyAttributeInput[]
): PlanPolicyAttributeInput[] {
  const next = [...existing];
  let priorityCursor =
    next.length === 0 ? 0 : Math.max(...next.map((r) => r.priority || 0));

  for (const row of templateRows) {
    const idx = next.findIndex(
      (r) => r.attributeName === row.attributeName && r.phase === row.phase
    );
    if (idx >= 0) {
      next[idx] = {
        ...next[idx],
        op: row.op,
        valueType: row.valueType,
        value: row.value,
        note: row.note ?? next[idx].note,
        priority: next[idx].priority || row.priority,
      };
      continue;
    }
    priorityCursor += 10;
    next.push({
      ...row,
      priority: row.priority || priorityCursor,
    });
  }

  return next.sort((a, b) => (a.priority || 0) - (b.priority || 0));
}

const PolicyAttributesEditor: React.FC<Props> = ({
  value,
  catalog,
  onChange,
  preferredVendor,
}) => {
  const { message, modal } = App.useApp();
  const preferredTemplateId = resolveVendorPolicyTemplateId(preferredVendor);

  const rows: Row[] = value.map((row, index) => ({
    ...row,
    key: `${row.attributeName || "new"}-${index}`,
  }));

  const patchRow = (index: number, patch: Partial<PlanPolicyAttributeInput>) => {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const removeRow = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const nextPriority = () =>
    value.length === 0 ? 10 : Math.max(...value.map((r) => r.priority || 0)) + 10;

  const addBlank = () => {
    onChange([...value, newRow({ priority: nextPriority() })]);
  };

  const addFromCatalog = (attributeId: string) => {
    const attr = catalog.find((a) => a.id === attributeId);
    if (!attr) return;
    if (value.some((r) => r.attributeName === attr.freeradiusName && r.phase === "REPLY")) {
      return;
    }
    onChange([
      ...value,
      newRow({
        attributeName: attr.freeradiusName,
        op: attr.op || ":=",
        valueType: (attr.valueType as RadiusAttrValueType) || "STRING",
        value: attr.defaultValue ?? "",
        priority: nextPriority(),
      }),
    ]);
  };

  const applyVendorTemplate = (templateId: "mikrotik" | "ruijie") => {
    const template = VENDOR_POLICY_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;

    const apply = () => {
      onChange(mergeTemplate(value, template.attributes));
      message.success(`${template.label} template applied (${template.attributes.length} attrs)`);
    };

    if (!value.length) {
      apply();
      return;
    }

    modal.confirm({
      title: `Apply ${template.label} template?`,
      content:
        "Matching attributes will be updated with template values; missing ones will be added. Other rows stay.",
      okText: "Apply",
      onOk: apply,
    });
  };

  const available = catalog.filter(
    (a) => !value.some((r) => r.attributeName === a.freeradiusName && r.phase === "REPLY")
  );

  const columns: ColumnsType<Row> = [
    {
      title: "Pri",
      dataIndex: "priority",
      width: 72,
      render: (_, row, index) => (
        <InputNumber
          size="small"
          min={0}
          max={9999}
          value={row.priority}
          onChange={(v) => patchRow(index, { priority: Number(v ?? 100) })}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      title: "Phase",
      dataIndex: "phase",
      width: 110,
      render: (_, row, index) => (
        <Select
          size="small"
          value={row.phase}
          options={PHASE_FORM_OPTIONS}
          onChange={(phase) => patchRow(index, { phase })}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      title: "Attribute",
      dataIndex: "attributeName",
      render: (_, row, index) => (
        <Input
          size="small"
          value={row.attributeName}
          placeholder="Session-Timeout"
          onChange={(e) => patchRow(index, { attributeName: e.target.value })}
        />
      ),
    },
    {
      title: "Op",
      dataIndex: "op",
      width: 100,
      render: (_, row, index) => (
        <Select
          size="small"
          value={row.op}
          options={OP_OPTIONS}
          onChange={(op) => patchRow(index, { op })}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      title: "Type",
      dataIndex: "valueType",
      width: 110,
      render: (_, row, index) => (
        <Select
          size="small"
          value={row.valueType}
          options={VALUE_TYPE_OPTIONS}
          onChange={(valueType) => patchRow(index, { valueType })}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      title: "Value",
      dataIndex: "value",
      width: 180,
      render: (_, row, index) => (
        <Input
          size="small"
          value={row.value}
          placeholder="{timeSeconds}"
          onChange={(e) => patchRow(index, { value: e.target.value })}
        />
      ),
    },
    {
      title: "",
      key: "remove",
      width: 72,
      render: (_, __, index) => (
        <Button type="link" danger size="small" onClick={() => removeRow(index)}>
          Remove
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          showSearch
          placeholder="Add from catalog…"
          style={{ minWidth: 260, flex: 1 }}
          value={null}
          onChange={addFromCatalog}
          optionFilterProp="label"
          options={available.map((a) => ({
            value: a.id,
            label: `${a.freeradiusName} — ${a.displayName}`,
          }))}
        />
        <Button icon={<PlusOutlined />} onClick={addBlank}>
          Add row
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Text type="secondary" style={{ fontSize: 12 }}>
          Vendor templates:
        </Text>
        {VENDOR_POLICY_TEMPLATES.map((t) => (
          <Button
            key={t.id}
            size="small"
            type={preferredTemplateId === t.id ? "primary" : "default"}
            onClick={() => applyVendorTemplate(t.id)}
          >
            {t.label}
          </Button>
        ))}
        <Text type="secondary" style={{ fontSize: 11 }}>
          {preferredTemplateId
            ? `Selected vendor matches ${preferredTemplateId === "mikrotik" ? "MikroTik" : "Ruijie"}.`
            : "Adds time, speed, and limit attributes for that NAS vendor."}
        </Text>
      </div>

      {rows.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Add attributes from catalog, or apply a MikroTik / Ruijie template."
        />
      ) : (
        <Table<Row>
          size="small"
          pagination={false}
          rowKey="key"
          columns={columns}
          dataSource={rows}
          scroll={{ x: 780 }}
        />
      )}

      <RadiusValueConverter />
    </div>
  );
};

export default PolicyAttributesEditor;
