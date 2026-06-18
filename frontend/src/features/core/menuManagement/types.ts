export interface MenuGroup {
  id: number;
  key: string;
  title: string;
  icon?: string;
  position: number;
  items: MenuItem[];
  mode: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface MenuItem {
  id: number;
  key: string;
  title: string;
  icon?: string;
  url?: string;
  position: number;
  groupId: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface MenuGroupFormData {
  key?: string;
  title?: string;
  icon?: string;
  mode?: number;
}

export interface MenuItemFormData {
  key: string;
  title: string;
  icon: string;
  url: string;
  groupId: number;
}

export interface CreateMenuGroupInput {
  key: string;
  title: string;
  icon: string;
  position: number;
  items?: MenuItem[];
}

export interface UpdateMenuGroupInput {
  key?: string;
  title?: string;
  icon?: string;
  position?: number;
  items?: MenuItem[];
}

export interface CreateMenuItemInput {
  key: string;
  title: string;
  icon: string;
  url: string;
  position?: number;
}

export interface UpdateMenuItemInput {
  key?: string;
  title?: string;
  icon?: string;
  url?: string;
  position?: number;
  groupId?: number;
}

export interface UpdatePositionsInput {
  id: number;
  position: number;
}
