import { Response } from 'express';
import { asyncController } from '@/utils/async-controller';
import { responseSuccess } from '@/utils/api-response';
import type { AuthenticatedRequest } from '@/interfaces/express.interface';
import { logger } from '@/logging/logger';
import PrismaDBConnection from '@/prisma/prisma-client';
import { RadiusAcctStatus } from '@/generated/prisma/client';
import {
  captiveConnection,
  captiveCredentialStatusLabel,
  captivePlanQuotaTypeLabel,
  captiveSuccess,
} from '@/features/captive/messages';
import {
  computeCredentialTimeRemainingSec,
  planTimeQuotaSec,
  radiusSessionMatchWhere,
  radiusUserNameVariants,
} from '@/features/shared/credentials/credential-sync.helpers';
import { sanitizeCaptiveClientIp } from '@/features/captive/utils/captive-client-ip';

const prisma = PrismaDBConnection.getConnection();

function formatSessionTime(seconds: number): string {
  if (seconds <= 0) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function formatTimeForDisplay(seconds: number): string {
  if (seconds <= 0) return '0 seconds';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h} hour${h !== 1 ? 's' : ''}`);
  if (m > 0) parts.push(`${m} minute${m !== 1 ? 's' : ''}`);
  if (s > 0 || parts.length === 0) parts.push(`${s} second${s !== 1 ? 's' : ''}`);
  return parts.join(' ');
}

function bytesToGb(bytes: bigint | number | null | undefined): number {
  if (bytes == null) return 0;
  const n = typeof bytes === 'bigint' ? Number(bytes) : bytes;
  return Math.round((n / (1024 * 1024 * 1024)) * 10) / 10;
}

function toBytes(s: {
  totalBytes?: bigint | null;
  inputBytes?: bigint | null;
  outputBytes?: bigint | null;
}): number {
  if (s.totalBytes != null && s.totalBytes > BigInt(0)) return Number(s.totalBytes);
  return Number(s.inputBytes ?? 0) + Number(s.outputBytes ?? 0);
}

export class CaptiveDashboardController {
  public getDashboard = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const credential = req.credential;
        if (!credential?.id) {
          responseSuccess(res, { message: captiveSuccess.NO_CREDENTIAL, data: null });
          return;
        }

        const plan = credential.plan;
        const radiusSessionWhere = radiusSessionMatchWhere(radiusUserNameVariants(credential));

        const activeSessions = await prisma.radiusSession.findMany({
          where: {
            ...radiusSessionWhere,
            status: { in: [RadiusAcctStatus.START, RadiusAcctStatus.INTERIM] },
            stoppedAt: null,
          },
          orderBy: { startedAt: 'desc' },
          take: 1,
        });
        const activeSession = activeSessions[0] ?? null;

        let sessionTimeSec = 0;
        if (activeSession) {
          sessionTimeSec = Math.floor((Date.now() - activeSession.startedAt.getTime()) / 1000);
          if (activeSession.sessionTimeSec != null && activeSession.sessionTimeSec > sessionTimeSec) {
            sessionTimeSec = activeSession.sessionTimeSec;
          }
        }

        const ipAddress = sanitizeCaptiveClientIp(activeSession?.framedIpAddress ?? null);
        const connected = !!activeSession;

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

        const [todayAgg, totalAgg, recentSessions] = await Promise.all([
          prisma.radiusSession.aggregate({
            where: { ...radiusSessionWhere, startedAt: { gte: startOfToday } },
            _sum: { totalBytes: true, inputBytes: true, outputBytes: true },
          }),
          prisma.radiusSession.aggregate({
            where: radiusSessionWhere,
            _sum: { totalBytes: true, inputBytes: true, outputBytes: true },
          }),
          prisma.radiusSession.findMany({
            where: radiusSessionWhere,
            orderBy: { startedAt: 'desc' },
            take: 10,
          }),
        ]);

        const todayUsageGb = bytesToGb(toBytes(todayAgg._sum ?? {}));
        const totalUsageGb = bytesToGb(toBytes(totalAgg._sum ?? {}));

        const sessionHistory = recentSessions.map((session) => {
          const sessionSeconds =
            session.sessionTimeSec != null
              ? session.sessionTimeSec
              : session.stoppedAt
                ? Math.max(
                    0,
                    Math.floor((session.stoppedAt.getTime() - session.startedAt.getTime()) / 1000),
                  )
                : 0;
          const total = toBytes(session);

          return {
            id: session.id,
            startedAt: session.startedAt.toISOString(),
            stoppedAt: session.stoppedAt ? session.stoppedAt.toISOString() : null,
            durationSec: sessionSeconds,
            durationDisplay: formatSessionTime(sessionSeconds),
            totalBytes: total,
            totalGb: bytesToGb(total),
            ipAddress: sanitizeCaptiveClientIp(session.framedIpAddress),
            status: session.status,
          };
        });

        let totalTimeSec: number | null = planTimeQuotaSec(plan);
        let remainingTimeSec: number | null = null;
        if (totalTimeSec != null && plan) {
          remainingTimeSec = await computeCredentialTimeRemainingSec(credential, plan);
          if (remainingTimeSec == null) {
            remainingTimeSec = credential.timeRemainingSec ?? totalTimeSec;
          }
        } else if (credential.timeRemainingSec != null) {
          remainingTimeSec = credential.timeRemainingSec;
        }

        const usedTimeSec =
          totalTimeSec != null && remainingTimeSec != null
            ? Math.max(0, totalTimeSec - remainingTimeSec)
            : 0;

        const remainingPercent =
          totalTimeSec != null && totalTimeSec > 0 && remainingTimeSec != null
            ? Math.min(100, Math.max(0, (remainingTimeSec / totalTimeSec) * 100))
            : plan?.dataMb != null && credential.dataRemainingMb != null && plan.dataMb > 0
              ? Math.min(100, (credential.dataRemainingMb / plan.dataMb) * 100)
              : 100;

        const packageType = plan ? captivePlanQuotaTypeLabel(plan.quotaType) : captiveSuccess.NO_PLAN;
        const planStatus = captiveCredentialStatusLabel(credential.status ?? '');

        responseSuccess(res, {
          message: captiveSuccess.DASHBOARD_RETRIEVED,
          data: {
            user: {
              displayName: credential.username ?? credential.token ?? captiveSuccess.DEFAULT_USER,
              id: credential.id,
            },
            connectionStatus: {
              connected,
              sessionTime: formatSessionTime(sessionTimeSec),
              sessionTimeSec,
              ipAddress,
              description: connected ? captiveConnection.ONLINE : captiveConnection.OFFLINE,
            },
            plan: {
              name: plan?.name ?? captiveSuccess.NO_PLAN,
              type: packageType,
              status: planStatus,
              timeUsageMode: plan?.timeUsageMode ?? 'CUMULATIVE_SESSIONS',
              totalTime: totalTimeSec != null ? formatTimeForDisplay(totalTimeSec) : null,
              remainingTime: remainingTimeSec != null ? formatTimeForDisplay(remainingTimeSec) : null,
              totalTimeSec,
              remainingTimeSec,
              expiresAt: credential.expiresAt?.toISOString() ?? null,
            },
            balance: {
              remainingPercent: Math.round(remainingPercent * 10) / 10,
              usedSec: usedTimeSec,
              totalSec: totalTimeSec,
              usedDisplay: formatTimeForDisplay(usedTimeSec),
              totalDisplay: totalTimeSec != null ? formatTimeForDisplay(totalTimeSec) : null,
            },
            usage: {
              todayUsageGb,
              totalUsageGb,
              todayDisplay: `${todayUsageGb} GB`,
              totalDisplay: `${totalUsageGb} GB`,
            },
            connectionDetails: {
              ipAddress,
              packageType,
              status: planStatus,
            },
            sessions: sessionHistory,
          },
        });
      } catch (error) {
        logger.error((error as Error).message);
        throw error;
      }
    }),
  ];

  public getUsage = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const credential = req.credential;
        if (!credential?.id) {
          responseSuccess(res, { message: captiveSuccess.NO_CREDENTIAL, data: null });
          return;
        }

        const radiusSessionWhere = radiusSessionMatchWhere(radiusUserNameVariants(credential));
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

        const [todayAgg, totalAgg] = await Promise.all([
          prisma.radiusSession.aggregate({
            where: { ...radiusSessionWhere, startedAt: { gte: startOfToday } },
            _sum: { totalBytes: true, inputBytes: true, outputBytes: true },
          }),
          prisma.radiusSession.aggregate({
            where: radiusSessionWhere,
            _sum: { totalBytes: true, inputBytes: true, outputBytes: true },
          }),
        ]);

        responseSuccess(res, {
          message: captiveSuccess.USAGE_RETRIEVED,
          data: {
            todayUsageGb: bytesToGb(toBytes(todayAgg._sum ?? {})),
            totalUsageGb: bytesToGb(toBytes(totalAgg._sum ?? {})),
          },
        });
      } catch (error) {
        logger.error((error as Error).message);
        throw error;
      }
    }),
  ];

  public getConnection = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const credential = req.credential;
        if (!credential?.id) {
          responseSuccess(res, { message: captiveSuccess.NO_CREDENTIAL, data: null });
          return;
        }

        const plan = credential.plan;
        const radiusSessionWhere = radiusSessionMatchWhere(radiusUserNameVariants(credential));
        const activeSessions = await prisma.radiusSession.findMany({
          where: {
            ...radiusSessionWhere,
            status: { in: [RadiusAcctStatus.START, RadiusAcctStatus.INTERIM] },
            stoppedAt: null,
          },
          orderBy: { startedAt: 'desc' },
          take: 1,
        });
        const activeSession = activeSessions[0] ?? null;

        let sessionTimeSec = 0;
        if (activeSession) {
          sessionTimeSec = Math.floor((Date.now() - activeSession.startedAt.getTime()) / 1000);
          if (activeSession.sessionTimeSec != null && activeSession.sessionTimeSec > sessionTimeSec) {
            sessionTimeSec = activeSession.sessionTimeSec;
          }
        }

        responseSuccess(res, {
          message: captiveSuccess.CONNECTION_RETRIEVED,
          data: {
            ipAddress: sanitizeCaptiveClientIp(activeSession?.framedIpAddress ?? null),
            packageType: plan ? captivePlanQuotaTypeLabel(plan.quotaType) : captiveSuccess.NO_PLAN,
            status: captiveCredentialStatusLabel(credential.status ?? ''),
            connected: !!activeSession,
            sessionTime: formatSessionTime(sessionTimeSec),
            sessionTimeSec,
          },
        });
      } catch (error) {
        logger.error((error as Error).message);
        throw error;
      }
    }),
  ];

  public getPlan = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const credential = req.credential;
        if (!credential?.id) {
          responseSuccess(res, { message: captiveSuccess.NO_CREDENTIAL, data: null });
          return;
        }

        const plan = credential.plan;
        let totalTimeSec: number | null = planTimeQuotaSec(plan);
        let remainingTimeSec: number | null = null;
        if (totalTimeSec != null && plan) {
          remainingTimeSec = await computeCredentialTimeRemainingSec(credential, plan);
          if (remainingTimeSec == null) {
            remainingTimeSec = credential.timeRemainingSec ?? totalTimeSec;
          }
        } else if (credential.timeRemainingSec != null) {
          remainingTimeSec = credential.timeRemainingSec;
        }

        const usedTimeSec =
          totalTimeSec != null && remainingTimeSec != null ? Math.max(0, totalTimeSec - remainingTimeSec) : 0;
        const remainingPercent =
          totalTimeSec != null && totalTimeSec > 0 && remainingTimeSec != null
            ? (remainingTimeSec / totalTimeSec) * 100
            : plan?.dataMb != null && credential.dataRemainingMb != null && plan.dataMb > 0
              ? (credential.dataRemainingMb / plan.dataMb) * 100
              : 100;

        responseSuccess(res, {
          message: captiveSuccess.PLAN_RETRIEVED,
          data: {
            plan: {
              name: plan?.name ?? captiveSuccess.NO_PLAN,
              type: plan ? captivePlanQuotaTypeLabel(plan.quotaType) : captiveSuccess.NO_PLAN,
              status: captiveCredentialStatusLabel(credential.status ?? ''),
              timeUsageMode: plan?.timeUsageMode ?? 'CUMULATIVE_SESSIONS',
              totalTime: totalTimeSec != null ? formatTimeForDisplay(totalTimeSec) : null,
              remainingTime: remainingTimeSec != null ? formatTimeForDisplay(remainingTimeSec) : null,
              totalTimeSec,
              remainingTimeSec,
              expiresAt: credential.expiresAt?.toISOString() ?? null,
            },
            balance: {
              remainingPercent: Math.round(remainingPercent * 10) / 10,
              usedSec: usedTimeSec,
              totalSec: totalTimeSec,
              usedDisplay: formatTimeForDisplay(usedTimeSec),
              totalDisplay: totalTimeSec != null ? formatTimeForDisplay(totalTimeSec) : null,
            },
          },
        });
      } catch (error) {
        logger.error((error as Error).message);
        throw error;
      }
    }),
  ];

  public getPlans = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const credential = req.credential;
        if (!credential?.orgId) {
          responseSuccess(res, { message: captiveSuccess.PLANS, data: [] });
          return;
        }

        const plans = await prisma.plan.findMany({
          where: { orgId: credential.orgId, isActive: true, deletedAt: null },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            code: true,
            name: true,
            description: true,
            quotaType: true,
            timeAmount: true,
            timeUnit: true,
            dataMb: true,
            validityDays: true,
          },
        });

        const data = plans.map((p) => ({
          id: p.id,
          code: p.code,
          name: p.name,
          description: p.description ?? undefined,
          type: captivePlanQuotaTypeLabel(p.quotaType),
          timeAmount: p.timeAmount ?? undefined,
          timeUnit: p.timeUnit ?? undefined,
          dataMb: p.dataMb ?? undefined,
          validityDays: p.validityDays ?? undefined,
          summary: (() => {
            const parts: string[] = [];
            if (p.timeAmount != null) {
              if (p.timeAmount <= 0) {
                parts.push('Unlimited time');
              } else if (p.timeUnit) {
                parts.push(
                  `${p.timeAmount} ${p.timeUnit.toLowerCase()}${p.timeAmount !== 1 ? 's' : ''}`,
                );
              }
            } else if (p.quotaType === 'TIME_ONLY' || p.quotaType === 'TIME_AND_DATA') {
              parts.push('Time');
            }
            if (p.dataMb != null) {
              parts.push(p.dataMb <= 0 ? 'Unlimited data' : `${p.dataMb} MB`);
            } else if (p.quotaType === 'DATA_ONLY' || p.quotaType === 'TIME_AND_DATA') {
              parts.push('Data');
            }
            return parts.length ? parts.join(' · ') : '—';
          })(),
        }));

        responseSuccess(res, { message: captiveSuccess.PLANS, data });
      } catch (error) {
        logger.error((error as Error).message);
        throw error;
      }
    }),
  ];
}
