"use client";

import React, { useEffect, useState } from "react";
import Entry from "./DevelopmentSettingsEntry";
import { Tabs, Card } from "antd";
import CommonHeader from "@/common/components/@bdata/CommonHeader";

const SettingsRoutePage: React.FC = () => {

  const [activeTab, setActiveTab] = useState<string>("1");
  const [headerExtras, setHeaderExtras] = useState<React.ReactNode>(null);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  return (
    <div className="pt-0">
      <CommonHeader extras={headerExtras}/>
      <Card style={{ overflowY: "auto", height: "var(--content-body-height)", border: "none" }}>
        <Tabs
          defaultActiveKey="1"
          onChange={handleTabChange}
          items={[
            {
              key: "1",
              label: "Settings",
              children: <Entry activeKey={activeTab} />,
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default SettingsRoutePage;
