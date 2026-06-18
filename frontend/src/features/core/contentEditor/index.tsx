"use client";

import React from "react";
import { theme } from "antd";

import { EditorProvider } from "./context/EditorContent";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import EditorForm from "./components/EditorForm";

const JsonEditor: React.FC = () => {
  const { token } = theme.useToken();
  return (
    <EditorProvider>
      <Header />
      <div
        style={{
          height: "var(--content-body-height)",
          overflow: "hidden",
          background: token.colorBgLayout,
        }}
      >
        <div className="grid h-full grid-cols-1 lg:grid-cols-[minmax(260px,320px)_1fr] min-h-0">
          <aside style={{ height: "100%", overflow: "hidden" }}>
            <Sidebar />
          </aside>
          <main
            style={{
              height: "100%",
              overflow: "auto",
              background: token.colorBgLayout,
            }}
          >
            <EditorForm />
          </main>
        </div>
      </div>
    </EditorProvider>
  );
};

export default JsonEditor;
