"use client";
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { ReceiptElement, ElementType, ReceiptTemplate, PaperSize } from './types';

interface ReceiptState {
  templates: ReceiptTemplate[];
  currentTemplate: ReceiptTemplate | null;
  selectedElement: ReceiptElement | null;
  sidebarCollapsed: boolean;
  propertiesPanelCollapsed: boolean;
  codeEditorOpen: boolean;
  previewDrawerVisible: boolean;
  previewData: Record<string, any>;
  selectedPrinter: string | null;

  // Template Setter
  setTemplates: (data: ReceiptTemplate[]) => void;
  setPreviewData: (data: any) => void;

  setSelectedPrinter: (printer: any) =>  void;

  // Template actions
  createNewTemplate: (name: ReceiptTemplate) => void;
  setCurrentTemplate: (templateId: string, previewData: any) => void;
  updateTemplate: (template: Partial<ReceiptTemplate>) => void;

  // Element actions
  addElement: (type: ElementType, parentId?: string) => void;
  updateElement: (elementId: string, updates: Partial<ReceiptElement>) => void;
  removeElement: (elementId: string) => void;
  selectElement: (elementId: string | null) => void;
  moveElement: (sourceIndex: number, destinationIndex: number, parentId?: string) => void;

  // UI state actions
  toggleSidebar: () => void;
  togglePropertiesPanel: () => void;
  toggleCodeEditor: () => void;
  togglePreviewDrawer: () => void;
  
  // Data binding
  updatePreviewData: (data: Record<string, any>) => void;
}

export const useReceiptStore = create<ReceiptState>((set, get) => ({
  templates: [],
  currentTemplate: null,
  selectedElement: null,
  sidebarCollapsed: false,
  propertiesPanelCollapsed: false,
  codeEditorOpen: false,
  previewDrawerVisible: false,
  previewData: {},
  selectedPrinter: null,

  setTemplates: (data) => {
    set((state) => ({
      templates: [...data]
    }))
  },

  setSelectedPrinter: (printer) => {
    set((state) => ({
      selectedPrinter: printer
    }))
  },

  setPreviewData: (data) => {
    set((state) => ({
      previewData: data
    }))
  },

  createNewTemplate: (template: ReceiptTemplate) => {
    set((state) => ({
      templates: [...state.templates, template],
      currentTemplate: template,
    }));
  },

  setCurrentTemplate: (templateId, previewData) => {
    const template = get().templates.find((t) => t.id === templateId);
    // console.log("TEMPLATE", template)
    if (template) {
      set({ 
        currentTemplate: template, 
        selectedElement: null,
        previewData: previewData,
      });
    }
  },

  updateTemplate: (updates) => {
    const { currentTemplate } = get();
    if (!currentTemplate) return;

    const updatedTemplate = { ...currentTemplate, ...updates };
    
    set((state) => ({
      templates: state.templates.map((t) => 
        t.id === currentTemplate.id ? updatedTemplate : t
      ),
      currentTemplate: updatedTemplate,
    }));
  },

  addElement: (type, parentId) => {
    const { currentTemplate } = get();
    if (!currentTemplate) return;

    const newElement: ReceiptElement = {
      id: uuidv4(),
      type,
      content: getDefaultContent(type),
      styles: getDefaultStyles(type),
      dataBinding: '',
    };

    let updatedElements: ReceiptElement[];

    if (parentId) {
      updatedElements = addChildElement(
        currentTemplate.elements,
        parentId,
        newElement
      );
    } else {
      updatedElements = [...currentTemplate.elements, newElement];
    }

    set((state) => ({
      currentTemplate: {
        ...state.currentTemplate!,
        elements: updatedElements,
      },
      templates: state.templates.map((t) =>
        t.id === currentTemplate.id
          ? { ...t, elements: updatedElements }
          : t
      ),
      selectedElement: newElement,
    }));
  },

  updateElement: (elementId, updates) => {
    const { currentTemplate } = get();
    if (!currentTemplate) return;

    const updatedElements = updateElementInTree(
      currentTemplate.elements,
      elementId,
      updates
    );

    const updatedTemplate = {
      ...currentTemplate,
      elements: updatedElements,
    };

    set((state) => ({
      currentTemplate: updatedTemplate,
      templates: state.templates.map((t) =>
        t.id === currentTemplate.id ? updatedTemplate : t
      ),
      selectedElement: state.selectedElement?.id === elementId
        ? { ...state.selectedElement, ...updates }
        : state.selectedElement,
    }));
  },

  removeElement: (elementId) => {
    const { currentTemplate, selectedElement } = get();
    if (!currentTemplate) return;

    const updatedElements = removeElementFromTree(
      currentTemplate.elements,
      elementId
    );

    const updatedTemplate = {
      ...currentTemplate,
      elements: updatedElements,
    };

    set((state) => ({
      currentTemplate: updatedTemplate,
      templates: state.templates.map((t) =>
        t.id === currentTemplate.id ? updatedTemplate : t
      ),
      selectedElement: selectedElement?.id === elementId ? null : selectedElement,
    }));
  },

  selectElement: (elementId) => {
    if (!elementId) {
      set({ selectedElement: null });
      return;
    }

    const { currentTemplate } = get();
    if (!currentTemplate) return;

    const element = findElementInTree(currentTemplate.elements, elementId);
    set({ selectedElement: element || null });
  },

  moveElement: (sourceIndex, destinationIndex, parentId) => {
    const { currentTemplate } = get();
    if (!currentTemplate) return;

    let elements: ReceiptElement[];
    
    if (parentId) {
      const parent = findElementInTree(currentTemplate.elements, parentId);
      if (!parent || !parent.children) return;
      
      elements = [...parent.children];
      const [removed] = elements.splice(sourceIndex, 1);
      elements.splice(destinationIndex, 0, removed);
      
      const updatedElements = updateElementInTree(
        currentTemplate.elements,
        parentId,
        { children: elements }
      );
      
      set((state) => ({
        currentTemplate: {
          ...state.currentTemplate!,
          elements: updatedElements,
        },
        templates: state.templates.map((t) =>
          t.id === currentTemplate.id
            ? { ...t, elements: updatedElements }
            : t
        ),
      }));
    } else {
      elements = [...currentTemplate.elements];
      const [removed] = elements.splice(sourceIndex, 1);
      elements.splice(destinationIndex, 0, removed);
      
      set((state) => ({
        currentTemplate: {
          ...state.currentTemplate!,
          elements,
        },
        templates: state.templates.map((t) =>
          t.id === currentTemplate.id ? { ...t, elements } : t
        ),
      }));
    }
  },

  toggleSidebar: () => {
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
  },

  togglePropertiesPanel: () => {
    set((state) => ({ propertiesPanelCollapsed: !state.propertiesPanelCollapsed }));
  },

  toggleCodeEditor: () => {
    set((state) => ({ codeEditorOpen: !state.codeEditorOpen }));
  },

  togglePreviewDrawer: () => {
    set((state) => ({ previewDrawerVisible: !state.previewDrawerVisible }));
  },

  updatePreviewData: (data) => {
    set({ previewData: data });
  },
}));

// Helper functions
function getDefaultContent(type: ElementType): string {
  switch (type) {
    case ElementType.HEADER:
      return 'Sample Store';
    case ElementType.TEXT:
      return 'Text content';
    case ElementType.IMAGE:
      return 'https://via.placeholder.com/150';
    case ElementType.TABLE:
      return 'table';
    case ElementType.BARCODE:
      return '123456789';
    case ElementType.QR_CODE:
      return 'https://example.com';
    case ElementType.DIVIDER:
      return '';
    case ElementType.SPACER:
      return '';
    default:
      return '';
  }
}

function getDefaultStyles(type: ElementType): React.CSSProperties {
  const baseStyles: React.CSSProperties = {
    width: '100%',
  };

  switch (type) {
    case ElementType.HEADER:
      return {
        ...baseStyles,
        fontWeight: 'bold',
        fontSize: '130%',
        textAlign: 'center',
        marginBottom: '10px',
      };
    case ElementType.TEXT:
      return {
        ...baseStyles,
        fontSize: '100%',
        marginBottom: '5px',
      };
    case ElementType.IMAGE:
      return {
        ...baseStyles,
        width: '40%',
        margin: '0 auto',
        display: 'block',
      };
    case ElementType.TABLE:
      return {
        ...baseStyles,
        borderCollapse: 'collapse',
        width: '100%',
        marginTop: '10px',
        marginBottom: '10px',
      };
    case ElementType.BARCODE:
    case ElementType.QR_CODE:
      return {
        ...baseStyles,
        width: '50%',
        height: '50px',
        margin: '10px auto',
        display: 'block',
      };
    case ElementType.DIVIDER:
      return {
        ...baseStyles,
        borderTop: '1px dashed #000',
        margin: '10px 0',
        height: '0',
      };
    case ElementType.SPACER:
      return {
        ...baseStyles,
        height: '10px',
      };
    default:
      return baseStyles;
  }
}

function updateElementInTree(
  elements: ReceiptElement[],
  elementId: string,
  updates: Partial<ReceiptElement>
): ReceiptElement[] {
  return elements.map((element) => {
    if (element.id === elementId) {
      return { ...element, ...updates };
    }
    
    if (element.children) {
      return {
        ...element,
        children: updateElementInTree(element.children, elementId, updates),
      };
    }
    
    return element;
  });
}

function removeElementFromTree(
  elements: ReceiptElement[],
  elementId: string
): ReceiptElement[] {
  return elements.filter((element) => {
    if (element.id === elementId) {
      return false;
    }
    
    if (element.children) {
      element.children = removeElementFromTree(element.children, elementId);
    }
    
    return true;
  });
}

function findElementInTree(
  elements: ReceiptElement[],
  elementId: string
): ReceiptElement | null {
  for (const element of elements) {
    if (element.id === elementId) {
      return element;
    }
    
    if (element.children) {
      const found = findElementInTree(element.children, elementId);
      if (found) {
        return found;
      }
    }
  }
  
  return null;
}

function addChildElement(
  elements: ReceiptElement[],
  parentId: string,
  newElement: ReceiptElement
): ReceiptElement[] {
  return elements.map((element) => {
    if (element.id === parentId) {
      return {
        ...element,
        children: [...(element.children || []), newElement],
      };
    }
    
    if (element.children) {
      return {
        ...element,
        children: addChildElement(element.children, parentId, newElement),
      };
    }
    
    return element;
  });
}