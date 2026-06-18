import type { MenuGroup, MenuItem, MngRoleSettings } from "@/generated/prisma/client";

type GroupLite = Pick<MenuGroup, "id" | "key" | "position">;
type ItemLite = Pick<MenuItem, "id" | "key" | "url" | "groupId" | "position">;

/** Section ordering: menu-tree (groups + their menus interleaved) first, then buttons, then features. */
const SECTION_MENU_TREE = 0;
const SECTION_BUTTON = 1;
const SECTION_FEATURE = 2;
const SECTION_OTHER = 3;

/** Within a group: the menuGroup row itself comes before its menu rows. */
const ROW_RANK_GROUP = 0;
const ROW_RANK_MENU = 1;

/** Rows that cannot be tied to menu tables sort after known positions. */
const TAIL = 1_000_000;

function sectionRank(kind: string): number {
  switch (kind) {
    case "menuGroup":
    case "menu":
      return SECTION_MENU_TREE;
    case "button":
      return SECTION_BUTTON;
    case "feature":
      return SECTION_FEATURE;
    default:
      return SECTION_OTHER;
  }
}

function isStrictNumericId(value: string | null | undefined): value is string {
  return !!value && /^\d+$/.test(value);
}

/**
 * Sort permission rows like the sidebar: each menu group is immediately followed
 * by its menu items (ordered by `tbl_menu_item.position`), then the next group.
 * Buttons and features come after the whole menu tree.
 */
export function sortMngRoleSettingsByMenuPosition(
  rows: MngRoleSettings[],
  groups: GroupLite[],
  items: ItemLite[],
): MngRoleSettings[] {
  const groupById = new Map<number, GroupLite>(groups.map((g) => [g.id, g]));
  const groupByKey = new Map<string, GroupLite>(groups.map((g) => [g.key, g]));

  const itemsByGroupId = new Map<number, ItemLite[]>();
  for (const it of items) {
    const list = itemsByGroupId.get(it.groupId) ?? [];
    list.push(it);
    itemsByGroupId.set(it.groupId, list);
  }
  for (const [, list] of itemsByGroupId) {
    list.sort((a, b) => a.position - b.position);
  }

  const matchesSettingKey = (it: Pick<MenuItem, "key" | "url">, settingKey: string) =>
    it.key === settingKey || (it.url != null && it.url === settingKey);

  const resolveMenuGroup = (row: MngRoleSettings): GroupLite | undefined => {
    if (row.kind !== "menuGroup") return undefined;
    if (isStrictNumericId(row.parentId)) {
      const g = groupById.get(Number.parseInt(row.parentId!, 10));
      if (g) return g;
    }
    return groupByKey.get(row.settingKey);
  };

  const resolveGroupForMenuRow = (row: MngRoleSettings): GroupLite | undefined => {
    const pid = row.parentId;
    if (isStrictNumericId(pid)) {
      const asItem = items.find((i) => i.id === Number.parseInt(pid, 10));
      if (asItem) return groupById.get(asItem.groupId);
    }
    if (pid) {
      const g = groupByKey.get(pid);
      if (g) return g;
    }
    const loose = items.find((i) => matchesSettingKey(i, row.settingKey));
    if (loose) return groupById.get(loose.groupId);
    return undefined;
  };

  const resolveItemForMenuRow = (
    row: MngRoleSettings,
    group: GroupLite | undefined,
  ): ItemLite | undefined => {
    if (group) {
      const inGroup = itemsByGroupId.get(group.id) ?? [];
      const hit = inGroup.find((i) => matchesSettingKey(i, row.settingKey));
      if (hit) return hit;
    }
    return items.find((i) => matchesSettingKey(i, row.settingKey));
  };

  /**
   * Tuple layout (lower wins):
   *   [0] section: menu-tree / button / feature / other
   *   [1] group position (parent group's sidebar position)
   *   [2] row rank inside the group: 0 = the group itself, 1 = menus under it
   *   [3] menu item position (only meaningful for menu rows)
   *   [4] settingKey (deterministic tiebreaker)
   */
  const sortTuple = (
    row: MngRoleSettings,
  ): [number, number, number, number, string] => {
    const sr = sectionRank(row.kind as string);
    if (row.kind === "menuGroup") {
      const g = resolveMenuGroup(row);
      return [sr, g?.position ?? TAIL, ROW_RANK_GROUP, 0, row.settingKey];
    }
    if (row.kind === "menu") {
      const g = resolveGroupForMenuRow(row);
      const it = resolveItemForMenuRow(row, g);
      return [
        sr,
        g?.position ?? TAIL,
        ROW_RANK_MENU,
        it?.position ?? TAIL,
        row.settingKey,
      ];
    }
    return [sr, 0, 0, 0, row.settingKey];
  };

  return [...rows].sort((a, b) => {
    const ta = sortTuple(a);
    const tb = sortTuple(b);
    if (ta[0] !== tb[0]) return ta[0] - tb[0];
    if (ta[1] !== tb[1]) return ta[1] - tb[1];
    if (ta[2] !== tb[2]) return ta[2] - tb[2];
    if (ta[3] !== tb[3]) return ta[3] - tb[3];
    return ta[4].localeCompare(tb[4]);
  });
}
