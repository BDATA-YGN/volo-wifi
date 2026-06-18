import * as fs from 'fs';
import type { Prisma, PrismaClient } from '@/generated/prisma/client';

export interface TranslationThemeBackup {
  version: 1;
  exportedAt: string;
  translations: Array<{
    id: number;
    locale: string;
    messages: Prisma.JsonValue;
  }>;
  themes: Array<{
    id: string;
    name: string;
    lightTheme: Prisma.JsonValue;
    darkTheme: Prisma.JsonValue;
    isDefault: boolean;
    isActive: boolean;
  }>;
}

export async function seedTranslationsThemesFromJson(
  prisma: PrismaClient,
  filePath: string,
): Promise<{ translations: number; themes: number }> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Translation/themes JSON not found: ${filePath}`);
  }

  const payload = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as TranslationThemeBackup;
  if (payload.version !== 1 || !Array.isArray(payload.translations) || !Array.isArray(payload.themes)) {
    throw new Error('Invalid translation/themes JSON: expected version 1 with translations and themes arrays');
  }

  await prisma.$transaction([
    prisma.translation.deleteMany({}),
    prisma.theme.deleteMany({}),
  ]);

  for (const row of payload.translations) {
    await prisma.translation.create({
      data: { locale: row.locale, messages: row.messages as Prisma.InputJsonValue },
    });
  }

  for (const row of payload.themes) {
    await prisma.theme.create({
      data: {
        id: row.id,
        name: row.name,
        lightTheme: row.lightTheme as Prisma.InputJsonValue,
        darkTheme: row.darkTheme as Prisma.InputJsonValue,
        isDefault: row.isDefault,
        isActive: row.isActive,
      },
    });
  }

  return { translations: payload.translations.length, themes: payload.themes.length };
}
