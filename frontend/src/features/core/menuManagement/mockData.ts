import { MenuGroup, MenuItem } from './types';

export const mockMenuGroups: MenuGroup[] = [];

// Helper functions to manipulate mock data
export const getMenuGroups = (): Promise<MenuGroup[]> => {
  return Promise.resolve([...mockMenuGroups]);
};

export const updateMenuGroupPositions = (updatedGroups: MenuGroup[]): Promise<MenuGroup[]> => {
  // In a real app, this would make an API call
  // For now, we'll just return the updated groups
  return Promise.resolve(updatedGroups);
};

export const updateMenuItemPositions = (
  groupId: number, 
  updatedItems: MenuItem[]
): Promise<MenuItem[]> => {
  // In a real app, this would make an API call
  // For now, we'll just return the updated items
  return Promise.resolve(updatedItems);
};

export const addMenuGroup = (newGroup: Omit<MenuGroup, 'id' | 'position' | 'items' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<MenuGroup> => {
  // In a real app, this would make an API call
  const group: MenuGroup = {
    ...newGroup,
    id: Math.max(...mockMenuGroups.map(g => g.id)) + 1,
    position: mockMenuGroups.length + 1,
    items: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  return Promise.resolve(group);
};

export const updateMenuGroup = (groupId: number, data: Partial<MenuGroup>): Promise<MenuGroup> => {
  // In a real app, this would make an API call
  const group = mockMenuGroups.find(g => g.id === groupId);
  if (!group) {
    return Promise.reject(new Error('Group not found'));
  }
  
  const updatedGroup = { ...group, ...data, updatedAt: new Date().toISOString() };
  return Promise.resolve(updatedGroup);
};

export const deleteMenuGroup = (groupId: number): Promise<void> => {
  // In a real app, this would make an API call
  return Promise.resolve();
};

export const addMenuItem = (newItem: Omit<MenuItem, 'id' | 'position' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<MenuItem> => {
  // In a real app, this would make an API call
  const group = mockMenuGroups.find(g => g.id === newItem.groupId);
  if (!group) {
    return Promise.reject(new Error('Group not found'));
  }
  
  const item: MenuItem = {
    ...newItem,
    id: Math.max(0, ...mockMenuGroups.flatMap(g => g.items).map(i => i.id)) + 1,
    position: group.items.length + 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  return Promise.resolve(item);
};

export const updateMenuItem = (itemId: number, data: Partial<MenuItem>): Promise<MenuItem> => {
  // In a real app, this would make an API call
  const item = mockMenuGroups.flatMap(g => g.items).find(i => i.id === itemId);
  if (!item) {
    return Promise.reject(new Error('Item not found'));
  }
  
  const updatedItem = { ...item, ...data, updatedAt: new Date().toISOString() };
  return Promise.resolve(updatedItem);
};

export const deleteMenuItem = (itemId: number): Promise<void> => {
  // In a real app, this would make an API call
  return Promise.resolve();
};