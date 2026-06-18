"use client";
import React, { ReactNode, useState } from "react";
import { Layout, Breadcrumb } from "antd";
import Sidebar from "../Sidebar/Sidebar";
import Header from "../Header/Header";
import Footer from "../Footer/Footer";
import { useThemeStore } from "@/common/store/themeStore";
import { useMenuStore } from "@/features/core/menu/menu";
import BreadcrumbBar from "../Header/BreadcrumbBar";
const { Content: AntdContent } = Layout;

const DashLayout = ({ children }: { children: ReactNode }) => {
    const { isMenuCollapsed, setMenuCollapsedPreference, menuLayout, toggleMenuLayout } = useMenuStore();
    const { theme, toggleTheme } = useThemeStore();
    
    return (
        <Layout style={{ minHeight: '100vh' }}>
            {menuLayout === "sidebar" ? (
              <Sidebar collapsed={isMenuCollapsed} setCollapsed={setMenuCollapsedPreference} />
            ) : null}
            <Layout>
                <Header
                  collapsed={isMenuCollapsed}
                  setCollapsed={setMenuCollapsedPreference}
                  toggleTheme={toggleTheme}
                  systemTheme={theme}
                  menuLayout={menuLayout}
                  toggleMenuLayout={toggleMenuLayout}
                />
                {menuLayout === "top" ? <BreadcrumbBar /> : null}
                <AntdContent>
                    <div className={`app-content ${theme}-theme`} style={{ padding: '0px 0px 0' }}>
                        <div className="flex flex-col content" style={{ height: 'var(--content-height)', overflow: 'auto' }}>
                            {/* Content Body */}
                            {children}
                        </div>
                    </div>
                </AntdContent>
                <Footer />
            </Layout>
        </Layout>
    );
};

export default DashLayout;
