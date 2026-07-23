export type MigrateMode = 'dry-run' | 'apply';

/** 1 = foundation, 2 = vouchers/credentials, 3 = sales/commissions. */
export type MigratePhase = 1 | 2 | 3;

export type EntityStats = {
  source: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
};

export type MigrateIssue = {
  entity: string;
  level: 'warn' | 'error';
  message: string;
  id?: string;
};

export type MigrateReport = {
  startedAt: string;
  finishedAt?: string;
  mode: MigrateMode;
  phase: MigratePhase | 'all';
  since: string | null;
  orgFilter: string | null;
  oldDatabaseHost: string;
  namingStyle: 'camelCase' | 'snake_case' | 'mixed' | 'unknown';
  tablesPresent: string[];
  stats: Record<string, EntityStats>;
  issues: MigrateIssue[];
  notes: string[];
};

export type MigrateOptions = {
  mode: MigrateMode;
  /** When set, only that phase runs. When omitted, all phases run in order. */
  phase?: MigratePhase;
  /** Inclusive lower bound on createdAt/updatedAt (and paidAt for payments). */
  since?: Date;
  orgCode?: string;
  batchSize: number;
  reportPath?: string;
};

export const PHASE_LABELS: Record<MigratePhase, string> = {
  1: 'Phase 1 — foundation (admins, org, license, members, resellers, stations, plans)',
  2: 'Phase 2 — access inventory (voucher batches, credentials)',
  3: 'Phase 3 — commerce (sales, payments, commissions)',
};

export function emptyStats(): EntityStats {
  return { source: 0, inserted: 0, updated: 0, skipped: 0, errors: 0 };
}

export function bump(
  stats: EntityStats,
  field: keyof Omit<EntityStats, 'source'>,
  n = 1,
): void {
  stats[field] += n;
}

export function shouldRunPhase(
  selected: MigratePhase | undefined,
  phase: MigratePhase,
): boolean {
  return selected == null || selected === phase;
}
