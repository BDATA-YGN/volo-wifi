"use client";

import React, { useCallback } from "react";
import { App, Button, Modal, Typography, theme } from "antd";
import { CopyOutlined } from "@ant-design/icons";
import { VoucherCodeText } from "@/features/wifi/shared/components/VoucherCodeText";
import type { IssueTokenResult } from "../types";
import { formatMoney } from "../utils";

const { Text, Paragraph } = Typography;

type Props = {
  open: boolean;
  result: IssueTokenResult | null;
  onClose: () => void;
};

const IssueSuccessModal: React.FC<Props> = ({ open, result, onClose }) => {
  const { token } = theme.useToken();
  const { message } = App.useApp();

  const tokens = result?.credentials.map((c) => c.token).filter(Boolean) as string[];

  const copyAll = useCallback(async () => {
    if (tokens.length === 0) return;
    try {
      await navigator.clipboard.writeText(tokens.join("\n"));
      message.success(`Copied ${tokens.length} token${tokens.length === 1 ? "" : "s"}`);
    } catch {
      message.error("Could not copy to clipboard");
    }
  }, [message, tokens]);

  return (
    <Modal
      title="Sale complete"
      open={open}
      width={560}
      onCancel={onClose}
      onOk={onClose}
      okText="Done"
      cancelButtonProps={{ style: { display: "none" } }}
    >
      {result ? (
        <>
          <Paragraph style={{ marginBottom: 12 }}>
            Order <Text code>{result.order.orderNo}</Text> ·{" "}
            {formatMoney(result.order.total, result.order.currency)}
          </Paragraph>

          <div className="mb-2 flex items-center justify-between gap-2">
            <Text strong>
              {result.credentials.length === 1 ? "Access token" : "Access tokens"}{" "}
              <Text type="secondary" style={{ fontWeight: 400, fontSize: 13 }}>
                ({result.credentials.length})
              </Text>
            </Text>
            {tokens.length > 1 ? (
              <Button type="link" size="small" icon={<CopyOutlined />} onClick={() => void copyAll()}>
                Copy all
              </Button>
            ) : null}
          </div>

          <div
            className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4"
            style={{
              maxHeight: 280,
              overflowY: "auto",
              paddingRight: 4,
            }}
          >
            {result.credentials.map((c) => (
              <div
                key={c.id}
                className="flex min-w-0 items-center justify-between gap-1 rounded px-2 py-1.5"
                style={{
                  border: `1px solid ${token.colorBorderSecondary}`,
                  background: token.colorFillTertiary,
                }}
              >
                <VoucherCodeText
                  value={c.token ?? ""}
                  className="truncate"
                  style={{ fontSize: 16, lineHeight: 1.3, letterSpacing: "0.12em", fontWeight: 600 }}
                  title={c.token ?? undefined}
                />
                {c.token ? (
                  <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                    aria-label={`Copy ${c.token}`}
                    style={{ flexShrink: 0, color: token.colorPrimary }}
                    onClick={() => {
                      void navigator.clipboard.writeText(c.token!).then(
                        () => message.success("Copied"),
                        () => message.error("Could not copy")
                      );
                    }}
                  />
                ) : null}
              </div>
            ))}
          </div>

          <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0, fontSize: 12 }}>
            Share the token with the customer for captive portal login.
          </Paragraph>
        </>
      ) : null}
    </Modal>
  );
};

export default IssueSuccessModal;
