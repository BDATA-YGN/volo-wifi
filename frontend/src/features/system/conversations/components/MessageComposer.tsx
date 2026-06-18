"use client";

import React, { useState } from "react";
import { Button, Input, Space, Tooltip, theme } from "antd";
import { SendOutlined } from "@ant-design/icons";

import { MESSAGE_MAX_LENGTH } from "../constant";

const { TextArea } = Input;

interface Props {
  disabled?: boolean;
  sending?: boolean;
  onSend: (content: string) => Promise<void> | void;
}

const MessageComposer: React.FC<Props> = ({ disabled, sending, onSend }) => {
  const { token } = theme.useToken();
  const [value, setValue] = useState("");

  const trimmed = value.trim();
  const canSend = !!trimmed && !sending && !disabled;

  const handleSubmit = async () => {
    if (!canSend) return;
    await onSend(trimmed);
    setValue("");
  };

  return (
    <div
      style={{
        background: token.colorBgContainer,
        borderTop: `1px solid ${token.colorBorderSecondary}`,
        padding: 12,
      }}
    >
      <Space.Compact style={{ display: "flex", width: "100%" }}>
        <TextArea
          value={value}
          onChange={(e) => setValue(e.target.value.slice(0, MESSAGE_MAX_LENGTH))}
          placeholder={disabled ? "Select a conversation" : "Write a message…"}
          autoSize={{ minRows: 1, maxRows: 6 }}
          disabled={disabled}
          onPressEnter={(e) => {
            // Shift+Enter for newline, Enter to send.
            if (!e.shiftKey) {
              e.preventDefault();
              void handleSubmit();
            }
          }}
        />
        <Tooltip title="Send (Enter)">
          <Button
            type="primary"
            icon={<SendOutlined />}
            disabled={!canSend}
            loading={sending}
            onClick={() => void handleSubmit()}
          />
        </Tooltip>
      </Space.Compact>
      <div
        style={{
          fontSize: 11,
          color: token.colorTextTertiary,
          marginTop: 4,
          textAlign: "right",
        }}
      >
        {value.length} / {MESSAGE_MAX_LENGTH}
      </div>
    </div>
  );
};

export default MessageComposer;
