"use client";
import React from 'react';
import { Form, Input, InputNumber, Select, Collapse, Divider, Typography } from 'antd';
import { ReceiptElement, ElementType } from '../../types';
import { useReceiptStore } from '../../store';

const { Option } = Select;
const { Title } = Typography;

interface ElementPropertiesProps {
  element: ReceiptElement;
}

const ElementProperties: React.FC<ElementPropertiesProps> = ({ element }) => {
  const { updateElement } = useReceiptStore();
  
  const handleContentChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    updateElement(element.id, { content: e.target.value });
  };
  
  const handleStyleChange = (property: string, value: string | number) => {
    updateElement(element.id, {
      styles: {
        ...element.styles,
        [property]: value,
      },
    });
  };
  
  const handleDataBindingChange = (value: string) => {
    updateElement(element.id, { dataBinding: value });
  };
  
  const renderContentField = () => {
    switch (element.type) {
      case ElementType.HEADER:
      case ElementType.TEXT:
        return (
          <Form.Item label="Content">
            <Input.TextArea 
              value={element.content} 
              onChange={handleContentChange}
              rows={3}
            />
          </Form.Item>
        );
      
      case ElementType.IMAGE:
        return (
          <Form.Item label="Image URL">
            <Input 
              value={element.content} 
              onChange={handleContentChange}
              placeholder="https://example.com/image.jpg"
            />
          </Form.Item>
        );
      
      case ElementType.BARCODE:
      case ElementType.QR_CODE:
        return (
          <Form.Item label="Code Value">
            <Input 
              value={element.content} 
              onChange={handleContentChange}
            />
          </Form.Item>
        );
      
      default:
        return null;
    }
  };

  // Define collapse items
  const collapseItems = [
    {
      key: 'dimensions',
      label: 'Dimensions',
      children: (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item label="Width">
              <Input
                value={element.styles.width?.toString()}
                onChange={(e) => handleStyleChange('width', e.target.value)}
                addonAfter={
                  <Select 
                    defaultValue="%" 
                    className="w-20"
                    onChange={(value) => {
                      const width = element.styles.width?.toString().replace(/[^0-9.]/g, '') || '';
                      handleStyleChange('width', `${width}${value}`);
                    }}
                  >
                    <Option value="%">%</Option>
                    <Option value="px">px</Option>
                    <Option value="mm">mm</Option>
                  </Select>
                }
              />
            </Form.Item>
            
            <Form.Item label="Height">
              <Input
                value={element.styles.height?.toString()}
                onChange={(e) => handleStyleChange('height', e.target.value)}
                addonAfter={
                  <Select 
                    defaultValue="%" 
                    className="w-20"
                    onChange={(value) => {
                      const height = element.styles.height?.toString().replace(/[^0-9.]/g, '') || '';
                      handleStyleChange('height', `${height}${value}`);
                    }}
                  >
                    <Option value="%">%</Option>
                    <Option value="px">px</Option>
                    <Option value="mm">mm</Option>
                  </Select>
                }
              />
            </Form.Item>
          </div>
          
          <Title level={5} className="mt-4 mb-2">Margin</Title>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item label="Top">
              <Input
                value={element.styles.marginTop?.toString()}
                onChange={(e) => handleStyleChange('marginTop', e.target.value)}
                addonAfter={
                  <Select 
                    defaultValue="px" 
                    className="w-20"
                    onChange={(value) => {
                      const margin = element.styles.marginTop?.toString().replace(/[^0-9.]/g, '') || '';
                      handleStyleChange('marginTop', `${margin}${value}`);
                    }}
                  >
                    <Option value="%">%</Option>
                    <Option value="px">px</Option>
                    <Option value="mm">mm</Option>
                  </Select>
                }
              />
            </Form.Item>
            
            <Form.Item label="Bottom">
              <Input
                value={element.styles.marginBottom?.toString()}
                onChange={(e) => handleStyleChange('marginBottom', e.target.value)}
                addonAfter={
                  <Select 
                    defaultValue="px" 
                    className="w-20"
                    onChange={(value) => {
                      const margin = element.styles.marginBottom?.toString().replace(/[^0-9.]/g, '') || '';
                      handleStyleChange('marginBottom', `${margin}${value}`);
                    }}
                  >
                    <Option value="%">%</Option>
                    <Option value="px">px</Option>
                    <Option value="mm">mm</Option>
                  </Select>
                }
              />
            </Form.Item>
            
            <Form.Item label="Left">
              <Input
                value={element.styles.marginLeft?.toString()}
                onChange={(e) => handleStyleChange('marginLeft', e.target.value)}
                addonAfter={
                  <Select 
                    defaultValue="px" 
                    className="w-20"
                    onChange={(value) => {
                      const margin = element.styles.marginLeft?.toString().replace(/[^0-9.]/g, '') || '';
                      handleStyleChange('marginLeft', `${margin}${value}`);
                    }}
                  >
                    <Option value="%">%</Option>
                    <Option value="px">px</Option>
                    <Option value="mm">mm</Option>
                  </Select>
                }
              />
            </Form.Item>
            
            <Form.Item label="Right">
              <Input
                value={element.styles.marginRight?.toString()}
                onChange={(e) => handleStyleChange('marginRight', e.target.value)}
                addonAfter={
                  <Select 
                    defaultValue="px" 
                    className="w-20"
                    onChange={(value) => {
                      const margin = element.styles.marginRight?.toString().replace(/[^0-9.]/g, '') || '';
                      handleStyleChange('marginRight', `${margin}${value}`);
                    }}
                  >
                    <Option value="%">%</Option>
                    <Option value="px">px</Option>
                    <Option value="mm">mm</Option>
                  </Select>
                }
              />
            </Form.Item>
          </div>
        </>
      ),
    },
    {
      key: 'typography',
      label: 'Typography',
      children: (
        <div className="grid grid-cols-2 gap-4">
          <Form.Item label="Font Size">
            <Input
              value={element.styles.fontSize?.toString()}
              onChange={(e) => handleStyleChange('fontSize', e.target.value)}
              addonAfter={
                <Select 
                  defaultValue="%" 
                  className="w-20"
                  onChange={(value) => {
                    const fontSize = element.styles.fontSize?.toString().replace(/[^0-9.]/g, '') || '';
                    handleStyleChange('fontSize', `${fontSize}${value}`);
                  }}
                >
                  <Option value="%">%</Option>
                  <Option value="px">px</Option>
                  <Option value="pt">pt</Option>
                </Select>
              }
            />
          </Form.Item>
          
          <Form.Item label="Font Weight">
            <Select
              value={element.styles.fontWeight?.toString()}
              onChange={(value) => handleStyleChange('fontWeight', value)}
              className="w-full"
            >
              <Option value="normal">Normal</Option>
              <Option value="bold">Bold</Option>
            </Select>
          </Form.Item>
          
          <Form.Item label="Text Align">
            <Select
              value={element.styles.textAlign?.toString()}
              onChange={(value) => handleStyleChange('textAlign', value)}
              className="w-full"
            >
              <Option value="left">Left</Option>
              <Option value="center">Center</Option>
              <Option value="right">Right</Option>
            </Select>
          </Form.Item>
          
          <Form.Item label="Line Height">
            <InputNumber
              value={element.styles.lineHeight as number}
              onChange={(value) => handleStyleChange('lineHeight', value || 1)}
              className="w-full"
              min={0.5}
              max={3}
              step={0.1}
            />
          </Form.Item>
        </div>
      ),
    },
    {
      key: 'styling',
      label: 'Styling',
      children: (
        <div className="grid grid-cols-2 gap-4">
          <Form.Item label="Background">
            <Input
              type="color"
              value={element.styles.backgroundColor?.toString() || '#ffffff'}
              onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
              className="w-full"
            />
          </Form.Item>
          
          <Form.Item label="Text Color">
            <Input
              type="color"
              value={element.styles.color?.toString() || '#000000'}
              onChange={(e) => handleStyleChange('color', e.target.value)}
              className="w-full"
            />
          </Form.Item>
          
          <Form.Item label="Border">
            <Input
              value={element.styles.border?.toString()}
              onChange={(e) => handleStyleChange('border', e.target.value)}
              placeholder="1px solid #000"
            />
          </Form.Item>
          
          <Form.Item label="Border Radius">
            <Input
              value={element.styles.borderRadius?.toString()}
              onChange={(e) => handleStyleChange('borderRadius', e.target.value)}
              placeholder="0"
              addonAfter="px"
            />
          </Form.Item>
        </div>
      ),
    },
  ];

  return (
    <div className="p-1">
      <Form layout="vertical">
        <Title level={5}>{element.type.charAt(0).toUpperCase() + element.type.slice(1)} Element</Title>
        <Divider className="mt-2 mb-4" />
        
        {renderContentField()}
        
        <Form.Item label="Data Binding">
          <Input 
            value={element.dataBinding}
            onChange={(e) => handleDataBindingChange(e.target.value)}
            placeholder="e.g., business.name"
          />
        </Form.Item>
        
        <Collapse
          defaultActiveKey={['dimensions', 'typography']}
          className="mb-4"
          items={collapseItems}
        />
      </Form>
    </div>
  );
};

export default ElementProperties;