"use client";
import React from "react";
import { ItemType } from "antd/es/menu/interface";
import TheIcon, { Name } from "@/common/components/@bdata/IconPicker/icons";
import { MenuProps } from "antd";

import { MenuGroup } from "@/features/core/menuManagement/types";

type MenuItem = Required<MenuProps>["items"][number];

export const getMenuConfig = (translateMenu: (key: string) => string, roleMenuMapping: any, menuGroups: MenuGroup[]) => {
  const isRoleBypass = (roleMenuMapping as any)?.__bypass === true;
  const byPass = process.env.BY_PASS === "true" || isRoleBypass;
  const isVisible = (key: string | number | bigint) => {
    const stringKey = key.toString();
    if (!roleMenuMapping || !roleMenuMapping[stringKey]) {
      return false; // Return false if roleMenuMapping is null or the key doesn't exist
    }

    const { visibility } = roleMenuMapping[stringKey]; // Destructure the visibility property
    return visibility ?? false; // Return visibility or false if undefined
  };

  // Check if user should have the item disabled
  const isDisabled = (key: string | number | bigint) => {
    const stringKey = key.toString();
    if (!roleMenuMapping || !roleMenuMapping[stringKey]) {
      return false; // Return false if roleMenuMapping is null or the key doesn't exist
    }

    const { access } = roleMenuMapping[stringKey]; // Destructure the access property
    return !access; // Return true if access is falsy, otherwise false
  };

  const getItem = (label: React.ReactNode, key: React.Key, icon?: React.ReactNode, children?: MenuItem[], type?: "group"): MenuItem => {
    if (byPass) {
      return {
        key,
        icon,
        children,
        label,
        type,
        disabled: false,
      } as MenuItem;
    }
    if (!isVisible(key)) {
      return null;
    }
    return {
      key,
      icon,
      children,
      label,
      type,
      disabled: isDisabled(key),
    } as MenuItem;
  };

  return {
    menuItems: menuGroups
      .filter((g) => g.mode !== 1)
      .sort((a, b) => a.position - b.position) // Sort menu groups by position
      .map((m) => {
        return getItem(
          translateMenu(m.title),
          m.key,
          <TheIcon name={m.icon as Name} style={{ marginRight: 0, fontSize: 16 }} />,
          m.items
            .sort((a, b) => a.position - b.position) // Sort items by position
            .map((item) => {
              return getItem(translateMenu(item.title), item.url!.toString(), <TheIcon name={item.icon as Name} style={{ marginRight: 0, fontSize: 16 }} />);
            })
        );
      })
      .filter(Boolean) as ItemType[],
    singleMenuItems: menuGroups
      .find((g) => g.mode === 1)
      ?.items.map((item) => {
        return getItem(translateMenu(item.title), item.url!.toString(), <TheIcon name={item.icon as Name} style={{ fontSize: 16 }} />);
      }),
  };
};
