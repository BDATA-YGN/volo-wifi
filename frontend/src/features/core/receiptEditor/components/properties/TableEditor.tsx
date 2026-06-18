"use client";
import React, { useState } from 'react';
import { Modal, Form, Input, Button, Space, Typography, Select, Divider } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, MenuOutlined } from '@ant-design/icons';
import { ReceiptElement } from '../../types';
import { useReceiptStore } from '../../store';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import './TableEditor.css'; // Optional: For custom styling

const { Text } = Typography;

interface TableColumn {
  key: string;
  title: string;
  dataBinding: string;
  align: 'left' | 'center' | 'right';
  width?: string;
}

interface TableEditorProps {
  element: ReceiptElement;
  onClose: () => void;
}

const TableEditor: React.FC<TableEditorProps> = ({ element, onClose }) => {
  const { updateElement } = useReceiptStore();
  const [form] = Form.useForm();
  const [editingKey, setEditingKey] = useState<string>('');
  const [editForm] = Form.useForm();
  const [columns, setColumns] = useState<TableColumn[]>(
    element.tableConfig?.columns || [
      { key: 'item', title: 'Item', dataBinding: 'name', align: 'left' },
      { key: 'qty', title: 'Qty', dataBinding: 'qty', align: 'right' },
      { key: 'price', title: 'Price', dataBinding: 'price', align: 'right' },
      { key: 'total', title: 'Total', dataBinding: 'total', align: 'right' },
    ]
  );

  const handleAddColumn = () => {
    form.validateFields().then(values => {
      const newColumn = {
        key: `column_${Date.now()}`,
        title: values.title,
        dataBinding: values.dataBinding,
        align: values.align,
        width: values.width,
      };
      setColumns([...columns, newColumn]);
      form.resetFields();
    });
  };

  const handleRemoveColumn = (key: string) => {
    setColumns(columns.filter(col => col.key !== key));
  };

  const handleEditColumn = (key: string) => {
    const columnToEdit = columns.find(col => col.key === key);
    if (columnToEdit) {
      editForm.setFieldsValue(columnToEdit);
      setEditingKey(key);
    }
  };

  const handleSaveEdit = () => {
    editForm.validateFields().then(values => {
      const updatedColumns = columns.map(col => {
        if (col.key === editingKey) {
          return {
            ...col,
            title: values.title,
            dataBinding: values.dataBinding,
            align: values.align,
            width: values.width,
          };
        }
        return col;
      });
      setColumns(updatedColumns);
      setEditingKey('');
      editForm.resetFields();
    });
  };

  const handleCancelEdit = () => {
    setEditingKey('');
    editForm.resetFields();
  };

  const handleSave = () => {
    updateElement(element.id, {
      tableConfig: { columns },
      styles: {
        ...element.styles,
        borderCollapse: 'collapse',
        width: '100%',
      },
    });
    onClose();
  };

  const isEditing = (record: TableColumn) => record.key === editingKey;

  const handleDragEnd = (result: any) => {
    if (!result.destination) {
      return;
    }
    const items = Array.from(columns);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setColumns(items);
  };

  return (
    <Modal
      title="Table Editor"
      open={true}
      onCancel={onClose}
      onOk={handleSave}
      width={950}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button key="save" type="primary" onClick={handleSave}>
          Save Table
        </Button>,
      ]}
    >
      <div className="mb-6">
        <Form form={editForm} component={false}>
          <DragDropContext onDragEnd={handleDragEnd}>
            <table className="ant-table">
              <thead className="ant-table-thead">
                <tr>
                  <th className="ant-table-cell" style={{ width: 50 }}>Sort</th>
                  <th className="ant-table-cell">Column Title</th>
                  <th className="ant-table-cell">Data Binding</th>
                  <th className="ant-table-cell">Alignment</th>
                  <th className="ant-table-cell">Width</th>
                  <th className="ant-table-cell">Action</th>
                </tr>
              </thead>
              <Droppable droppableId="table-columns">
                {(provided) => (
                  <tbody
                    className="ant-table-tbody"
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                  >
                    {columns.map((record, index) => (
                      <Draggable key={record.key} draggableId={record.key} index={index}>
                        {(provided) => (
                          <tr
                            className="ant-table-row"
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            <td className="ant-table-cell">
                              <MenuOutlined style={{ cursor: 'grab', color: '#999' }} />
                            </td>
                            <td className="ant-table-cell">
                              {isEditing(record) ? (
                                <Form.Item
                                  name="title"
                                  rules={[{ required: true, message: 'Please enter column title' }]}
                                  style={{ margin: 0 }}
                                >
                                  <Input />
                                </Form.Item>
                              ) : (
                                <Text>{record.title}</Text>
                              )}
                            </td>
                            <td className="ant-table-cell">
                              {isEditing(record) ? (
                                <Form.Item
                                  name="dataBinding"
                                  rules={[{ required: true, message: 'Please enter data binding path' }]}
                                  style={{ margin: 0 }}
                                >
                                  <Input />
                                </Form.Item>
                              ) : (
                                <Text>{record.dataBinding}</Text>
                              )}
                            </td>
                            <td className="ant-table-cell">
                              {isEditing(record) ? (
                                <Form.Item name="align" style={{ margin: 0 }}>
                                  <Select>
                                    <Select.Option value="left">Left</Select.Option>
                                    <Select.Option value="center">Center</Select.Option>
                                    <Select.Option value="right">Right</Select.Option>
                                  </Select>
                                </Form.Item>
                              ) : (
                                <Text>{record.align.charAt(0).toUpperCase() + record.align.slice(1)}</Text>
                              )}
                            </td>
                            <td className="ant-table-cell">
                              {isEditing(record) ? (
                                <Form.Item name="width" style={{ margin: 0 }}>
                                  <Input placeholder="e.g., 100px" />
                                </Form.Item>
                              ) : (
                                <Text>{record.width || '-'}</Text>
                              )}
                            </td>
                            <td className="ant-table-cell">
                              {isEditing(record) ? (
                                <Space>
                                  <Button type="primary" size="small" onClick={handleSaveEdit}>
                                    Save
                                  </Button>
                                  <Button size="small" onClick={handleCancelEdit}>
                                    Cancel
                                  </Button>
                                </Space>
                              ) : (
                                <Space>
                                  <Button
                                    icon={<EditOutlined />}
                                    size="small"
                                    onClick={() => handleEditColumn(record.key)}
                                  />
                                  <Button
                                    danger
                                    icon={<DeleteOutlined />}
                                    size="small"
                                    onClick={() => handleRemoveColumn(record.key)}
                                  />
                                </Space>
                              )}
                            </td>
                          </tr>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </tbody>
                )}
              </Droppable>
            </table>
          </DragDropContext>
        </Form>
      </div>

      <Divider titlePlacement="left">Add New Column</Divider>

      <Form form={form} layout="vertical">
        <div className="grid grid-cols-4 gap-4">
          <Form.Item
            name="title"
            label="Title"
            rules={[{ required: true, message: 'Please enter column title' }]}
          >
            <Input placeholder="e.g., Item" />
          </Form.Item>
          <Form.Item
            name="dataBinding"
            label="Data Binding"
            rules={[{ required: true, message: 'Please enter data binding path' }]}
          >
            <Input placeholder="e.g., name" />
          </Form.Item>
          <Form.Item name="align" label="Alignment" initialValue="left">
            <Select>
              <Select.Option value="left">Left</Select.Option>
              <Select.Option value="center">Center</Select.Option>
              <Select.Option value="right">Right</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="width" label="Width">
            <Input placeholder="e.g., 100px" />
          </Form.Item>
        </div>
        <Form.Item>
          <Button type="dashed" onClick={handleAddColumn} block icon={<PlusOutlined />}>
            Push Column
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default TableEditor;