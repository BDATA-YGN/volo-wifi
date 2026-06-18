import appSettingsData from './data/appSettings';
import { adminsData } from './data/admins';
import { MENU_JSON, ROLE_SETTINGS_JSON, TRANSLATION_THEMES_JSON } from './data/json-paths';
import { seedAllPlaces } from './data/seed-places';
import { seedMenuFromJson } from './data/seed-menu-from-json';
import { seedRoleSettingsFromJson } from './data/seed-role-settings-from-json';
import { seedTranslationsThemesFromJson } from './data/seed-translations-themes-from-json';
import { seedStationCapacityTiers } from './data/seed-station-capacity-tiers';
import PrismaDBConnection from '@/prisma/prisma-client';

const prisma = PrismaDBConnection.getConnection();

async function seedAppSettings(): Promise<void> {
  console.log('Seeding app_settings...');

  for (const row of appSettingsData) {
    await prisma.appSetting.upsert({
      where: { key: row.key },
      create: {
        key: row.key,
        value: row.value,
        defaultValue: row.defaultValue ?? null,
        valueType: row.valueType,
        controlType: row.controlType ?? null,
        options: row.options ?? null,
        category: row.category ?? null,
        sortOrder: row.sortOrder ?? 0,
        labelEn: row.labelEn ?? null,
        labelMy: row.labelMy ?? null,
        description: row.description ?? null,
        isPublic: row.isPublic ?? false,
      },
      update: {
        value: row.value,
        defaultValue: row.defaultValue ?? null,
        valueType: row.valueType,
        controlType: row.controlType ?? null,
        options: row.options ?? null,
        category: row.category ?? null,
        sortOrder: row.sortOrder ?? 0,
        labelEn: row.labelEn ?? null,
        labelMy: row.labelMy ?? null,
        description: row.description ?? null,
        isPublic: row.isPublic ?? false,
      },
    });
  }

  const removedSettingKeys = ['dev_access_token_lifetime', 'dev_refresh_token_lifetime'];
  const deleted = await prisma.appSetting.deleteMany({
    where: { key: { in: removedSettingKeys } },
  });
  if (deleted.count > 0) {
    console.log(`Removed obsolete app_settings keys: ${removedSettingKeys.join(', ')} (${deleted.count}).`);
  }

  console.log(`app_settings seeded (${appSettingsData.length} rows).`);
}

async function seedAdmins(): Promise<void> {
  console.log('Seeding admins...');

  for (const row of adminsData) {
    await prisma.admin.upsert({
      where: { username: row.username },
      create: {
        fullName: row.fullName,
        username: row.username,
        email: row.email ?? null,
        password: row.password,
        roleId: row.roleId,
        isActive: row.isActive ?? true,
        isSuper: row.isSuper ?? true,
        isVerified: row.isVerified ?? true,
        createdBy: row.createdBy ?? 'system',
        updatedBy: row.updatedBy ?? null,
      },
      update: {
        fullName: row.fullName,
        email: row.email ?? null,
        password: row.password,
        roleId: row.roleId,
        isActive: row.isActive ?? true,
        isSuper: row.isSuper ?? true,
        isVerified: row.isVerified ?? true,
        updatedBy: row.updatedBy ?? 'system',
        deletedAt: null,
      },
    });
  }

  console.log(`admins seeded (${adminsData.length} rows).`);
}

async function main() {
  try {
    console.log('Starting seed process...');

    await seedAppSettings();

    console.log(`Seeding menu from ${MENU_JSON}...`);
    const menu = await seedMenuFromJson(prisma, MENU_JSON);
    console.log(`menu seeded (${menu.groups} groups, ${menu.items} items).`);

    console.log(`Seeding role settings from ${ROLE_SETTINGS_JSON}...`);
    const roles = await seedRoleSettingsFromJson(prisma, ROLE_SETTINGS_JSON);
    console.log(
      `role settings seeded (${roles.roles} roles, ${roles.mngSettings} mng settings, ${roles.mapSettings} map settings).`,
    );

    await seedAdmins();

    console.log('Seeding WiFi capacity tiers and platform license rates...');
    const capacity = await seedStationCapacityTiers(prisma);
    console.log(
      `capacity tiers seeded (${capacity.tiers} tiers, ${capacity.prices} new monthly rates).`,
    );

    console.log(`Seeding translations & themes from ${TRANSLATION_THEMES_JSON}...`);
    const i18n = await seedTranslationsThemesFromJson(prisma, TRANSLATION_THEMES_JSON);
    console.log(`translations & themes seeded (${i18n.translations} locales, ${i18n.themes} themes).`);

    console.log('Seeding places from CSV files...');
    const places = await seedAllPlaces(prisma);
    console.log(`places seeded (${places.files} files, inserted=${places.inserted}, skipped=${places.skipped}).`);

    console.log('Seed completed successfully.');
  } catch (error) {
    console.error('Error seeding data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
