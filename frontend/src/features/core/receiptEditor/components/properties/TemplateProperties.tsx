"use client";
import React from 'react';
import { Form, Input, Select, InputNumber, Space, Typography, Divider } from 'antd';
import { useReceiptStore } from '../../store';
import { PaperSize } from '../../types';

const { Option } = Select;
const { Title } = Typography;

const TemplateProperties: React.FC = () => {
  const { currentTemplate, updateTemplate } = useReceiptStore();
  
  if (!currentTemplate) {
    return (
      <div className="p-4 text-center text-gray-500">
        No template selected
      </div>
    );
  }
  
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateTemplate({ name: e.target.value });
  };
  
  const handlePaperSizeChange = (value: string) => {
    const styles = { ...currentTemplate.styles };

    switch (value) {
      case PaperSize.THERMAL_44MM:
        styles.width = '44mm';
        break;
      case PaperSize.THERMAL_57MM:
        styles.width = '57mm';
        break;
      case PaperSize.THERMAL_58MM:
        styles.width = '58mm';
        break;
      case PaperSize.THERMAL_76MM:
        styles.width = '76mm';
        break;
      case PaperSize.THERMAL_78MM:
        styles.width = '78mm';
        break;
      case PaperSize.THERMAL_80MM:
        styles.width = '80mm';
        break;
      case PaperSize.A4:
        styles.width = '210mm';
        break;
      case PaperSize.LETTER:
        styles.width = '215.9mm';
        break;
      case PaperSize.LABEL50x30:
        styles.width = '50mm';
        styles.height = '30mm';
        break;
      case PaperSize.LABEL100x150:
        styles.width = '100mm';
        styles.height = '150mm';
        break;
      case PaperSize.CUSTOM:
        // keep current width/height
        break;
      default:
        break;
    }

    updateTemplate({ 
      paperSize: value,
      styles,
    });
  };
  
  const handleStyleChange = (property: string, value: string | number) => {
    updateTemplate({
      styles: {
        ...currentTemplate.styles,
        [property]: value,
      },
    });
  };
  
  return (
    <div className="p-1">
      <Form layout="vertical">
        <Title level={5}>Template Settings</Title>
        <Divider className="mt-2 mb-4" />
        
        <Form.Item label="Template Name">
          <Input
            value={currentTemplate.name}
            onChange={handleNameChange}
          />
        </Form.Item>
        
        <Form.Item label="Paper Size">
          <Select
            value={currentTemplate.paperSize}
            onChange={handlePaperSizeChange}
            className="w-full"
          >
            {Object.entries(PaperSize).map(([key, val]) => (
              <Option key={key} value={val}>
                {key.replace(/_/g, ' ')}
              </Option>
            ))}
          </Select>
        </Form.Item>
        
        {currentTemplate.paperSize === PaperSize.CUSTOM && (
          <Space className="w-full mb-4">
            <Form.Item label="Width" className="mb-0 flex-1">
              <Input
                value={currentTemplate.styles.width?.toString()}
                onChange={(e) => handleStyleChange('width', e.target.value)}
                addonAfter="mm"
              />
            </Form.Item>
            <Form.Item label="Height" className="mb-0 flex-1">
              <Input
                value={currentTemplate.styles.height?.toString()}
                onChange={(e) => handleStyleChange('height', e.target.value)}
                addonAfter="mm"
              />
            </Form.Item>
          </Space>
        )}
        
        <Title level={5} className="mt-4">Margins</Title>
        <div className="grid grid-cols-2 gap-4">
          <Form.Item label="Padding">
            <Input
              value={currentTemplate.styles.padding?.toString()}
              onChange={(e) => handleStyleChange('padding', e.target.value)}
              placeholder="8px"
            />
          </Form.Item>
        </div>
        
        <Title level={5} className="mt-4">Typography</Title>
        <div className="grid grid-cols-2 gap-4">
          <Form.Item label="Font Family">
            <Select
              value={currentTemplate.styles.fontFamily?.toString()}
              onChange={(value) => handleStyleChange('fontFamily', value)}
              className="w-full"
            >
              <Option value="monospace">Monospace</Option>
              <Option value="serif">Serif</Option>
              <Option value="sans-serif">Sans-serif</Option>
              <Option value="'Courier New', Courier, monospace">Courier</Option>
            </Select>
          </Form.Item>
          
          <Form.Item label="Base Font Size">
            <Input
              value={currentTemplate.styles.fontSize?.toString()}
              onChange={(e) => handleStyleChange('fontSize', e.target.value)}
              addonAfter={
                <Select 
                  defaultValue="pt" 
                  className="w-16"
                  onChange={(value) => {
                    const fontSize = currentTemplate.styles.fontSize?.toString().replace(/[^0-9.]/g, '') || '';
                    handleStyleChange('fontSize', `${fontSize}${value}`);
                  }}
                >
                  <Option value="pt">pt</Option>
                  <Option value="px">px</Option>
                </Select>
              }
            />
          </Form.Item>
          
          <Form.Item label="Line Height">
            <InputNumber
              value={currentTemplate.styles.lineHeight as number}
              onChange={(value) => handleStyleChange('lineHeight', value || 1)}
              className="w-full"
              min={0.5}
              max={3}
              step={0.1}
            />
          </Form.Item>
        </div>
      </Form>
    </div>
  );
};

export default TemplateProperties;
