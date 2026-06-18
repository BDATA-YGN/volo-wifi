"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Button, Empty, Select, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { AttrRequirement, CatalogAttribute, SupportedAttributeInput } from "../types";
import { REQUIREMENT_OPTIONS, VALUE_TYPE_COLOR } from "../constant";

const { Text } = Typography;

type Row = SupportedAttributeInput & { attribute: CatalogAttribute };

type Props = {
  value: SupportedAttributeInput[];
  catalog: CatalogAttribute[];
  onChange: (value: SupportedAttributeInput[]) => void;
};

const SupportedAttributesEditor: React.FC<Props> = ({ value, catalog, onChange }) => {
  const rows: Row[] = useMemo(
    () =>
      value
        .map((row) => {
          const attribute = catalog.find((a) => a.id === row.attributeId);
          return attribute ? { ...row, attribute } : null;
        })
        .filter((r): r is Row => r !== null),
    [value, catalog]
  );

  const available = catalog.filter((a) => !value.some((v) => v.attributeId === a.id));

  const addAttribute = (attributeId: string) => {
    onChange([...value, { attributeId, requirement: "OPTIONAL" }]);
  };

  const updateRequirement = (attributeId: string, requirement: AttrRequirement) => {
    onChange(value.map((row) => (row.attributeId === attributeId ? { ...row, requirement } : row)));
  };

  const removeAttribute = (attributeId: string) => {
    onChange(value.filter((row) => row.attributeId !== attributeId));
  };

  const columns: ColumnsType<Row> = [
    {
      title: "Attribute",
      key: "name",
      render: (_, row) => (
        <div>
          <Text code style={{ fontSize: 12 }}>
            {row.attribute.freeradiusName}
          </Text>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {row.attribute.displayName}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: "Type",
      dataIndex: ["attribute", "valueType"],
      width: 90,
      render: (type: string) => <Tag color={VALUE_TYPE_COLOR[type] ?? "default"}>{type}</Tag>,
    },
    {
      title: "Requirement",
      key: "requirement",
      width: 130,
      render: (_, row) => (
        <Select
          size="small"
          value={row.requirement}
          onChange={(v) => updateRequirement(row.attributeId, v)}
          options={REQUIREMENT_OPTIONS}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      title: "",
      key: "remove",
      width: 80,
      render: (_, row) => (
        <Button type="link" danger size="small" onClick={() => removeAttribute(row.attributeId)}>
          Remove
        </Button>
      ),
    },
  ];

  if (!catalog.length) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <span>
            No attributes in catalog.{" "}
            <Link href="/wifi/network/radius/attribute-catalog">Add attributes</Link> first.
          </span>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Select
        showSearch
        placeholder="Add attribute from catalog…"
        style={{ width: "100%" }}
        value={null}
        onChange={addAttribute}
        optionFilterProp="label"
        options={available.map((a) => ({
          value: a.id,
          label: `${a.freeradiusName} — ${a.displayName}`,
        }))}
        disabled={!available.length}
      />

      {rows.length === 0 ? (
        <Text type="secondary" style={{ fontSize: 12 }}>
          Select supported RADIUS attributes for this vendor hardware. Mark critical attributes as
          Required for plan policy validation.
        </Text>
      ) : (
        <Table<Row>
          rowKey="attributeId"
          size="small"
          columns={columns}
          dataSource={rows}
          pagination={false}
        />
      )}
    </div>
  );
};

export default SupportedAttributesEditor;
