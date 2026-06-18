import { v4 as uuidv4 } from 'uuid';
import { ReceiptElement, ElementType, ReceiptTemplate, PaperSize } from './types';


// Create POS Receipt Template Elements
const createPOSElements = (): ReceiptElement[] => [
  {
    id: uuidv4(),
    type: ElementType.IMAGE,
    content: '/placeholder.svg',
    styles: {
      width: '60%',
      margin: '0 auto 10px',
      display: 'block',
    },
    dataBinding: 'business.logo',
  },
  {
    id: uuidv4(),
    type: ElementType.HEADER,
    content: '{{business.name}}',
    styles: {
      fontSize: '130%',
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: '5px',
    },
    dataBinding: 'business.name',
  },
  {
    id: uuidv4(),
    type: ElementType.TEXT,
    content: '{{business.address}}\n{{business.phone}}',
    styles: {
      textAlign: 'center',
      marginBottom: '10px',
    },
    dataBinding: 'business.address',
  },
  {
    id: uuidv4(),
    type: ElementType.DIVIDER,
    content: '',
    styles: {
      borderTop: '1px dashed #000',
      margin: '10px 0',
    },
  },
  {
    id: uuidv4(),
    type: ElementType.TEXT,
    content: 'Receipt #: {{transaction.id}}\nDate: {{transaction.date}}\nTime: {{transaction.time}}\nCashier: {{transaction.cashier}}',
    styles: {
      fontFamily: 'monospace',
      whiteSpace: 'pre-line',
      marginBottom: '10px',
    },
    dataBinding: 'transaction',
  },
  {
    id: uuidv4(),
    type: ElementType.DIVIDER,
    content: '',
    styles: {
      borderTop: '1px dashed #000',
      margin: '10px 0',
    },
  },
  {
    id: uuidv4(),
    type: ElementType.TABLE,
    content: '',
    styles: {
      width: '100%',
      borderCollapse: 'collapse',
      marginBottom: '10px',
    },
    dataBinding: 'items',
  },
  {
    id: uuidv4(),
    type: ElementType.DIVIDER,
    content: '',
    styles: {
      borderTop: '1px dashed #000',
      margin: '10px 0',
    },
  },
  {
    id: uuidv4(),
    type: ElementType.TEXT,
    content: 'Subtotal: {{totals.subtotal}}\nTax: {{totals.tax}}\nTotal: {{totals.total}}',
    styles: {
      fontFamily: 'monospace',
      whiteSpace: 'pre-line',
      textAlign: 'right',
      marginBottom: '10px',
    },
    dataBinding: 'totals',
  },
  {
    id: uuidv4(),
    type: ElementType.DIVIDER,
    content: '',
    styles: {
      borderTop: '1px dashed #000',
      margin: '10px 0',
    },
  },
  {
    id: uuidv4(),
    type: ElementType.TEXT,
    content: '{{payment.method}} - {{payment.amount}}',
    styles: {
      textAlign: 'center',
      marginBottom: '10px',
    },
    dataBinding: 'payment',
  },
  {
    id: uuidv4(),
    type: ElementType.BARCODE,
    content: '{{transaction.id}}',
    styles: {
      width: '80%',
      height: '50px',
      margin: '10px auto',
      display: 'block',
    },
    dataBinding: 'transaction.id',
  },
  {
    id: uuidv4(),
    type: ElementType.TEXT,
    content: '{{footer.message}}\n{{footer.returnPolicy}}',
    styles: {
      fontSize: '90%',
      textAlign: 'center',
      marginTop: '10px',
    },
    dataBinding: 'footer',
  },
];

// Create Service Invoice Template Elements
const createServiceElements = (): ReceiptElement[] => [
  {
    id: uuidv4(),
    type: ElementType.IMAGE,
    content: '/placeholder.svg',
    styles: {
      width: '200px',
      marginBottom: '20px',
    },
    dataBinding: 'business.logo',
  },
  {
    id: uuidv4(),
    type: ElementType.HEADER,
    content: 'SERVICE INVOICE',
    styles: {
      fontSize: '24pt',
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: '20px',
      color: '#2563eb',
    },
  },
  {
    id: uuidv4(),
    type: ElementType.TEXT,
    content: '{{business.name}}\n{{business.address}}\nPhone: {{business.phone}}\nEmail: {{business.email}}',
    styles: {
      whiteSpace: 'pre-line',
      marginBottom: '20px',
    },
    dataBinding: 'business',
  },
  {
    id: uuidv4(),
    type: ElementType.TEXT,
    content: 'Invoice #: {{invoice.number}}\nDate: {{invoice.date}}\nDue Date: {{invoice.dueDate}}',
    styles: {
      fontFamily: 'monospace',
      whiteSpace: 'pre-line',
      marginBottom: '20px',
    },
    dataBinding: 'invoice',
  },
  {
    id: uuidv4(),
    type: ElementType.TEXT,
    content: 'BILL TO:\n{{customer.name}}\n{{customer.company}}\n{{customer.address}}\nPhone: {{customer.phone}}\nEmail: {{customer.email}}',
    styles: {
      whiteSpace: 'pre-line',
      marginBottom: '20px',
    },
    dataBinding: 'customer',
  },
  {
    id: uuidv4(),
    type: ElementType.TEXT,
    content: 'DEVICE INFORMATION:\nType: {{device.type}}\nBrand: {{device.brand}}\nModel: {{device.model}}\nSerial: {{device.serial}}\nCondition: {{device.condition}}',
    styles: {
      whiteSpace: 'pre-line',
      marginBottom: '20px',
      padding: '10px',
      backgroundColor: '#f8fafc',
      borderRadius: '4px',
    },
    dataBinding: 'device',
  },
  {
    id: uuidv4(),
    type: ElementType.TABLE,
    content: '',
    styles: {
      width: '100%',
      borderCollapse: 'collapse',
      marginBottom: '20px',
    },
    dataBinding: 'services',
  },
  {
    id: uuidv4(),
    type: ElementType.TEXT,
    content: 'NOTES:\n{{notes}}',
    styles: {
      whiteSpace: 'pre-line',
      marginBottom: '20px',
      padding: '10px',
      backgroundColor: '#f8fafc',
      borderRadius: '4px',
    },
    dataBinding: 'notes',
  },
  {
    id: uuidv4(),
    type: ElementType.TEXT,
    content: 'Subtotal: {{totals.subtotal}}\nTax: {{totals.tax}}\nTotal Due: {{totals.total}}',
    styles: {
      fontFamily: 'monospace',
      whiteSpace: 'pre-line',
      textAlign: 'right',
      marginBottom: '20px',
      fontSize: '110%',
    },
    dataBinding: 'totals',
  },
  {
    id: uuidv4(),
    type: ElementType.TEXT,
    content: 'Payment Status: {{payment.status}}\nPayment Terms: {{payment.terms}}',
    styles: {
      textAlign: 'right',
      marginBottom: '20px',
      color: '#dc2626',
    },
    dataBinding: 'payment',
  },
  {
    id: uuidv4(),
    type: ElementType.TEXT,
    content: 'WARRANTY INFORMATION:\n{{warranty.period}} - {{warranty.coverage}}\n{{warranty.terms}}',
    styles: {
      fontSize: '90%',
      whiteSpace: 'pre-line',
      textAlign: 'center',
      marginTop: '20px',
      padding: '10px',
      backgroundColor: '#f8fafc',
      borderRadius: '4px',
    },
    dataBinding: 'warranty',
  },
  {
    id: uuidv4(),
    type: ElementType.QR_CODE,
    content: '{{invoice.number}}',
    styles: {
      width: '100px',
      height: '100px',
      margin: '20px auto',
      display: 'block',
    },
    dataBinding: 'invoice.number',
  },
];


// Sample POS data structure
export const posSampleData = {
  business: {
    name: 'TechMart Electronics',
    address: '123 Tech Street, Digital City',
    phone: '555-TECH',
    email: 'sales@techmart.com',
    taxId: 'TX12345678',
  },
  transaction: {
    id: 'POS-2024001',
    date: new Date().toLocaleDateString(),
    time: new Date().toLocaleTimeString(),
    cashier: 'John Smith',
    terminal: 'POS-01',
  },
  customer: {
    id: 'CUST001',
    name: 'Walk-in Customer',
    loyaltyPoints: 150,
  },
  items: [
    {
      sku: 'USB-001',
      name: 'USB Flash Drive 32GB',
      qty: 2,
      price: 19.99,
      discount: 0,
      total: 39.98,
    },
    {
      sku: 'KB-001',
      name: 'Wireless Keyboard',
      qty: 1,
      price: 45.99,
      discount: 5.00,
      total: 40.99,
    },
  ],
  payments: [
    {
      method: 'CREDIT_CARD',
      amount: 80.97,
      cardType: 'VISA',
      last4: '4242',
    },
  ],
  totals: {
    subtotal: 85.97,
    discount: 5.00,
    tax: 8.60,
    total: 89.57,
  },
  footer: {
    message: 'Thank you for shopping at TechMart!',
    returnPolicy: '30-day return policy with receipt',
  },
};

// Sample Service Invoice data structure
export const serviceSampleData = {
  business: {
    name: 'PC Repair Pro',
    address: '456 Service Road, Tech Valley',
    phone: '555-REPAIR',
    email: 'service@pcrepairpro.com',
    website: 'www.pcrepairpro.com',
    taxId: 'TX98765432',
  },
  invoice: {
    number: 'INV-2024001',
    date: new Date().toLocaleDateString(),
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    terms: 'Net 15',
  },
  customer: {
    id: 'CUS-001',
    name: 'Alice Johnson',
    company: 'Johnson Consulting',
    address: '789 Business Ave, Commerce City',
    phone: '555-1234',
    email: 'alice@johnsonconsulting.com',
  },
  device: {
    type: 'Laptop',
    brand: 'Dell',
    model: 'XPS 15',
    serial: 'DL123456789',
    condition: 'Powers on, display flickers',
  },
  services: [
    {
      code: 'DIAG-001',
      description: 'Diagnostic Service',
      hours: 1,
      rate: 65.00,
      total: 65.00,
    },
    {
      code: 'REP-001',
      description: 'Display Cable Replacement',
      hours: 1.5,
      rate: 85.00,
      total: 127.50,
    },
    {
      code: 'PART-001',
      description: 'LCD Cable (Part)',
      qty: 1,
      price: 45.00,
      total: 45.00,
    },
  ],
  notes: [
    'Device tested after repair - display working normally',
    'Performed system updates',
    'Cleaned cooling system',
  ],
  totals: {
    labor: 192.50,
    parts: 45.00,
    subtotal: 237.50,
    tax: 23.75,
    total: 261.25,
  },
  payment: {
    status: 'UNPAID',
    method: 'PENDING',
    terms: 'Due within 15 days',
  },
  warranty: {
    period: '90 days',
    coverage: 'Parts and labor',
    terms: 'Limited warranty on repair work performed',
  },
};

// POS Receipt Template
export const posReceiptTemplate: ReceiptTemplate = {
  id: uuidv4(),
  name: 'POS Sales Receipt',
  elements: createPOSElements(),
  paperSize: PaperSize.THERMAL_80MM,
  styles: {
    width: '80mm',
    minHeight: '100%',
    padding: '5mm',
    fontFamily: 'monospace',
    fontSize: '9pt',
    lineHeight: '1.2',
    color: '#000',
    backgroundColor: '#fff',
  },
  preview: posSampleData
};

// Service Invoice Template
export const serviceInvoiceTemplate: ReceiptTemplate = {
  id: uuidv4(),
  name: 'Computer Service Invoice',
  elements: createServiceElements(),
  paperSize: PaperSize.A4,
  styles: {
    width: '210mm',
    minHeight: '297mm',
    padding: '15mm',
    fontFamily: 'sans-serif',
    fontSize: '10pt',
    lineHeight: '1.4',
    color: '#000',
    backgroundColor: '#fff',
  },
  preview: serviceSampleData
};