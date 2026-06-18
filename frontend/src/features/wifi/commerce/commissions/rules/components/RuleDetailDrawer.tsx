"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Descriptions, Drawer, Spin, Tag, Typography } from "antd";
import { formatWifiDateTime } from "@/features/wifi/shared/format";
import type { CommissionRuleRecord } from "../types";
import { TYPE_COLOR } from "../constant";
import { formatCommissionValue } from "../utils";

const { Text, Title, Paragraph } = Typography;

type Props = {
  open: boolean;
  ruleId: string | null;
  currency: string;
  fallback?: CommissionRuleRecord | null;
  onClose: () => void;
  onEdit: (record: CommissionRuleRecord) => void;
  loadRule: (id: string) => Promise<CommissionRuleRecord>;
};

const RuleDetailDrawer: React.FC<Props> = ({
  open,
  ruleId,
  currency,
  fallback,
  onClose,
  onEdit,
  loadRule,
}) => {
  const [rule, setRule] = useState<CommissionRuleRecord | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !ruleId) {
      setRule(null);
      return;
    }

    if (fallback?.id === ruleId) {
      setRule(fallback);
    }

    setLoading(true);
    void loadRule(ruleId)
      .then(setRule)
      .catch(() => {
        if (fallback?.id === ruleId) setRule(fallback);
      })
      .finally(() => setLoading(false));
  }, [open, ruleId, fallback, loadRule]);

  const row = rule;

  return (
    <Drawer
      title="Commission rule"
      size={480}
      open={open}
      onClose={onClose}
      destroyOnClose
      extra={
        row ? (
          <Button type="primary" size="small" onClick={() => onEdit(row)}>
            Edit
          </Button>
        ) : null
      }
    >
      <Spin spinning={loading}>
        {row ? (
          <>
            <div className="mb-4">
              <Title level={5} style={{ margin: 0 }}>
                {formatCommissionValue(row.type, row.value, row.valuePercent, currency)}
              </Title>
              <Paragraph type="secondary" style={{ marginTop: 4, marginBottom: 8 }}>
                {row.scopeLabel}
              </Paragraph>
              <div className="flex flex-wrap gap-2">
                <Tag color={TYPE_COLOR[row.type]}>{row.type}</Tag>
                <Tag color={row.isActive ? "success" : "default"}>
                  {row.isActive ? "Active" : "Inactive"}
                </Tag>
              </div>
            </div>

            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Partner">
                {row.reseller ? `${row.reseller.code} — ${row.reseller.name}` : "All partners"}
              </Descriptions.Item>
              <Descriptions.Item label="Plan">
                {row.plan ? `${row.plan.code} — ${row.plan.name}` : "All plans"}
              </Descriptions.Item>
              <Descriptions.Item label="Rate / amount">
                {formatCommissionValue(row.type, row.value, row.valuePercent, currency)}
              </Descriptions.Item>
              <Descriptions.Item label="Created">
                {formatWifiDateTime(row.createdAt)}
              </Descriptions.Item>
              <Descriptions.Item label="Updated">
                {formatWifiDateTime(row.updatedAt)}
              </Descriptions.Item>
            </Descriptions>

            <Paragraph type="secondary" style={{ marginTop: 16, fontSize: 12 }}>
              Applies to sales from{" "}
              <Link href="/wifi/commerce/transactions/orders">Orders</Link> matching this scope.
            </Paragraph>
          </>
        ) : null}
      </Spin>
    </Drawer>
  );
};

export default RuleDetailDrawer;
