"use client";

import { NextIntlClientProvider } from "next-intl";
import type { AbstractIntlMessages } from "next-intl";
import type { ReactNode } from "react";

interface DynamicIntlProviderProps {
  children: ReactNode;
  locale: string;
  messages: AbstractIntlMessages;
}

export default function DynamicIntlProvider({
  children,
  locale,
  messages,
}: DynamicIntlProviderProps) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
