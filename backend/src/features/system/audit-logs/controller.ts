import { responseSuccess } from '@/utils/api-response';
import { asyncController } from '@/utils/async-controller';
import { Request, Response } from 'express';
import PrismaDBConnection from '@/prisma/prisma-client';
import { isUndefinedOrUndefinedString } from '@/utils/string-utils';

const prisma = PrismaDBConnection.getConnection();

const parsePagination = (q: any) => {
  const limit = Math.max(1, Math.min(500, Number(q.limit) || 10));
  const page = Math.max(1, Number(q.page) || 1);
  const offset = Number.isFinite(Number(q.offset))
    ? Number(q.offset)
    : (page - 1) * limit;
  return { limit, page, offset };
};

const parseList = (raw: any): string[] | undefined => {
  if (raw === undefined || raw === null || raw === '') return undefined;
  if (Array.isArray(raw)) return raw.map(String);
  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

const parseDateRange = (raw: any): { from?: Date; to?: Date } => {
  if (!raw) return {};
  let arr: any = raw;
  if (typeof arr === 'string') {
    try {
      arr = JSON.parse(arr);
    } catch {
      arr = arr.split(',');
    }
  }
  if (!Array.isArray(arr) || arr.length === 0) return {};
  const from = arr[0] ? new Date(arr[0]) : undefined;
  const to = arr[1] ? new Date(arr[1]) : undefined;
  return {
    from: from && !isNaN(from.getTime()) ? from : undefined,
    to: to && !isNaN(to.getTime()) ? to : undefined,
  };
};

/** Express `res.json` cannot encode JS `BigInt` — stringify PK for API consumers. */
const serializeLoginLogRows = <T extends { id: bigint }>(rows: T[]) =>
  rows.map((r) => ({
    ...r,
    id: r.id.toString(),
  }));

export class Controller {
  // ── Audit logs ─────────────────────────────────────────────────────────

  public auditListOrDetails = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const { types, severities, dateRange, search } = req.query as any;

      if (!isUndefinedOrUndefinedString(req.params?.id)) {
        const idParam = req.params.id as unknown as string | string[];
        const id = Array.isArray(idParam) ? idParam[0] : idParam;
        const auditLog = await prisma.auditLog.findUnique({ where: { id } });
        responseSuccess(res, { message: 'Success', data: auditLog });
        return;
      }

      const where: any = { deletedAt: null };

      const typeList = parseList(types);
      if (typeList && typeList.length) where.type = { in: typeList };

      const sevList = parseList(severities);
      if (sevList && sevList.length) where.severity = { in: sevList };

      const { from, to } = parseDateRange(dateRange);
      if (from || to) where.timestamp = { ...(from && { gte: from }), ...(to && { lte: to }) };

      if (search) {
        const q = String(search);
        where.OR = [
          { action: { contains: q, mode: 'insensitive' } },
          { resource: { contains: q, mode: 'insensitive' } },
          { userEmail: { contains: q, mode: 'insensitive' } },
          { userId: { contains: q, mode: 'insensitive' } },
          { details: { contains: q, mode: 'insensitive' } },
        ];
      }

      const { limit, page, offset } = parsePagination(req.query);

      const [auditLogs, totalCount] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          skip: offset,
          take: limit,
          orderBy: { timestamp: 'desc' },
        }),
        prisma.auditLog.count({ where }),
      ]);

      responseSuccess(res, {
        message: 'Success',
        data: auditLogs,
        meta: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalRows: totalCount,
        },
      });
    }),
  ];

  public auditLogOverview = [
    asyncController(async (_req: Request, res: Response): Promise<void> => {
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const [
        totalEvents,
        totalErrors,
        totalWarnings,
        events24h,
        events7d,
        loginCount,
        logoutCount,
        lastLog,
      ] = await Promise.all([
        prisma.auditLog.count({ where: { deletedAt: null } }),
        prisma.auditLog.count({ where: { deletedAt: null, severity: 'ERROR' } }),
        prisma.auditLog.count({ where: { deletedAt: null, severity: 'WARNING' } }),
        prisma.auditLog.count({ where: { deletedAt: null, timestamp: { gte: since24h } } }),
        prisma.auditLog.count({ where: { deletedAt: null, timestamp: { gte: since7d } } }),
        prisma.auditLog.count({ where: { deletedAt: null, type: 'LOGIN' } }),
        prisma.auditLog.count({ where: { deletedAt: null, type: 'LOGOUT' } }),
        prisma.auditLog.findFirst({
          where: { deletedAt: null },
          orderBy: { timestamp: 'desc' },
          select: { timestamp: true },
        }),
      ]);

      const successRate =
        totalEvents > 0
          ? Number((((totalEvents - totalErrors) / totalEvents) * 100).toFixed(1))
          : 0;

      responseSuccess(res, {
        message: 'Success',
        data: {
          totalEvents,
          totalErrors,
          totalWarnings,
          events24h,
          events7d,
          loginCount,
          logoutCount,
          successRate,
          lastUpdated: lastLog?.timestamp || null,
        },
      });
    }),
  ];

  // ── Login logs (tbl_login_log) ─────────────────────────────────────────

  public loginLogList = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const { type, platform, search, dateRange } = req.query as any;
      const where: any = { deletedAt: null };

      if (type) where.type = String(type);
      if (platform) where.loginPlatform = { contains: String(platform), mode: 'insensitive' };

      const { from, to } = parseDateRange(dateRange);
      if (from || to) {
        where.loginDateTime = { ...(from && { gte: from }), ...(to && { lte: to }) };
      }

      if (search) {
        const q = String(search);
        where.OR = [
          { loginDevices: { contains: q, mode: 'insensitive' } },
          { loginPlatform: { contains: q, mode: 'insensitive' } },
          { type: { contains: q, mode: 'insensitive' } },
        ];
      }

      const { limit, page, offset } = parsePagination(req.query);

      const [rows, totalCount] = await Promise.all([
        prisma.loginLog.findMany({
          where,
          skip: offset,
          take: limit,
          orderBy: { loginDateTime: 'desc' },
        }),
        prisma.loginLog.count({ where }),
      ]);

      responseSuccess(res, {
        message: 'Success',
        data: serializeLoginLogRows(rows),
        meta: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalRows: totalCount,
        },
      });
    }),
  ];

  public loginLogOverview = [
    asyncController(async (_req: Request, res: Response): Promise<void> => {
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const [total, last24h, last7d, distinctUsers, last] = await Promise.all([
        prisma.loginLog.count({ where: { deletedAt: null } }),
        prisma.loginLog.count({
          where: { deletedAt: null, loginDateTime: { gte: since24h } },
        }),
        prisma.loginLog.count({
          where: { deletedAt: null, loginDateTime: { gte: since7d } },
        }),
        prisma.loginLog.findMany({
          where: { deletedAt: null, loginDateTime: { gte: since7d } },
          distinct: ['userId'],
          select: { userId: true },
        }),
        prisma.loginLog.findFirst({
          where: { deletedAt: null },
          orderBy: { loginDateTime: 'desc' },
          select: { loginDateTime: true },
        }),
      ]);

      responseSuccess(res, {
        message: 'Success',
        data: {
          total,
          last24h,
          last7d,
          activeUsers7d: distinctUsers.length,
          lastLoginAt: last?.loginDateTime || null,
        },
      });
    }),
  ];

  // ── Retention preview ──────────────────────────────────────────────────

  public retentionPreview = [
    asyncController(async (_req: Request, res: Response): Promise<void> => {
      const settings = await prisma.appSetting.findMany({
        where: {
          key: {
            in: [
              'log_cleanup_enabled',
              'log_cleanup_cron',
              'audit_log_retention_days',
              'login_log_retention_days',
              'log_cleanup_batch_size',
            ],
          },
        },
      });
      const get = (k: string) => settings.find((s) => s.key === k)?.value;

      const auditDays = Number(get('audit_log_retention_days') ?? 0);
      const loginDays = Number(get('login_log_retention_days') ?? 0);

      const [auditExpired, loginExpired] = await Promise.all([
        auditDays > 0
          ? prisma.auditLog.count({
              where: {
                deletedAt: null,
                timestamp: { lt: new Date(Date.now() - auditDays * 86_400_000) },
              },
            })
          : Promise.resolve(0),
        loginDays > 0
          ? prisma.loginLog.count({
              where: {
                deletedAt: null,
                loginDateTime: { lt: new Date(Date.now() - loginDays * 86_400_000) },
              },
            })
          : Promise.resolve(0),
      ]);

      responseSuccess(res, {
        message: 'Success',
        data: {
          enabled: (get('log_cleanup_enabled') ?? 'false').toLowerCase() === 'true',
          cron: get('log_cleanup_cron') ?? '0 3 * * *',
          auditRetentionDays: auditDays,
          loginRetentionDays: loginDays,
          batchSize: Number(get('log_cleanup_batch_size') ?? 5000),
          auditExpiredCount: auditExpired,
          loginExpiredCount: loginExpired,
        },
      });
    }),
  ];

  public auditLogExport = [
    asyncController(async (_req: Request, res: Response): Promise<void> => {
      responseSuccess(res, { message: 'Success', data: {} });
    }),
  ];
}
