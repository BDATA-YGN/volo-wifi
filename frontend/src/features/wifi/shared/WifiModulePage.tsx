"use client";

import React from "react";
import { Empty, Typography, theme } from "antd";
import { LayoutPanelLeft } from "lucide-react";
import CommonHeader from "@/common/components/@bdata/CommonHeader";
import { useSafeMenuTranslate } from "@/features/core/permissions/useSafeMenuTranslate";

export type WifiModulePageProps = {
  groupTitleKey: string;
  translationKey: string;
  path: string;
};

/**
 * Default shell for scaffolded WiFi screens until a module is fully implemented.
 */
export function WifiModulePage({ groupTitleKey, translationKey, path }: WifiModulePageProps) {
  const { token } = theme.useToken();
  const translate = useSafeMenuTranslate();
  const title = translate(translationKey);
  const groupTitle = translate(groupTitleKey);
  const groupResolved = groupTitle !== groupTitleKey;

  return (
    <div className="p-0">
      <CommonHeader title={title} icon={LayoutPanelLeft} />
      <div
        style={{
          height: "var(--content-body-height)",
          overflowY: "auto",
          background: token.colorBgLayout,
        }}
      >
        <div className="flex flex-1 items-center justify-center p-8 min-h-[320px]">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div className="max-w-md text-center">
                <Typography.Paragraph className="mb-1 font-medium">{title}</Typography.Paragraph>
                <Typography.Text type="secondary">
                  This WiFi module is scaffolded and awaiting implementation.
                  {groupResolved ? <> It belongs to {groupTitle}.</> : null}
                </Typography.Text>
                <div className="mt-2">
                  <Typography.Text type="secondary" code style={{ fontSize: 11 }}>
                    {path}
                  </Typography.Text>
                </div>
              </div>
            }
          />
        </div>
      </div>
    </div>
  );
}
