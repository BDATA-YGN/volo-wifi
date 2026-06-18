"use client";

import React from "react";
import { Form, InputNumber, Switch, Table, Typography, theme } from "antd";
import type { StationTierPrerequisite } from "../types";
import { formatMoney } from "../utils";

const { Text, Title } = Typography;

interface Props {
  tiers: StationTierPrerequisite[];
  currency: string;
  readOnly?: boolean;
}

const TierRatePreviewTable: React.FC<Props> = ({ tiers, currency, readOnly }) => {
  const { token } = theme.useToken();
  const usePlatform = Form.useWatch("usePlatformTierRates");

  if (!tiers.length) return null;

  const columns = [
    {
      title: "Tier",
      dataIndex: "name",
      key: "name",
      render: (_: unknown, row: StationTierPrerequisite) => (
        <div>
          <Text strong>{row.name}</Text>
          <div>
            <Text type="secondary" style={{ fontSize: 12, fontFamily: "monospace" }}>
              {row.code}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: "Platform rate / month",
      key: "platform",
      render: (_: unknown, row: StationTierPrerequisite) =>
        row.platformPrice ? (
          formatMoney(row.platformPrice.unitPrice, row.platformPrice.currency)
        ) : (
          <Text type="danger">Not configured</Text>
        ),
    },
    ...(!readOnly && usePlatform === false
      ? [
          {
            title: "Tenant override",
            key: "override",
            render: (_: unknown, row: StationTierPrerequisite, index: number) => (
              <Form.Item
                name={["tierRateOverrides", index, "unitPrice"]}
                rules={[{ required: true, message: "Required" }]}
                style={{ marginBottom: 0 }}
              >
                <InputNumber
                  min={0}
                  className="w-full"
                  addonAfter={currency}
                  placeholder="Custom rate"
                />
              </Form.Item>
            ),
          },
        ]
      : []),
  ];

  return (
    <div
      style={{
        marginTop: 8,
        padding: 16,
        borderRadius: token.borderRadiusLG,
        border: `1px solid ${token.colorBorderSecondary}`,
        background: token.colorFillAlter,
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <Title level={5} style={{ margin: 0 }}>
            Monthly tier rates
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Applied per licensed site at month-end invoicing
          </Text>
        </div>
        {!readOnly ? (
          <Form.Item
            name="usePlatformTierRates"
            valuePropName="checked"
            style={{ marginBottom: 0 }}
            label={<Text style={{ fontSize: 12 }}>Use platform defaults</Text>}
          >
            <Switch />
          </Form.Item>
        ) : null}
      </div>

      <Table
        size="small"
        pagination={false}
        rowKey="id"
        dataSource={tiers}
        columns={columns}
      />
    </div>
  );
};

export default TierRatePreviewTable;
