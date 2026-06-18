"use client";

import { useMemo } from "react";
import { useLocale, useMessages } from "next-intl";
import {
  GUIDE_MODULES,
  GUIDE_ROLE_KEYS,
  GUIDE_RULE_KEYS,
  GUIDE_WORKFLOWS,
} from "./constants";
import { getGuideString, type GuideMessagesTree } from "./guideMessages";

export function useSystemGuide() {
  const locale = useLocale();
  const messages = useMessages();
  const apiHome = (messages?.home ?? undefined) as GuideMessagesTree | undefined;

  return useMemo(() => {
    const pick = (path: string) => getGuideString(locale, apiHome, path);

    const modules = GUIDE_MODULES.map((mod) => ({
      ...mod,
      title: pick(`modules.${mod.key}.title`),
      summary: pick(`modules.${mod.key}.summary`),
      features: Array.from({ length: mod.featureCount }, (_, i) =>
        pick(`modules.${mod.key}.f${i + 1}`),
      ).filter((value) => value && !value.startsWith("modules.")),
    }));

    const workflows = GUIDE_WORKFLOWS.map((key) => ({
      key,
      title: pick(`workflows.${key}.title`),
      steps: pick(`workflows.${key}.steps`),
    }));

    const rules = GUIDE_RULE_KEYS.map((key) => pick(`rules.${key}`)).filter(
      (value) => value && !value.startsWith("rules."),
    );

    const roles = GUIDE_ROLE_KEYS.map((key) => ({
      key,
      title: pick(`roles.${key}.title`),
      description: pick(`roles.${key}.description`),
    }));

    return {
      title: pick("guideTitle"),
      subtitle: pick("guideSubtitle"),
      welcome: pick("welcome"),
      accessNote: pick("accessNote"),
      modulesTitle: pick("modulesTitle"),
      workflowsTitle: pick("workflowsTitle"),
      rulesTitle: pick("rulesTitle"),
      rolesTitle: pick("rolesTitle"),
      modules,
      workflows,
      rules,
      roles,
    };
  }, [apiHome, locale]);
}
