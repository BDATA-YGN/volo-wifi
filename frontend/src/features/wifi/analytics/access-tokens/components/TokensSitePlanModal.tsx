"use client";

import React, { useMemo } from "react";
import { Modal, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { CredentialSitePlanRow, CredentialSiteRow } from "../types";
import { formatCount } from "../utils";
import { STATUS_COLUMNS, countCell } from "./TokensSiteTable";

const { Text } = Typography;

type Props = {
  open: boolean;
  site: CredentialSiteRow | null;
  onClose: () => void;
};

const TokensSitePlanModal: React.FC<Props> = ({ open, site, onClose }) => {
  const rows = site?.byPlan ?? [];
  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          sold: acc.sold + row.sold,
          activated: acc.activated + row.activated,
          expired: acc.expired + row.expired,
          revoked: acc.revoked + row.revoked,
          consumed: acc.consumed + row.consumed,
          archived: acc.archived + row.archived,
        }),
        {
          sold: 0,
          activated: 0,
          expired: 0,
          revoked: 0,
          consumed: 0,
          archived: 0,
        },
      ),
    [rows],
  );

  const columns: ColumnsType<CredentialSitePlanRow> = [
    {
      title: "Plan",
      key: "plan",
      fixed: "left",
      width: 220,
      render: (_, row) => (
        <div>
          <Text strong>{row.name}</Text>
          <div>
            <Tag style={{ fontFamily: "monospace", marginTop: 4 }}>{row.code}</Tag>
          </div>
        </div>
      ),
    },
    ...STATUS_COLUMNS.map((col) => ({
      title: col.title,
      dataIndex: col.key,
      key: col.key,
      width: 110,
      align: "right" as const,
      sorter: (a: CredentialSitePlanRow, b: CredentialSitePlanRow) => a[col.key] - b[col.key],
      defaultSortOrder: col.key === "sold" ? ("descend" as const) : undefined,
      render: (n: number) => countCell(n, col.color),
    })),
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={920}
      title={site ? `${site.name} · status by plan` : "Status by plan"}
    >
      {site ? (
        <div className="mb-3">
          <Tag style={{ fontFamily: "monospace" }}>{site.code}</Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Counts are for the selected period
          </Text>
        </div>
      ) : null}
      <Table<CredentialSitePlanRow>
        size="small"
        rowKey="planId"
        dataSource={rows}
        columns={columns}
        pagination={false}
        scroll={{ x: 860 }}
        locale={{ emptyText: "No plan activity for this site in the selected period" }}
        summary={() =>
          rows.length === 0 ? null : (
            <Table.Summary>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0}>
                  <Text strong>Total</Text>
                </Table.Summary.Cell>
                {STATUS_COLUMNS.map((col, index) => (
                  <Table.Summary.Cell key={col.key} index={index + 1} align="right">
                    <Text strong>{formatCount(totals[col.key])}</Text>
                  </Table.Summary.Cell>
                ))}
              </Table.Summary.Row>
            </Table.Summary>
          )
        }
      />
    </Modal>
  );
};

export default TokensSitePlanModal;
