"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Layout, Button, Typography, Empty, Spin, Menu, Space, Card } from "antd";
import { DragDropContext, Droppable, DropResult } from "@hello-pangea/dnd";
import { PlusOutlined, SaveOutlined, UndoOutlined } from "@ant-design/icons";
import { MenuGroup, MenuItem, MenuGroupFormData, MenuItemFormData } from "@/features/core/menuManagement/types";
import MenuGroupItem from "@/features/core/menuManagement/components/MenuGroupItem";
import MenuItemRow from "@/features/core/menuManagement/components/MenuItemRow";
import MenuGroupForm from "@/features/core/menuManagement/components/MenuGroupForm";
import MenuItemForm from "@/features/core/menuManagement/components/MenuItemForm";
import TheIcon from "@/common/components/@bdata/IconPicker/icons";
import { App } from "antd";
import { useRequest } from "ahooks";
import { updateMenuGroupPositions, updateMenuItemPositions } from "@/features/core/menuManagement/mockData";

import { useMenu } from "@/features/core/menuManagement/useMenu";
import { useAppTranslations } from "@/features/core/translations/useTranslation";
import { getClientLocale } from "@/utils/clientUtils";
import { useTranslations } from "next-intl";
import CommonHeader from "@/common/components/@bdata/CommonHeader";

const { Content } = Layout;

const MenuManagementPage: React.FC = () => {
  const [menuGroups, setMenuGroups] = useState<MenuGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<MenuGroup | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [groupFormVisible, setGroupFormVisible] = useState<boolean>(false);
  const [itemFormVisible, setItemFormVisible] = useState<boolean>(false);
  const [editingGroup, setEditingGroup] = useState<MenuGroup | undefined>(undefined);
  const [editingItem, setEditingItem] = useState<MenuItem | undefined>(undefined);
  const [originalMenuGroups, setOriginalMenuGroups] = useState<MenuGroup[]>([]);
  const { message } = App.useApp();

  const t = useTranslations("menu");

  const { fetchAllMenuGroups, createMenuGroup, updateMenuGroupData, createMenuItem, updateMenuItemData, deleteMenuItem, deleteMenuGroup, updateMenuStructure } = useMenu();
  const { getTranslationsByLocale, messages } = useAppTranslations();

  const locale = getClientLocale();

  const { loading, run: fetchMenuGroups } = useRequest(
    async () => {
      return fetchAllMenuGroups();
    },
    {
      manual: true,
      onSuccess: (data) => {
        const groups = data;
        setMenuGroups(groups);
        setOriginalMenuGroups(JSON.parse(JSON.stringify(groups)));

        if (groups.length > 0 && !selectedGroupId) {
          setSelectedGroupId(groups[0].id);
        }
      },
      onError: () => {
        message.error("Failed to fetch menu data");
      },
    }
  );

  useEffect(() => {
    fetchMenuGroups();
    getTranslationsByLocale(locale);
  }, [fetchMenuGroups, locale]);

  useEffect(() => {
    if (selectedGroupId) {
      const group = menuGroups.find((g) => g.id === selectedGroupId) || null;
      setSelectedGroup(group);
    } else {
      setSelectedGroup(null);
    }
  }, [menuGroups, selectedGroupId]);

  const handleSave = async () => {
    try {
      setSaving(true);
      console.log("Saving handlesave groups:", menuGroups);
      updateMenuStructure(menuGroups);
      message.success("Menu structure saved successfully");
    } catch (error) {
      message.error("Failed to save menu structure");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setMenuGroups(JSON.parse(JSON.stringify(originalMenuGroups)));
    message.info("Menu structure reset to last saved state");
  };

  const handleTransferItem = async (item: MenuItem, targetGroupId: number) => {
    if (item.groupId === targetGroupId) {
      return;
    }

    try {
      const sourceGroup = menuGroups.find((g) => g.id === item.groupId);
      const targetGroup = menuGroups.find((g) => g.id === targetGroupId);

      if (!sourceGroup || !targetGroup) {
        return;
      }

      const updatedItem = {
        key: item.key,
        title: item.title,
        icon: item.icon,
        url: item.url,
        position: targetGroup.items.length + 1,
        groupId: targetGroupId,
      };

      await updateMenuItemData(item.id, updatedItem);
      fetchMenuGroups();
    } catch (error) {
      message.error("Failed to transfer menu item");
      fetchMenuGroups();
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, type } = result;

    if (!destination) return;

    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    try {
      if (type === "group") {
        const newGroups = Array.from(menuGroups);
        const [removed] = newGroups.splice(source.index, 1);
        newGroups.splice(destination.index, 0, removed);

        const updatedGroups = newGroups.map((group, index) => ({
          ...group,
          position: index + 1,
        }));

        setMenuGroups(updatedGroups);
        await updateMenuGroupPositions(updatedGroups);
      } else if (type === "item" && selectedGroup) {
        const sourceGroupId = parseInt(source.droppableId.split("-")[1]);
        const destinationGroupId = parseInt(destination.droppableId.split("-")[1]);

        const sourceGroup = menuGroups.find((g) => g.id === sourceGroupId);
        const destinationGroup = menuGroups.find((g) => g.id === destinationGroupId);

        if (!sourceGroup || !destinationGroup) return;

        const newGroups = [...menuGroups];
        const sourceItems = [...sourceGroup.items];
        const [movedItem] = sourceItems.splice(source.index, 1);

        if (sourceGroupId === destinationGroupId) {
          sourceItems.splice(destination.index, 0, movedItem);
          const updatedItems = sourceItems.map((item, index) => ({
            ...item,
            position: index + 1,
          }));

          const updatedGroups = newGroups.map((group) => (group.id === sourceGroupId ? { ...group, items: updatedItems } : group));

          setMenuGroups(updatedGroups);
          await updateMenuItemPositions(sourceGroupId, updatedItems);
        } else {
          const destinationItems = [...destinationGroup.items];
          const updatedItem = { ...movedItem, groupId: destinationGroupId };
          destinationItems.splice(destination.index, 0, updatedItem);

          const updatedSourceItems = sourceItems.map((item, index) => ({
            ...item,
            position: index + 1,
          }));

          const updatedDestinationItems = destinationItems.map((item, index) => ({
            ...item,
            position: index + 1,
          }));

          const updatedGroups = newGroups.map((group) => {
            if (group.id === sourceGroupId) {
              return { ...group, items: updatedSourceItems };
            }
            if (group.id === destinationGroupId) {
              return { ...group, items: updatedDestinationItems };
            }
            return group;
          });

          setMenuGroups(updatedGroups);
          await Promise.all([updateMenuItemPositions(sourceGroupId, updatedSourceItems), updateMenuItemPositions(destinationGroupId, updatedDestinationItems)]);
        }
      }
    } catch (error) {
      message.error("Failed to update menu structure");
      fetchMenuGroups();
    }
  };

  const handleAddGroup = () => {
    setEditingGroup(undefined);
    setGroupFormVisible(true);
  };

  const handleEditGroup = (group: MenuGroup) => {
    setEditingGroup(group);
    setGroupFormVisible(true);
  };

  const handleDeleteGroup = async (groupId: number) => {
    try {
      await deleteMenuGroup(groupId);
      fetchMenuGroups();
    } catch (error) {
      message.error("Failed to delete menu group");
    }
  };

  const handleGroupFormSubmit = async (data: MenuGroupFormData) => {
    try {
      if (editingGroup) {
        await updateMenuGroupData(editingGroup.id, data);
      } else {
        await createMenuGroup(data);
      }
      fetchMenuGroups();
      setGroupFormVisible(false);
    } catch (error) {
      message.error(editingGroup ? "Failed to update menu group" : "Failed to add menu group");
    }
  };

  const handleAddItem = () => {
    if (!selectedGroupId) {
      message.warning("Please select a menu group first");
      return;
    }
    setEditingItem(undefined);
    setItemFormVisible(true);
  };

  const handleEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setItemFormVisible(true);
  };

  const handleDeleteItem = async (itemId: number) => {
    try {
      await deleteMenuItem(itemId);
      fetchMenuGroups();
    } catch (error) {
      message.error("Failed to delete menu item");
    }
  };

  const handleItemFormSubmit = async (data: MenuItemFormData) => {
    try {
      if (editingItem) {
        await updateMenuItemData(editingItem.id, data);
      } else {
        await createMenuItem(data?.groupId, data);
      }
      fetchMenuGroups();
      setItemFormVisible(false);
    } catch (error) {
      message.error(editingItem ? "Failed to update menu item" : "Failed to add menu item");
    }
  };

  const onChangeMode = async (group: MenuGroup) => {
    try {
      await updateMenuGroupData(group.id, {
        key: group.key,
        title: group.title,
        icon: group.icon,
        mode: group.mode === 0 ? 1 : 0,
      });
      message.success("Changed mode successfully");
      fetchMenuGroups();
    } catch (error) {
      message.error("Failed to set mode");
    }
  };

  return (
    <>
      <CommonHeader
        extras={
          <Space>
            <Button onClick={handleReset} disabled={loading || saving}>
              <UndoOutlined />
              Reset
            </Button>
            <Button type="primary" onClick={handleSave} loading={saving} disabled={loading}>
              <SaveOutlined />
              Save Changes
            </Button>
          </Space>
        }
      />
      <Card style={{ overflowY: "auto", height: "var(--content-body-height)", border: "none" }} styles={{ body: { padding: 0 } }}>
        <div className="flex flex-col lg:flex-row flex-1 min-h-0" style={{ minHeight: "80vh" }}>
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="w-full lg:w-1/4 flex flex-col min-h-0 rounded-lg shadow-sm">
              <div className="p-4 flex justify-between items-center">
                <h3 className="text-lg font-medium">Menu Groups</h3>
                <Button type="primary" onClick={handleAddGroup}>
                  <PlusOutlined />
                  Add Group
                </Button>
              </div>
              <div className="flex-1 overflow-auto p-4">
                {loading ? (
                  <div className="flex justify-center items-center py-12">
                    <Spin size="large" />
                  </div>
                ) : menuGroups.length === 0 ? (
                  <Empty description="No menu groups found" className="py-12" />
                ) : (
                  <Droppable droppableId="menu-groups" type="group">
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.droppableProps}>
                        {menuGroups.map((group, index) => (
                          <MenuGroupItem
                            key={group.id}
                            group={group}
                            index={index}
                            onEditGroup={handleEditGroup}
                            onDeleteGroup={handleDeleteGroup}
                            onSelectGroup={setSelectedGroupId}
                            selectedGroupId={selectedGroupId}
                            onChangeMode={onChangeMode}
                          />
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                )}
              </div>
            </div>

            <div className="w-full lg:w-2/4 flex flex-col min-h-0 rounded-lg shadow-sm">
              <div className="p-4 flex justify-between items-center">
                <h3 className="text-lg font-medium">{selectedGroup ? t(selectedGroup.title) : "Menu Items"}</h3>
                <Button type="primary" onClick={handleAddItem} disabled={!selectedGroupId}>
                  <PlusOutlined />
                  Add Item
                </Button>
              </div>
              <div className="flex-1 overflow-auto p-4">
                {loading ? (
                  <div className="flex justify-center items-center py-12">
                    <Spin size="large" />
                  </div>
                ) : !selectedGroup ? (
                  <Empty description="Select a menu group to view its items" className="py-12" />
                ) : selectedGroup.items.length === 0 ? (
                  <Empty description="No menu items found in this group" className="py-12" />
                ) : (
                  <Droppable droppableId={`items-${selectedGroup.id}`} type="item">
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.droppableProps}>
                        {selectedGroup.items.map((item, index) => (
                          <MenuItemRow key={item.id} item={item} index={index} onEditItem={handleEditItem} onDeleteItem={handleDeleteItem} onTransferItem={handleTransferItem} menuGroups={menuGroups} />
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                )}
              </div>
            </div>
          </DragDropContext>

          <div className="w-full lg:w-1/4 flex flex-col min-h-0 rounded-lg shadow-sm">
            <div className="p-4">
              <h3 className="text-lg font-medium">Menu Preview</h3>
            </div>
            <div className="flex-1 overflow-auto">
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <Spin size="large" />
                </div>
              ) : menuGroups.length === 0 ? (
                <Empty description="No menu items to preview" />
              ) : (
                <Menu
                  mode="inline"
                  className="border-r-0"
                  style={{ width: "100%", padding: 0 }}
                  items={menuGroups.map((group) => ({
                    key: group.key,
                    icon: group.icon && <TheIcon name={group.icon as any} />,
                    label: t(group.title),
                    children: group.items.map((item) => ({
                      key: item.key,
                      icon: item.icon && <TheIcon name={item.icon as any} />,
                      label: t(item.title),
                    })),
                  }))}
                />
              )}
            </div>
          </div>

          <MenuGroupForm
            visible={groupFormVisible}
            onCancel={() => setGroupFormVisible(false)}
            messages={messages}
            onSubmit={handleGroupFormSubmit}
            initialValues={editingGroup}
            title={editingGroup ? "Edit Menu Group" : "Add Menu Group"}
          />

          <MenuItemForm
            visible={itemFormVisible}
            onCancel={() => setItemFormVisible(false)}
            onSubmit={handleItemFormSubmit}
            initialValues={editingItem}
            title={editingItem ? "Edit Menu Item" : "Add Menu Item"}
            groupId={selectedGroupId || 0}
            messages={messages}
          />
        </div>
      </Card>
    </>
  );
};

export default MenuManagementPage;
