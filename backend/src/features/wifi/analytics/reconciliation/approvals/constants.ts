/** Console API base path — mirrors menu route */
export const API_PATH = '/wifi/analytics/reconciliation/approvals';

export const PERIOD_PRESETS = ['7d', '30d', '90d'] as const;
export type PeriodPreset = (typeof PERIOD_PRESETS)[number];

export const DEFAULT_PRESET: PeriodPreset = '30d';

export const WORKFLOW_STATUSES = [
  'DRAFT',
  'DECLARED',
  'STATION_ATTESTED',
  'ORG_APPROVED',
  'REJECTED',
  'POSTED',
] as const;

export type WorkflowStatusFilter = (typeof WORKFLOW_STATUSES)[number];

export const QUEUE_STATUSES = ['DECLARED', 'STATION_ATTESTED', 'ORG_APPROVED'] as const;
