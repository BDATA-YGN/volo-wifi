"use client";

import React from "react";
import { Typography, theme } from "antd";

const { Text } = Typography;

type Props = React.ComponentProps<typeof Text>;

/** Muted helper text that respects the active Ant Design theme (light/dark). */
export const WifiMutedText: React.FC<Props> = ({ style, children, ...props }) => {
  const { token } = theme.useToken();

  return (
    <Text {...props} style={{ color: token.colorTextSecondary, ...style }}>
      {children}
    </Text>
  );
};

export default WifiMutedText;
