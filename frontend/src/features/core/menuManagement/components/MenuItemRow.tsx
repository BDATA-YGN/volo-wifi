'use client';

import React, { useState } from 'react';
import { Button, Dropdown, Typography, Select, Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined, MoreOutlined, SwapOutlined } from '@ant-design/icons';
import { Draggable } from '@hello-pangea/dnd';
import { MenuItem, MenuGroup } from '../types';
import TheIcon from '@/common/components/@bdata/IconPicker/icons';
import { useTranslations } from 'next-intl';

const { Text } = Typography;

interface MenuItemRowProps {
  item: MenuItem;
  index: number;
  onEditItem: (item: MenuItem) => void;
  onDeleteItem: (itemId: number) => void;
  onTransferItem: (item: MenuItem, targetGroupId: number) => void;
  menuGroups: MenuGroup[];
}

const MenuItemRow: React.FC<MenuItemRowProps> = ({
  item,
  index,
  onEditItem,
  onDeleteItem,
  onTransferItem,
  menuGroups,
}) => {
  const [isTransferring, setIsTransferring] = useState(false);

  const t = useTranslations("menu");

  const handleTransfer = (targetGroupId: number) => {
    onTransferItem(item, targetGroupId);
    setIsTransferring(false);
  };

  return (
    <Draggable draggableId={`item-${item.id}`} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`flex items-center p-3 mb-2 rounded-md ${
            snapshot.isDragging ? 'shadow-lg border-blue-400' : 'hover:border-blue-300'
          } transition-all duration-200`}
        >
          <div
            {...provided.dragHandleProps}
            className="mr-3 w-6 h-6 flex items-center justify-center cursor-grab text-gray-400 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="5" r="1" />
              <circle cx="9" cy="12" r="1" />
              <circle cx="9" cy="19" r="1" />
              <circle cx="15" cy="5" r="1" />
              <circle cx="15" cy="12" r="1" />
              <circle cx="15" cy="19" r="1" />
            </svg>
          </div>
          
          <span className="text-lg text-gray-600 mr-3">
            {item.icon && <TheIcon name={item.icon as any} />}
          </span>
          
          <div className="flex-1">
            <Text strong className="block">{t(item.title) || "refresh page"}</Text>
            <div className="flex items-center text-xs text-gray-500">
              <span className="mr-3">key: {item.key}</span>
              {item.url && <span>url: {item.url}</span>}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isTransferring ? (
              <Select
                style={{ width: 200 }}
                placeholder="Select target group"
                onChange={handleTransfer}
                onBlur={() => setIsTransferring(false)}
                autoFocus
                options={menuGroups
                  .filter(group => group.id !== item.groupId)
                  .map(group => ({
                    label: t(group.title) || "refresh page",
                    value: group.id,
                  }))}
              />
            ) : (
              <Button
                type="text"
                icon={<SwapOutlined />}
                size="small"
                className="text-gray-500 hover:text-blue-500"
                onClick={() => setIsTransferring(true)}
              />
            )}
            
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'edit',
                    icon: <EditOutlined />,
                    label: 'Edit Item',
                    onClick: () => onEditItem(item),
                  },
                  {
                    key: 'delete',
                    icon: <DeleteOutlined />,
                    danger: true,
                    label: (
                      <Popconfirm
                        title="Are you sure to delete this menu item?"
                        onConfirm={() => {
                          onDeleteItem(item.id);
                        }}
                        okText="Yes"
                        cancelText="No"
                        placement="topRight"
                      >
                        <a onClick={(e) => e.preventDefault()}>Delete Item</a>
                      </Popconfirm>
                    ),
                    onClick: (e) => e.domEvent.stopPropagation(), // Prevent Dropdown from closing
                  },
                ],
              }}
              trigger={['click']}
              placement="bottomRight"
            >
              <Button
                type="text"
                icon={<MoreOutlined />}
                size="small"
                className="text-gray-500 hover:text-blue-500"
              />
            </Dropdown>
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default MenuItemRow;