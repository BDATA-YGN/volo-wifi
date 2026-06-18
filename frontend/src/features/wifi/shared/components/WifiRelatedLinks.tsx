"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, Typography, theme } from "antd";
import { Link2, PanelRightClose, PanelRightOpen } from "lucide-react";
import type { WifiRelatedLink } from "../hooks/useRoutePermission";
import { usePermittedRelatedLinks } from "../hooks/useRoutePermission";

const { Text, Title } = Typography;

type PanelProps = {
  eyebrow: string;
  title: string;
  links: WifiRelatedLink[];
  hint?: React.ReactNode;
};

export const WifiRelatedLinksPanel: React.FC<PanelProps> = ({
  eyebrow,
  title,
  links,
  hint,
}) => {
  const { token } = theme.useToken();
  const permitted = usePermittedRelatedLinks(links);

  if (permitted.length === 0) return null;

  return (
    <Card
      size="small"
      title={
        <div>
          <Text
            type="secondary"
            style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6 }}
          >
            {eyebrow}
          </Text>
          <Title level={5} style={{ margin: "4px 0 0" }}>
            {title}
          </Title>
        </div>
      }
      styles={{ body: { paddingTop: 12 } }}
    >
      <div className="flex flex-col gap-2">
        {permitted.map((link) => (
          <Link key={link.href} href={link.href}>
            <Button type="link" icon={link.icon} style={{ padding: 0, height: "auto" }}>
              {link.label}
            </Button>
          </Link>
        ))}
      </div>
      {hint ? (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: token.borderRadius,
            background: token.colorFillAlter,
          }}
        >
          {typeof hint === "string" ? (
            <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.6 }}>
              {hint}
            </Text>
          ) : (
            hint
          )}
        </div>
      ) : null}
    </Card>
  );
};

type ToggleProps = {
  storageKey: string;
  links: WifiRelatedLink[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const WifiRelatedLinksToggle: React.FC<ToggleProps> = ({
  storageKey,
  links,
  open,
  onOpenChange,
}) => {
  const permitted = usePermittedRelatedLinks(links);

  if (permitted.length === 0) return null;

  return (
    <Button
      type={open ? "primary" : "default"}
      ghost={open}
      size="small"
      icon={open ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
      onClick={() => onOpenChange(!open)}
      aria-expanded={open}
      aria-controls={`wifi-related-${storageKey}`}
    >
      Related
    </Button>
  );
};

type SidebarStateOptions = {
  storageKey: string;
  defaultOpen?: boolean;
};

/** Persisted show/hide for optional related-links sidebar. */
export function useWifiRelatedSidebarState({
  storageKey,
  defaultOpen = false,
}: SidebarStateOptions) {
  const storageId = `wifi-related-open:${storageKey}`;

  const [open, setOpenState] = useState(defaultOpen);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageId);
      if (stored !== null) setOpenState(stored === "true");
    } catch {
      /* ignore */
    }
  }, [storageId]);

  const setOpen = useCallback(
    (value: boolean) => {
      setOpenState(value);
      try {
        localStorage.setItem(storageId, String(value));
      } catch {
        /* ignore */
      }
    },
    [storageId]
  );

  return { open, setOpen };
}

type LayoutProps = PanelProps & {
  storageKey: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  toolbarExtra?: React.ReactNode;
};

/**
 * Optional related-links sidebar for sparse WiFi pages.
 * Hidden by default; only renders when the user opens it and has permitted links.
 */
export const WifiRelatedLinksLayout: React.FC<LayoutProps> = ({
  storageKey,
  defaultOpen,
  eyebrow,
  title,
  links,
  hint,
  children,
  toolbarExtra,
}) => {
  const permitted = usePermittedRelatedLinks(links);
  const { open, setOpen } = useWifiRelatedSidebarState({ storageKey, defaultOpen });
  const showSidebar = open && permitted.length > 0;

  return (
    <>
      {toolbarExtra || permitted.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
          {toolbarExtra}
          <WifiRelatedLinksToggle
            storageKey={storageKey}
            links={links}
            open={open}
            onOpenChange={setOpen}
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:gap-6">
        <div className={showSidebar ? "min-w-0 flex-1 xl:w-[calc(100%-320px)]" : "min-w-0 flex-1"}>
          {children}
        </div>
        {showSidebar ? (
          <aside
            id={`wifi-related-${storageKey}`}
            className="w-full shrink-0 xl:w-[296px]"
            aria-label="Related views"
          >
            <WifiRelatedLinksPanel
              eyebrow={eyebrow}
              title={title}
              links={links}
              hint={hint}
            />
          </aside>
        ) : null}
      </div>
    </>
  );
};

/** Compact inline related links (e.g. footer of a sparse card). Permission-filtered. */
export const WifiRelatedLinksInline: React.FC<PanelProps> = ({
  eyebrow,
  title,
  links,
  hint,
}) => {
  const permitted = usePermittedRelatedLinks(links);
  if (permitted.length === 0) return null;

  return (
    <div className="mt-4 border-t pt-3">
      <div className="mb-2 flex items-center gap-2">
        <Link2 size={14} className="text-neutral-500" />
        <Text type="secondary" style={{ fontSize: 12 }}>
          {eyebrow} · {title}
        </Text>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {permitted.map((link) => (
          <Link key={link.href} href={link.href}>
            <Button type="link" size="small" icon={link.icon} style={{ padding: 0, height: "auto" }}>
              {link.label}
            </Button>
          </Link>
        ))}
      </div>
      {hint && typeof hint === "string" ? (
        <Text type="secondary" className="mt-2 block" style={{ fontSize: 12 }}>
          {hint}
        </Text>
      ) : null}
    </div>
  );
};
