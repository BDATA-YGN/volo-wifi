import fs from 'fs';
import path from 'path';
import type { MigrateReport } from './types';

export function createReport(partial: Omit<MigrateReport, 'finishedAt' | 'stats' | 'issues' | 'notes'>): MigrateReport {
  return {
    ...partial,
    stats: {},
    issues: [],
    notes: [],
  };
}

export function writeReport(report: MigrateReport, reportPath?: string): string {
  report.finishedAt = new Date().toISOString();
  const json = JSON.stringify(report, null, 2);

  const outPath =
    reportPath ||
    path.resolve(
      process.cwd(),
      'tmp',
      `wifi-migrate-${report.mode}-phase-${report.phase}-${Date.now()}.json`,
    );

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, json, 'utf8');
  return outPath;
}
