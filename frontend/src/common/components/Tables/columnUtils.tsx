import React from 'react';
import { formatCurrency } from "@/common/utils/formatCurrency";
import { formatDateTime, formatDateTimestamp } from "@/utils/clientUtils";
import TheIcon, { Name } from '../@bdata/IconPicker/icons';

type SpecialString = string | string[];

// Base interface for standard column configuration
interface ColumnConfig {
  key?: SpecialString;
  title: React.ReactNode; // Supports JSX
  visible?: boolean; // Optional, defaults to true if not provided
  isMoney?: boolean;
  isDate?: boolean;
  isAction?: boolean;
  isCustom?: boolean; // Indicates that this column uses custom rendering
  dataIndex?: string; // Optional for sorting
  icon?: React.ReactNode | string; // Optional icon for action columns
  jsx?: (record: any) => React.ReactNode; // Custom render function for JSX
  render?: (text: any, record: any) => React.ReactNode; // Custom render function for Ant Design Table
  /**
   * Whether this column should be server-sortable. Defaults to `true` when
   * `key` is defined. Set to `false` for purely-computed UI columns (e.g.
   * "headcount snapshot") that have no backing Prisma scalar — otherwise the
   * backend would receive `sort_by=<computed-key>` and crash.
   */
  sortable?: boolean;
}

// Extended interface for custom column configuration
interface CustomColumnConfig extends ColumnConfig {
  isCustom: true;
  icon: React.ReactNode | string; // Make icon required for custom columns
  jsx: (record: any) => React.ReactNode; // Make jsx required for custom columns
}

// Grouped column configuration
interface GroupedColumnConfig {
  title: React.ReactNode; // Supports JSX
  key: SpecialString;
  dataIndex?: string; // Main dataIndex for sorting
  icon?: React.ReactNode | string; // Optional icon for action columns
  children: (ColumnConfig | CustomColumnConfig)[]; // Accept both standard and custom columns
}

// Type union for column configurations
export type ConfiguredColumn = (GroupedColumnConfig | ColumnConfig | CustomColumnConfig)[];

// Function to generate columns from grouped and non-grouped configurations
export function generateColumns(
  columnConfig: ConfiguredColumn, // Accept both grouped and non-grouped
  renderActions?: (record: any) => React.ReactNode // Optional render function for action buttons
) {
  
  return columnConfig.flatMap(group => {

    const titleIcon = typeof group.icon === "string" ? <span><TheIcon name={group.icon as Name} /> {group.title}</span> : <>{group.icon} {group.title}</>;
    // Check if it's a group with children
    if ('children' in group) {
      return {
        title: <>{titleIcon} {group.title}</>,
        dataIndex: group.dataIndex, // Main dataIndex for sorting
        key: group.key, // Generate a key from dataIndex or title
        children: group.children
          .filter(col => col.visible !== false) // Only include visible columns
          .map(col => createColumnConfig(col, renderActions)), // Use the helper function
      };
    } else {
      // Non-grouped column
      return createColumnConfig(group, renderActions); // Use the helper function
    }
  });
}

// Helper function to create column configuration
function createColumnConfig(col: ColumnConfig, renderActions?: (record: any) => React.ReactNode) {
  const titleIcon = typeof col.icon === "string" ? <span><TheIcon name={col.icon as Name} /> {col.title}</span> : <>{col.icon} {col.title}</>;
  // A column is server-sortable when it has a `key` AND the caller hasn't
  // explicitly opted out via `sortable: false`. Action / pure-UI columns
  // should set `sortable: false` to avoid emitting an unsupported
  // `sort_by=<key>` query.
  const isSortable = !!col.key && col.sortable !== false && !col.isAction;

  const column: any = {
    title: titleIcon,
    dataIndex: col.key, // Use dataIndex if provided, otherwise fall back to key
    key: col.key,
    sorter: isSortable,
    render: (text: any, record: any) => renderColumnValue(col, record, text, renderActions), // Centralized rendering logic
  };

  // Directly assign the render function if it exists on the column
  if (col.render) {
    column.render = col.render; // Use the provided render function if it exists
  }

  return column;
}

// Centralized rendering logic for columns
function renderColumnValue(
  col: ColumnConfig, 
  record: any, 
  text: any, // Required parameter
  renderActions?: (record: any) => React.ReactNode // Optional parameter
) {
  if (col.isMoney) {
    return <span>{formatCurrency(text)}</span>;
  }

  if (col.isDate) {
    return <span>{formatDateTimestamp(text)}</span>;
  }

  if (col.isCustom && col.jsx) {
    return col.jsx(record); // Use the jsx function for custom rendering
  }

  if (col.isAction) {
    return renderActions ? renderActions(record) : null;
  }

  return text; // Default rendering
}

export function generateFlatColumns(columnConfig: ConfiguredColumn, renderActions?: (record: any) => React.ReactNode) {
  const flattenedColumns: ColumnConfig[] = [];

  function flattenColumns(config: ConfiguredColumn) {
    config.forEach(group => {
      if ("children" in group) {
        flattenColumns(group.children); // Recursively handle children
      } else {
        flattenedColumns.push(createColumnConfig(group, renderActions));
      }
    });
  }

  flattenColumns(columnConfig);
  return flattenedColumns;
}