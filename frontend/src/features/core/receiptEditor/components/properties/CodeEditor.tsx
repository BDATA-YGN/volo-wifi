"use client";
import React from 'react';
import dynamic from 'next/dynamic';
import { Tabs, Button, Typography, Divider, Space, Spin } from 'antd';
import { useReceiptStore } from '../../store';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <Spin />
    </div>
  ),
});

const { TabPane } = Tabs;
const { Title } = Typography;

const CodeEditor: React.FC = () => {
  const { currentTemplate, selectedElement, updateElement, updateTemplate } = useReceiptStore();
  
  const [cssCode, setCssCode] = React.useState<string>('');
  
  React.useEffect(() => {
    if (selectedElement) {
      const cssProps = Object.entries(selectedElement.styles || {})
        .map(([key, value]) => `${formatCSSProperty(key)}: ${value};`)
        .join('\n');
      
      setCssCode(cssProps);
    } else if (currentTemplate) {
      const cssProps = Object.entries(currentTemplate.styles || {})
        .map(([key, value]) => `${formatCSSProperty(key)}: ${value};`)
        .join('\n');
      
      setCssCode(cssProps);
    }
  }, [selectedElement, currentTemplate]);
  
  const formatCSSProperty = (property: string): string => {
    // Convert camelCase to kebab-case
    return property.replace(/([A-Z])/g, '-$1').toLowerCase();
  };
  
  const parseCSSProperties = (css: string): React.CSSProperties => {
    const styleObject: Record<string, string> = {};
    
    css.split(';').forEach(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;
      
      const [property, value] = trimmedLine.split(':').map(part => part.trim());
      if (!property || !value) return;
      
      // Convert kebab-case to camelCase
      const camelCaseProperty = property.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      styleObject[camelCaseProperty] = value;
    });
    
    return styleObject as React.CSSProperties;
  };
  
  const handleCSSChange = (value: string | undefined) => {
    setCssCode(value || '');
  };
  
  const applyChanges = () => {
    const styleObject = parseCSSProperties(cssCode);
    
    if (selectedElement) {
      updateElement(selectedElement.id, { styles: styleObject });
    } else if (currentTemplate) {
      updateTemplate({ styles: styleObject });
    }
  };
  
  return (
    <div className="p-1">
      <Space className="w-full" orientation="vertical">
        <Title level={5}>
          {selectedElement ? 'Element CSS' : 'Template CSS'}
        </Title>
        <Divider className="mt-2 mb-4" />
        
        <div className="mb-4">
          <p className="text-sm text-gray-500">
            Edit the CSS properties directly. Use standard CSS syntax.
          </p>
        </div>
        
        <div className="h-[500px] border border-gray-200 rounded">
          <MonacoEditor
            language="css"
            theme="vs-light"
            value={cssCode}
            onChange={handleCSSChange}
            options={{
              minimap: { enabled: false },
              fontSize: 12,
              wordWrap: 'on',
              scrollBeyondLastLine: false,
            }}
          />
        </div>
        
        <Button 
          type="primary" 
          onClick={applyChanges}
          className="mt-4"
        >
          Apply Changes
        </Button>
      </Space>
    </div>
  );
};

export default CodeEditor;