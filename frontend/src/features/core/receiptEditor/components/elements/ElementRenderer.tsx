"use client";
import React, { useState } from 'react';
import { Button, Space, Tooltip } from 'antd';
import { Copy, Trash2, Edit, PencilRuler } from 'lucide-react';
import { ReceiptElement, ElementType } from '../../types';
import { useReceiptStore } from '../../store';
import {QRCodeSVG} from 'qrcode.react';
import Barcode from 'react-barcode';
import TableEditor from '../properties/TableEditor';

interface ElementRendererProps {
  element: ReceiptElement;
  preview?: boolean;
  previewMode?: 'data' | 'design';
  previewData?: Record<string, any>;
}

const ElementRenderer: React.FC<ElementRendererProps> = ({ 
  element, 
  preview = false,
  previewMode = 'design',
  previewData = {}
}) => {
  // console.log("DATA", element, previewData);
  const { 
    removeElement, 
    addElement, 
    selectElement,
    propertiesPanelCollapsed,
    togglePropertiesPanel 
  } = useReceiptStore();
  const [showTableEditor, setShowTableEditor] = useState(false);
  
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    addElement(element.type);
  };
  
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeElement(element.id);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectElement(element.id);
    if (propertiesPanelCollapsed) {
      togglePropertiesPanel();
    }
  };

  const getNestedValue = (obj: any, path: string) => {
    if (!path) return '';
    return path.split('.').reduce((acc, part) => acc && acc[part], obj) || '';
  };

  const renderWithDataBinding = (content: string) => {
    if (previewMode === 'design' || !element.dataBinding) return content;
    
    // Handle simple mustache-style templates
    return content.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
      return getNestedValue(previewData, path.trim()) || '';
    });
  };

  const renderElement = () => {
    switch (element.type) {
      case ElementType.HEADER:
      case ElementType.TEXT:
        return (
          <div 
            style={element.styles as React.CSSProperties}
            dangerouslySetInnerHTML={{ 
              __html: renderWithDataBinding(element.content) 
            }}
          />
        );
      
      case ElementType.IMAGE:
        const imageSrc = previewMode === 'data' && element.dataBinding
          ? getNestedValue(previewData, element.dataBinding)
          : element.content;
        
        return (
          <img 
            src={imageSrc || element.content}
            alt="Receipt image"
            style={element.styles as React.CSSProperties}
          />
        );
      
      case ElementType.TABLE:
        return (
          <>
            <table style={element.styles as React.CSSProperties}>
              <thead>
                <tr>
                  {(element.tableConfig?.columns || [
                    { title: 'Item', dataBinding: 'name', align: 'left' },
                    { title: 'Qty', dataBinding: 'qty', align: 'right' },
                    { title: 'Price', dataBinding: 'price', align: 'right' },
                    { title: 'Total', dataBinding: 'total', align: 'right' },
                  ]).map((col: any) => (
                    <th 
                      key={col.title} 
                      style={{ 
                        border: '1px solid #ddd', 
                        padding: '4px', 
                        textAlign: col.align || 'left',
                        width: col.width
                      }}
                    >
                      {col.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewMode === 'data' && previewData.services?.map((item: any, i: number) => (
                  <tr key={i}>
                    {(element.tableConfig?.columns || [
                      { dataBinding: 'name', align: 'left' },
                      { dataBinding: 'qty', align: 'right' },
                      { dataBinding: 'price', align: 'right' },
                      { dataBinding: 'total', align: 'right' },
                    ]).map((col: any, j: number) => (
                      <td 
                        key={j}
                        style={{ 
                          border: '1px solid #ddd', 
                          padding: '4px', 
                          textAlign: col.align || 'left'
                        }}
                      >
                        {getNestedValue(item, col.dataBinding)}
                      </td>
                    ))}
                  </tr>
                ))}
                {previewMode === 'design' && (
                  <tr>
                    {Array.from({ length: element.tableConfig?.columns?.length || 4 }).map((_, i) => (
                      <td 
                        key={i}
                        style={{ 
                          border: '1px solid #ddd', 
                          padding: '4px', 
                          textAlign: i > 0 ? 'right' : 'left'
                        }}
                      >
                        Sample {i === 0 ? 'Item' : i === 1 ? '1' : i === 2 ? '$10.00' : '$10.00'}
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
            {showTableEditor && (
              <TableEditor 
                element={element} 
                onClose={() => setShowTableEditor(false)} 
              />
            )}
          </>
        );
      
      case ElementType.BARCODE:
        const barcodeValue = previewMode === 'data' && element.dataBinding
          ? getNestedValue(previewData, element.dataBinding)
          : element.content || '123456789';

          console.log(element.styles);
        return (
          <div style={{ ...element.styles, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <Barcode
              value={barcodeValue}
              format="CODE128"
              width={1}
              height={element.styles.height ? parseInt(element.styles.height as string) : 50}
              displayValue={false}
              background="transparent"
              lineColor={element.styles.color || '#000000'}
            />
          </div>
        );
      
      case ElementType.QR_CODE:
        const qrValue = previewMode === 'data' && element.dataBinding
          ? getNestedValue(previewData, element.dataBinding)
          : element.content || 'https://example.com';

        return (
          <div style={element.styles as React.CSSProperties}>
            <QRCodeSVG
              value={qrValue}
              size={element.styles.width ? parseInt(element.styles.width as string) : 100}
              bgColor={element.styles.backgroundColor || '#ffffff'}
              fgColor={element.styles.color || '#000000'}
              level="H" // High error correction
            />
          </div>
        );
      
      case ElementType.DIVIDER:
        return <div style={element.styles as React.CSSProperties} />;
      
      case ElementType.SPACER:
        return <div style={element.styles as React.CSSProperties} />;
      
      default:
        return <div>Unknown element type</div>;
    }
  };
  
  if (preview) {
    return renderElement();
  }
  
  return (
    <div className="relative group">
      {renderElement()}
      <div className="element-actions opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 right-0 bg-white shadow-md rounded-md border border-gray-200 z-50">
        <Space size="small">
          <Tooltip title="Copy">
            <Button 
              icon={<Copy size={14} />}
              onClick={handleCopy}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button 
              icon={<Edit size={14} />}
              onClick={handleEdit}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button 
              danger
              icon={<Trash2 size={14} />}
              onClick={handleDelete}
            />
          </Tooltip>
          <Tooltip title="Preview">
            {!preview && ElementType.TABLE === element.type && (
              <Button 
                icon={<PencilRuler size={14} />}
                onClick={() => setShowTableEditor(true)}
              >
                Configure Table
              </Button>
            )}
          </Tooltip>
        </Space>
      </div>
    </div>
  );
};

export default ElementRenderer;