"use client";

import type { DrawerProps } from "antd";
import { useMobileThemeStore } from "../mobileThemeStore";
import { getMobileDrawerStyles } from "../mobileDrawerChrome";
import type { MobileActorType } from "../types";
import drawerPortalStyles from "./mobileDrawerPortal.module.css";

export function useMobileDrawerChrome(actor: MobileActorType) {
  const colorScheme = useMobileThemeStore((s) => s.theme);
  const styles = getMobileDrawerStyles(colorScheme);
  const themeProps = {
    "data-theme": colorScheme,
    "data-actor": actor,
  } as const;

  return { colorScheme, styles, themeProps, actor };
}

/** Merge mobile drawer chrome onto Ant Design Drawer `styles`. */
export function mobileDrawerStyleProps(
  scheme: ReturnType<typeof useMobileDrawerChrome>["colorScheme"],
  overrides?: DrawerProps["styles"],
): DrawerProps["styles"] {
  const base = getMobileDrawerStyles(scheme);
  return {
    header: { ...base.header, ...overrides?.header },
    body: { ...base.body, ...overrides?.body },
    footer: { ...base.footer, ...overrides?.footer },
  };
}

interface MobileDrawerBodyProps {
  actor: MobileActorType;
  children: React.ReactNode;
  className?: string;
}

/** Ant Design drawers portal outside `.mobileShell` — inject theme tokens for CSS variables. */
export function MobileDrawerBody({ actor, children, className }: MobileDrawerBodyProps) {
  const { themeProps } = useMobileDrawerChrome(actor);
  return (
    <div
      className={[drawerPortalStyles.drawerPortalTheme, className].filter(Boolean).join(" ")}
      {...themeProps}
    >
      {children}
    </div>
  );
}

interface MobileDrawerFooterProps {
  actor: MobileActorType;
  children: React.ReactNode;
}

export function MobileDrawerFooter({ actor, children }: MobileDrawerFooterProps) {
  const { themeProps } = useMobileDrawerChrome(actor);
  return (
    <div className={drawerPortalStyles.drawerFooter} {...themeProps}>
      {children}
    </div>
  );
}

interface MobileDrawerSubmitButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  actor?: MobileActorType;
}

export function MobileDrawerSubmitButton({
  actor: _actor,
  className,
  type = "button",
  ...props
}: MobileDrawerSubmitButtonProps) {
  return (
    <button
      type={type}
      className={[drawerPortalStyles.drawerSubmitBtn, className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}
