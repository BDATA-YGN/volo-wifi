// app/layout.tsx
import "./globals.css";
import "@/lib/timezone";
import BaseComponent from "./base";
import Providers from "@/common/provider/queryProvider";
import { getUserLocale } from "../i18n/locale";
import { getMessages, getAppSettings } from "../i18n/request";
import { AppSettingsProvider } from "@/common/provider/AppSettingsContentProvider";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { SocketProvider } from "@/lib/socket/SocketProvider";
import type { Metadata, Viewport } from "next";
import { BRAND_METADATA_ICONS } from "@/common/brand";
import DynamicIntlProvider from "@/common/provider/DynamicIntlProvider";
import { Suspense } from "react";
import { Loading } from "@/common/components/Base/Loading";
import { voucherCodeFont } from "@/features/wifi/shared/voucher-code-font";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getUserLocale();
  const messages = await getMessages(locale);
  const appName = messages?.application?.app_name || "VOLO - Subscription";
  return {
    title: appName,
    description: appName,
    icons: BRAND_METADATA_ICONS,
  };
}

// Create a component that wraps the dynamic content
async function DynamicContent({ children }: { children: React.ReactNode }) {
  const locale = await getUserLocale();

  const [messages, appSettings] = await Promise.all([
    getMessages(locale),
    getAppSettings(),
  ]);

  return (
    <AntdRegistry>
      <DynamicIntlProvider locale={locale} messages={messages}>
        <AppSettingsProvider appSettings={appSettings?.value}>
          <SocketProvider>
            <Providers>
              <BaseComponent>{children}</BaseComponent>
            </Providers>
          </SocketProvider>
        </AppSettingsProvider>
      </DynamicIntlProvider>
    </AntdRegistry>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={voucherCodeFont.variable}>
      <body>
        <Suspense fallback={
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh'
          }}>
            <Loading />
          </div>
        }>
          <DynamicContent>{children}</DynamicContent>
        </Suspense>
      </body>
    </html>
  );
}