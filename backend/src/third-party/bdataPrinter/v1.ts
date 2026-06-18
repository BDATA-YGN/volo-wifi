import { ReceiptElement, ElementType } from './types';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { createCanvas } from 'canvas';
import fetch from 'node-fetch';

interface GenerateReceiptHtmlProps {
  elements: ReceiptElement[];
  previewData?: Record<string, any>;
  record?: any;
}

const getNestedValue = (obj: any, path: string): string => {
  if (!path) return '';
  const result = path.split('.').reduce((acc, part) => acc?.[part], obj);
  return result !== undefined && result !== null ? String(result) : '';
};


const escapeHtml = (unsafe: any): string => {
  const safeString = String(unsafe ?? '');
  return safeString
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const stylesToString = (styles: any): string => {
  return Object.entries(styles)
    .map(([key, value]) => {
      const cssKey = key.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
      return `${cssKey}: ${value};`;
    })
    .join(' ');
};

const generateBarcodeBase64 = async (value: string, styles: any): Promise<string> => {
  const canvas = createCanvas(200, parseInt(styles.height as string) || 50);
  JsBarcode(canvas, value, {
    format: 'CODE128',
    width: 1,
    height: parseInt(styles.height as string) || 50,
    displayValue: false,
    background: 'transparent',
    lineColor: styles.color || '#000000',
  });
  return canvas.toDataURL('image/png');
};

const generateQRCodeBase64 = async (value: string, styles: any): Promise<string> => {
  const size = parseInt(styles.width as string) || 100;
  return await QRCode.toDataURL(value, {
    width: size,
    color: {
      dark: styles.color || '#000000',
      light: styles.backgroundColor || '#ffffff',
    },
    errorCorrectionLevel: 'H',
  });
};

const generateImageBase64 = async (src: string): Promise<string> => {
  // Check if src is already a base64 data URL
  if (src.startsWith('data:image/')) {
    return src;
  }
  // Handle placeholder or invalid image source
  if (!src || src === '/placeholder.svg') {
    // Return a simple 1x1 transparent pixel as a fallback
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  }
  try {
    const response = await fetch(src);
    if (!response.ok) throw new Error('Failed to fetch image');
    const buffer = await response.buffer();
    const mimeType = response.headers.get('content-type') || 'image/png';
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  } catch (error) {
    console.error('Error fetching image:', error);
    // Fallback to transparent pixel
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  }
};

export const generateReceiptHtml = async ({ elements, previewData = {}, record = {} }: GenerateReceiptHtmlProps): Promise<string> => {
  const renderElementHtml = async (element: ReceiptElement): Promise<string> => {
    const renderWithDataBinding = (content: string): string => {
      if (!element.dataBinding) return escapeHtml(content);
      return content.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
        return escapeHtml(getNestedValue(previewData, path.trim()));
      });
    };

    switch (element.type) {
      case ElementType.HEADER:
      case ElementType.TEXT:
        return `<div style="${stylesToString(element.styles)}">${renderWithDataBinding(element.content)}</div>`;

      case ElementType.IMAGE:
        const imageSrc = element.dataBinding
          ? getNestedValue(previewData, element.dataBinding) || element.content
          : element.content;
        const imageBase64 = await generateImageBase64(imageSrc);
        return `<img src="${imageBase64}" alt="Receipt image" style="${stylesToString(element.styles)}" />`;

      case ElementType.TABLE:
        const columns = element.tableConfig?.columns || [
          { title: 'Description', dataBinding: 'description', align: 'left' },
          { title: 'Code', dataBinding: 'code', align: 'left' },
          { title: 'Hours/Qty', dataBinding: 'hours', align: 'right' },
          { title: 'Rate/Price', dataBinding: 'rate', align: 'right' },
          { title: 'Total', dataBinding: 'total', align: 'right' },
        ];

        const tableStyle = stylesToString({ ...element.styles, borderCollapse: 'collapse' });
        let tableHtml = `<table style="${tableStyle}"><thead><tr>`;
        columns.forEach(col => {
          const thStyle = `border: 1px solid #ddd; padding: 4px; text-align: ${col.align || 'left'};${'width' in col && col.width ? ` width: ${col.width};` : ''}`;
          tableHtml += `<th style="${thStyle}">${escapeHtml(col.title)}</th>`;
        });
        tableHtml += '</tr></thead><tbody>';

        if (previewData.services?.length) {
          previewData.services.forEach((item: any) => {
            tableHtml += '<tr>';
            columns.forEach(col => {
              const tdStyle = `border: 1px solid #ddd; padding: 4px; text-align: ${col.align || 'left'}`;
              let value = getNestedValue(item, col.dataBinding);
              if (col.dataBinding === 'hours') {
                value = item.hours || item.qty || '';
              } else if (col.dataBinding === 'rate') {
                value = item.rate || item.price || '';
              }
              tableHtml += `<td style="${tdStyle}">${escapeHtml(value)}</td>`;
            });
            tableHtml += '</tr>';
          });
        } else {
          tableHtml += '<tr>';
          columns.forEach((_, i) => {
            const tdStyle = `border: 1px solid #ddd; padding: 4px; text-align: ${i > 1 ? 'right' : 'left'}`;
            const sampleContent = i === 0 ? 'Sample Item' : i === 1 ? 'CODE-001' : i === 2 ? '1' : i === 3 ? '$10.00' : '$10.00';
            tableHtml += `<td style="${tdStyle}">${sampleContent}</td>`;
          });
          tableHtml += '</tr>';
        }
        tableHtml += '</tbody></table>';
        return tableHtml;

      case ElementType.BARCODE:
        const barcodeValue = element.dataBinding
          ? getNestedValue(previewData, element.dataBinding) || element.content || '123456789'
          : element.content || '123456789';
        const barcodeBase64 = await generateBarcodeBase64(barcodeValue, element.styles);
        return `<div style="${stylesToString({ ...element.styles, display: 'flex', alignItems: 'center', justifyContent: 'center' })}"><img src="${barcodeBase64}" alt="Barcode" /></div>`;

      case ElementType.QR_CODE:
        const qrValue = element.dataBinding
          ? getNestedValue(previewData, element.dataBinding) || element.content || 'https://example.com'
          : element.content || 'https://example.com';
        const qrBase64 = await generateQRCodeBase64(qrValue, element.styles);
        return `<div style="${stylesToString(element.styles)}"><img src="${qrBase64}" alt="QR Code" /></div>`;

      case ElementType.DIVIDER:
      case ElementType.SPACER:
        return `<div style="${stylesToString(element.styles)}"></div>`;

      default:
        return `<div>Unknown element type</div>`;
    }
  };

  const htmlContent = await Promise.all(elements.map(element => renderElementHtml(element))).then(results => results.join(''));
  // {"color": "#000", "width": "210mm", "padding": "5mm", "fontSize": "9pt", "minHeight": "100%", "fontFamily": "monospace", "lineHeight": "1.2", "backgroundColor": "#fff"}
  const styles = record?.styles;
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { 
          font-family: ${styles.fontFamily}; 
          margin: 0; 
          padding: ${styles.padding}; 
          width: ${styles.width}; 
          color: ${styles.color}; 
          background-color: ${styles.backgroundColor}; 
          font-size: ${styles.fontSize}; 
          line-height: ${styles.lineHeight}; 
          min-height: ${styles.minHeight};
        }
        img { max-width: 100%; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 4px; }
      </style>
    </head>
    <body>
      ${htmlContent}
    </body>
    </html>
  `;
};