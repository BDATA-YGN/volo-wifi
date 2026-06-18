"use client";

import React from "react";
import { Empty, Typography } from "antd";
import { LayoutPanelLeft } from "lucide-react";
import CommonHeader from "@/common/components/@bdata/CommonHeader";
import { useSafeMenuTranslate } from "@/features/core/permissions/useSafeMenuTranslate";

export type SectionPlaceholderProps = {
  groupKey: string;
  translationKey: string;
  path: string;
};

/**
 * Generic “section not implemented yet” shell for dashboard routes.
 * Replaces the removed HR-specific placeholder.
 */
export function SectionPlaceholder({ groupKey, translationKey }: SectionPlaceholderProps) {
  const translate = useSafeMenuTranslate();
  const title = translate(translationKey);
  const groupTitle = translate(`menu-group.${groupKey}`);
  const groupResolved = groupTitle !== `menu-group.${groupKey}`;

  return (
    <div className="flex flex-col h-full min-h-0">
      <CommonHeader title={title} icon={LayoutPanelLeft} />
      <div className="flex flex-1 items-center justify-center p-8">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div className="max-w-md text-center">
              <Typography.Paragraph className="mb-1 font-medium">{title}</Typography.Paragraph>
              <Typography.Text type="secondary">
                This section is not available yet.
                {groupResolved ? <> It is part of {groupTitle}.</> : null}
              </Typography.Text>
            </div>
          }
        />
      </div>
    </div>
  );
}
