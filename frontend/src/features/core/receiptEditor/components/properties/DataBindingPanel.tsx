"use client";
import React from 'react';
import dynamic from 'next/dynamic';
import { Form, Input, Button, Typography, Divider, Space, Spin } from 'antd';
import { useReceiptStore } from '../../store';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <Spin />
    </div>
  ),
});
import * as MainUseCase from "@/features/core/receiptEditor/useReceipt";
import yaml from 'js-yaml';
import { NotificationProvider, useNotify } from "@/common/provider/NotificationProvider";

const { Title } = Typography;

const DataBindingPanel: React.FC = () => {
  const notify = useNotify();
  const { previewData, currentTemplate, updatePreviewData } = useReceiptStore();
  const [yamlString, setYamlString] = React.useState<string>('');
  const useCaseSource = MainUseCase.useReceipt();
  const updateFn = useCaseSource.updateReceipt;
  
  React.useEffect(() => {
    try {
      const yamlData = yaml.dump(previewData, { indent: 2 });
      setYamlString(yamlData);
    } catch (error) {
      console.error('Error converting to YAML:', error);
    }
  }, [previewData]);
  
  const handleYamlChange = (value: string | undefined) => {
    setYamlString(value || '');
  };
  
  const applyChanges = () => {
    try {
      const parsedData = yaml.load(yamlString);
      updatePreviewData(parsedData as Record<string, any>);
      updateFn({id: currentTemplate?.id || "", payload: { preview: parsedData }});
      notify({
        message: "Success!",
        description: `Saved data structure for ${currentTemplate?.name}🎉`,
        type: "success",
      })
    } catch (error) {
      console.error('Error parsing YAML:', error);
    }
  };
  
  return (
    <div className="p-1">
      <Form layout="vertical">
        <Space className="w-full" orientation="vertical">
          <Title level={5}>Data Binding</Title>
          <Divider className="mt-2 mb-4" />
          
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-2">
              Edit the YAML below to change the data used in the receipt preview. 
              Reference these fields in your elements using the data binding syntax.
            </p>
          </div>
          
          <div className="h-[400px] border border-gray-200 rounded">
            <MonacoEditor
              language="yaml"
              theme="vs-light"
              value={yamlString}
              onChange={handleYamlChange}
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
      </Form>
    </div>
  );
};

export default DataBindingPanel;