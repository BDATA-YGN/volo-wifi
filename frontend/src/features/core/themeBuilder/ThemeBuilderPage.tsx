"use client";

import React, { useState } from "react";
import CommonHeader from "@/common/components/@bdata/CommonHeader";
import ThemeEditorContainer from "@/features/core/themeBuilder/components/ThemeEditorContainer";

export default function ThemeBuilderPage() {
  const [headerExtras, setHeaderExtras] = useState<React.ReactNode>(null);

  return (
    <div className="pt-0">
      <CommonHeader extras={headerExtras} />
      <ThemeEditorContainer onHeaderExtraChange={setHeaderExtras} />
    </div>
  );
}
