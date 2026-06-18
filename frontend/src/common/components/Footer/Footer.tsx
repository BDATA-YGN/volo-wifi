"use client";

import React from 'react';
import { Layout } from 'antd';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useAppSettings } from "@/common/provider/AppSettingsContentProvider";

const { Footer: AntdFooter } = Layout;
const { useToken } = theme;

const Footer: React.FC = () => {
    const { token } = useToken();
    const t = useTranslations("menu");
    const t1 = useTranslations("application");
    const { appSettings } = useAppSettings();

    return (
        <AntdFooter className="footer" style={{ textAlign: 'center', height: 'var(--footer-height)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0}}>
            <div className="footer-text">
                &copy; {new Date().getFullYear()} {appSettings?.app_name} : {appSettings?.app_version}
            </div>
        </AntdFooter>
    );
};

export default Footer;
