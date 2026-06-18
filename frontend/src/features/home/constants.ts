import type { ComponentType, CSSProperties } from "react";
import {
  AuditOutlined,
  CarOutlined,
  FileTextOutlined,
  FolderOutlined,
  PieChartOutlined,
  SettingOutlined,
  UserOutlined,
} from "@ant-design/icons";

export type GuideModuleKey =
  | "register"
  | "billing"
  | "operations"
  | "finance"
  | "content"
  | "reports";

export type GuideWorkflowKey = "registration" | "invoicing" | "collection" | "payment" | "expense";

export const GUIDE_MODULES: {
  key: GuideModuleKey;
  icon: ComponentType<{ style?: CSSProperties }>;
  featureCount: number;
}[] = [
  { key: "register", icon: UserOutlined, featureCount: 5 },
  { key: "billing", icon: FileTextOutlined, featureCount: 4 },
  { key: "operations", icon: CarOutlined, featureCount: 4 },
  { key: "finance", icon: AuditOutlined, featureCount: 4 },
  { key: "content", icon: FolderOutlined, featureCount: 3 },
  { key: "reports", icon: PieChartOutlined, featureCount: 6 },
];

export const GUIDE_WORKFLOWS: GuideWorkflowKey[] = [
  "registration",
  "invoicing",
  "collection",
  "payment",
  "expense",
];

export const GUIDE_RULE_KEYS = ["r1", "r2", "r3", "r4", "r5", "r6", "r7", "r8"] as const;

export const GUIDE_ROLE_KEYS = ["admin", "finance", "collector", "manager", "customer"] as const;
