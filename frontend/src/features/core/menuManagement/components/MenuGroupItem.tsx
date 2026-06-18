'use client';

import React from 'react';
import { Button, Dropdown, Tag, Typography } from 'antd';
import { EditOutlined, DeleteOutlined, MoreOutlined, MenuFoldOutlined } from '@ant-design/icons';
import { Draggable } from '@hello-pangea/dnd';
import { MenuGroup } from '../types';
import TheIcon from '@/common/components/@bdata/IconPicker/icons';
import { useTranslations } from 'next-intl';


const { Title } = Typography;

interface MenuGroupItemProps {
  group: MenuGroup;
  index: number;
  onEditGroup: (group: MenuGroup) => void;
  onDeleteGroup: (groupId: number) => void;
  onSelectGroup: (groupId: number) => void;
  onChangeMode: (groupId: MenuGroup) => void;
  selectedGroupId: number | null;
}

const MenuGroupItem: React.FC<MenuGroupItemProps> = ({
  group,
  index,
  onEditGroup,
  onDeleteGroup,
  onSelectGroup,
  onChangeMode,
  selectedGroupId,
}) => {
  const isSelected = selectedGroupId === group.id;

  const t = useTranslations("menu");

  const shouldAllowDelete = group.items.length > 0 ? false : true;
  
  return (
    <Draggable draggableId={`group-${group.id}`} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`mb-2 transition-all duration-200 ${snapshot.isDragging ? 'z-10' : ''}`}
        >
          <div
            className={`hover:border-blue-400 ${
              isSelected ? 'border-blue-500 shadow-md' : ''
            } ${snapshot.isDragging ? 'shadow-lg' : ''} p-3 rounded-md`}
            onClick={() => onSelectGroup(group.id)}
          >
            <div className="flex items-center">
              <div
                {...provided.dragHandleProps}
                className="mr-2 w-6 h-6 flex items-center justify-center cursor-grab text-gray-400 hover:text-gray-700"
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
              
              <div className="flex items-center flex-1">
                <span className="text-lg text-gray-600 mr-3">
                  {group.icon && <TheIcon name={group.icon as any} />}
                </span>
                <div>
                  <Title level={5} className="mb-0 truncate" style={{ maxWidth: '150px' }}>
                    {t(group.title) || "refresh page"}
                  </Title>
                  <div className="text-xs text-gray-500">
                    {group.items.length} items {group.mode === 1 && <Tag color="green">Single Mode</Tag>}
                  </div>
                </div>
              </div>
              
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'edit',
                      icon: <EditOutlined />,
                      label: 'Edit Group',
                      onClick: (e) => {
                        e.domEvent.stopPropagation();
                        onEditGroup(group);
                      },
                    },
                    {
                      key: 'change_mode',
                      icon: <MenuFoldOutlined />,
                      label: `${group.mode === 0 ? 'Set' : 'Unset'} Single Mode`,
                      onClick: (e) => {
                        e.domEvent.stopPropagation();
                        onChangeMode(group);
                      },
                    },
                    {
                      key: 'delete',
                      icon: <DeleteOutlined />,
                      label: 'Delete Group',
                      danger: true,
                      disabled: !shouldAllowDelete,
                      onClick: (e) => {
                        e.domEvent.stopPropagation();
                        onDeleteGroup(group.id);
                      },
                    }
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
                  onClick={(e) => e.stopPropagation()}
                />
              </Dropdown>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default MenuGroupItem;