import PrismaDBConnection from '@/prisma/prisma-client';

export interface InitialCheck {
  key: string;
  label: string;
  ready: boolean;
  detail?: string;
}

export interface ReadinessReport {
  status: 'ok' | 'degraded';
  ready: boolean;
  version: string;
  initial: InitialCheck[];
}

export async function getReadinessReport(version: string): Promise<ReadinessReport> {
  const initial: InitialCheck[] = [];

  try {
    const prisma = PrismaDBConnection.getConnection();
    await prisma.$queryRaw`SELECT 1`;
    initial.push({ key: 'database', label: 'Database connection', ready: true });

    const [appSettingCount, adminCount, menuGroupCount, roleCount] = await Promise.all([
      prisma.appSetting.count(),
      prisma.admin.count({ where: { deletedAt: null, isActive: true } }),
      prisma.menuGroup.count({ where: { deletedAt: null } }),
      prisma.mngRoles.count({ where: { deletedAt: null } }),
    ]);

    initial.push({
      key: 'app_settings',
      label: 'Application settings',
      ready: appSettingCount > 0,
      detail: appSettingCount > 0 ? undefined : 'Run: yarn seed',
    });
    initial.push({
      key: 'admins',
      label: 'Administrator account',
      ready: adminCount > 0,
      detail: adminCount > 0 ? undefined : 'Run: yarn seed',
    });
    initial.push({
      key: 'menu',
      label: 'Navigation menu',
      ready: menuGroupCount > 0,
      detail: menuGroupCount > 0 ? undefined : 'Run: yarn seed or yarn data:menu:restore',
    });
    initial.push({
      key: 'roles',
      label: 'Role permissions',
      ready: roleCount > 0,
      detail: roleCount > 0 ? undefined : 'Run: yarn seed or yarn data:roles:restore',
    });
  } catch (err) {
    const message = 'Connection failed';
    initial.push({
      key: 'database',
      label: 'Database connection',
      ready: false,
      detail: message,
    });
  }

  const ready = initial.every((check) => check.ready);
  return {
    status: ready ? 'ok' : 'degraded',
    ready,
    version,
    initial,
  };
}
