import { Request, Response } from 'express';
import Container from 'typedi';
import { ValidationMiddleware } from '@/middlewares/validation.middleware';
import { responseSuccess } from '@/utils/api-response';
import { asyncController } from '@/utils/async-controller';
import type { PrismaClient } from '@/generated/prisma/client';
import { isUndefinedOrUndefinedString } from '@/utils/string-utils';

import { AppSettingSchema, AppShellBatchSchema } from './schema';

/** Keys aggregated for SSR + App Drawer (matches `AppSettings` in the frontend provider). */
const APP_SHELL_KEYS = [
  'app_name',
  'app_short_code',
  'app_version',
  'app_icon',
  'login_text',
  'login_icon',
  'show_menu_logo',
  'show_menu_text',
  'notifications_enabled',
  'site_name',
  'site_description',
  'default_locale',
  'currency_code',
  'currency_symbol',
  'maintenance_mode',
  'maintenance_message',
  'sms_company_legal_name',
  'support_contacts',
] as const;

function toStoredValue(field: string, raw: unknown): string {
  if (typeof raw === 'boolean') return raw ? 'true' : 'false';
  if (raw === undefined || raw === null) return '';
  return String(raw);
}

/**
 * AppSetting REST controller — HR / System domain.
 *
 *   GET    /app-settings/:id?           list (optional `category` filter) or single
 *   GET    /app-settings/key/:key       lookup by unique `key`
 *   POST   /app-settings/:id?           create (no id) / update (with id)
 *   DELETE /app-settings/delete/:id     hard delete (no `deletedAt` column on this table)
 *
 * Note: this feature intentionally bypasses `BaseService` because the
 * `AppSetting` Prisma model has no `deletedAt` column — `BaseService`'s
 * implicit soft-delete filter would crash queries here.
 */
export class AppSettingController {
  private get prisma(): PrismaClient {
    return Container.get<PrismaClient>('prismaClient');
  }

  /**
   * Public bootstrap payload for Next.js `getAppSettings` — mirrors legacy
   * `GET /wrap/app` shape: `{ data: { metaKey, metaType, value: AppSettings } }`.
   */
  public publicAppShell = [
    asyncController(async (_req: Request, res: Response): Promise<void> => {
      const rows = await this.prisma.appSetting.findMany({
        where: { key: { in: [...APP_SHELL_KEYS] } },
      });
      const map = Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, string>;

      const bool = (k: string) => map[k] === 'true' || map[k] === '1';
      const value = {
        app_name: map.app_name ?? '',
        app_short_code: map.app_short_code ?? '',
        app_version: map.app_version ?? '',
        app_icon: map.app_icon ?? '',
        login_text: map.login_text ?? '',
        login_icon: map.login_icon ?? '',
        show_menu_logo: bool('show_menu_logo'),
        show_menu_text: bool('show_menu_text'),
        notifications_enabled: bool('notifications_enabled'),
        site_name: map.site_name ?? map.app_name ?? '',
        site_description: map.site_description ?? '',
        default_locale: map.default_locale ?? 'en',
        currency_code: map.currency_code ?? 'MMK',
        currency_symbol: map.currency_symbol ?? 'Ks',
        maintenance_mode: bool('maintenance_mode'),
        maintenance_message: map.maintenance_message ?? '',
        sms_company_legal_name: map.sms_company_legal_name ?? '',
        support_contacts: map.support_contacts ?? '',
      };

      responseSuccess(res, {
        message: 'Success',
        data: {
          metaKey: 'app',
          metaType: 'JSON',
          value,
        },
      });
    }),
  ];

  /** Authenticated batch update for App Drawer fields (one `app_settings` row per key). */
  public updateAppShellBatch = [
    ValidationMiddleware(AppShellBatchSchema),
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const body = req.body as Record<string, unknown>;
      const entries = Object.entries(body).filter(([, v]) => v !== undefined);
      if (!entries.length) {
        responseSuccess(res, { message: 'Nothing to update', data: {} });
        return;
      }
      const ops = entries.map(([field, raw]) =>
        this.prisma.appSetting.update({
          where: { key: field },
          data: { value: toStoredValue(field, raw) },
        }),
      );
      await this.prisma.$transaction(ops);
      responseSuccess(res, { message: 'App shell settings saved', data: {} });
    }),
  ];

  // ── GET /app-settings/:id?  ────────────────────────────────────────────
  public listOrDetails = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const { category } = req.query as { category?: string };

      if (!isUndefinedOrUndefinedString(req.params?.id)) {
        const id = String(req.params.id);
        const record = await this.prisma.appSetting.findUnique({
          where: { id },
        });
        responseSuccess(res, { message: 'Success', data: record });
        return;
      }

      const where = category ? { category } : {};
      const data = await this.prisma.appSetting.findMany({
        where,
        orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { key: 'asc' }],
        take: 500,
      });

      responseSuccess(res, {
        message: 'Success',
        data,
        meta: {
          totalRows: data.length,
          currentPage: 1,
          totalPages: 1,
          limit: 500,
        },
      });
    }),
  ];

  // ── GET /app-settings/key/:key ─────────────────────────────────────────
  public getByKey = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const key = String(req.params.key);
      const record = await this.prisma.appSetting.findUnique({
        where: { key },
      });
      responseSuccess(res, { message: 'Success', data: record });
    }),
  ];

  // ── POST /app-settings/:id?  (create or update) ────────────────────────
  public createOrUpdate = [
    ValidationMiddleware(AppSettingSchema),
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const id = req.params?.id ?? null;
      const payload = req.body ?? {};

      if (!id) {
        await this.prisma.appSetting.create({ data: payload });
      } else {
        // Never allow the unique `key` to be mutated during update —
        // the URL `id` is the authoritative identifier.
        const { key: _key, ...updates } = payload;
        await this.prisma.appSetting.update({
          where: { id: String(id) },
          data: updates,
        });
      }
      responseSuccess(res, { message: 'Setting saved', data: {} });
    }),
  ];

  // ── DELETE /app-settings/delete/:id ───────────────────────────────────
  public remove = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      await this.prisma.appSetting.delete({ where: { id: String(req.params.id) } });
      responseSuccess(res, { message: 'Setting deleted', data: {} });
    }),
  ];
}
