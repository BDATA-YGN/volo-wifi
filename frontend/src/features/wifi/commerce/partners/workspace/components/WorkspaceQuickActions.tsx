"use client";

import React, { useMemo } from "react";
import { Button, Card, Space, Typography } from "antd";
import { KeyRound, LineChart, Receipt, Store } from "lucide-react";
import { useMenuNavigate } from "@/common/components/Sidebar/useMenuNavigate";
import { usePermittedRelatedLinks } from "@/features/wifi/shared/hooks/useRoutePermission";
import type { WorkspaceMode, WorkspaceReadiness } from "../types";

const { Text } = Typography;

type QuickActionDef = {
  href: string;
  label: string;
  icon: React.ReactNode;
  primary?: boolean;
  requiresCanSell?: boolean;
  hideInPartnerMode?: boolean;
};

const QUICK_ACTIONS: QuickActionDef[] = [
  {
    href: "/wifi/commerce/access-tokens",
    label: "Issue access tokens",
    icon: <KeyRound size={16} />,
    primary: true,
    requiresCanSell: true,
  },
  {
    href: "/wifi/commerce/transactions/orders",
    label: "View orders",
    icon: <Receipt size={16} />,
  },
  {
    href: "/wifi/commerce/partners/insights",
    label: "Partner insights",
    icon: <LineChart size={16} />,
  },
  {
    href: "/wifi/commerce/partners",
    label: "Partner directory",
    icon: <Store size={16} />,
    hideInPartnerMode: true,
  },
];

type Props = {
  readiness: WorkspaceReadiness;
  mode?: WorkspaceMode;
};

const WorkspaceQuickActions: React.FC<Props> = ({ readiness, mode }) => {
  const { navigateToMenu } = useMenuNavigate();

  const permittedLinks = usePermittedRelatedLinks(
    useMemo(
      () =>
        QUICK_ACTIONS.map((action) => ({
          href: action.href,
          label: action.label,
        })),
      []
    )
  );

  const permittedHrefs = useMemo(
    () => new Set(permittedLinks.map((link) => link.href)),
    [permittedLinks]
  );

  const visibleActions = QUICK_ACTIONS.filter((action) => {
    if (!permittedHrefs.has(action.href)) return false;
    if (mode === "partner" && action.hideInPartnerMode) return false;
    return true;
  });

  if (visibleActions.length === 0) {
    return null;
  }

  return (
    <Card size="small" title="Quick actions">
      <Space wrap>
        {visibleActions.map((action) => (
          <Button
            key={action.href}
            type={action.primary ? "primary" : "default"}
            icon={action.icon}
            disabled={action.requiresCanSell ? !readiness.canSellTokens : false}
            onClick={() => navigateToMenu(action.href)}
          >
            {action.label}
          </Button>
        ))}
      </Space>
      {!readiness.canSellTokens ? (
        <Text type="secondary" className="mt-3 block" style={{ fontSize: 12 }}>
          Token sales unlock once sites, plans, and pricing are configured.
        </Text>
      ) : null}
    </Card>
  );
};

export default WorkspaceQuickActions;
