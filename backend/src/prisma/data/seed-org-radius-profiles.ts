import type { PrismaClient } from '@/generated/prisma/client';

export type SeedOrgRadiusServersResult = {
  orgCode: string;
  serversCreated: number;
  serversUpdated: number;
  serversRemoved: number;
  devicesCreated: number;
  devicesUpdated: number;
};

const PRIMARY_NAME = 'Primary';
const SECONDARY_NAME = 'Secondary';

/**
 * Seed org FreeRADIUS servers (typically Primary, optional Secondary) and
 * one NAS device row per WiFi site linked to Primary.
 *
 * Site-level legacy radiusSecret / nasIdentifier become device NAS client fields.
 */
export async function seedOrgRadiusProfilesForOrg(
  prisma: PrismaClient,
  orgId: string,
  orgCode: string
): Promise<SeedOrgRadiusServersResult> {
  const stations = await prisma.wifiStation.findMany({
    where: { orgId, deletedAt: null },
    select: {
      id: true,
      code: true,
      name: true,
      radiusSecret: true,
      radiusClientIp: true,
      nasIdentifier: true,
    },
    orderBy: { code: 'asc' },
  });

  // Clear incorrect per-site "profile" rows from the earlier seed.
  await prisma.stationDevice.updateMany({
    where: { orgId, radiusProfileId: { not: null } },
    data: { radiusProfileId: null },
  });

  const obsolete = await prisma.orgRadiusProfile.findMany({
    where: {
      orgId,
      OR: [
        { sourceStationId: { not: null } },
        { deletedAt: null, NOT: { name: { in: [PRIMARY_NAME, SECONDARY_NAME] } } },
      ],
    },
    select: { id: true },
  });

  let serversRemoved = 0;
  if (obsolete.length) {
    await prisma.orgRadiusProfile.deleteMany({
      where: { id: { in: obsolete.map((r) => r.id) } },
    });
    serversRemoved = obsolete.length;
  }

  const hostHint =
    stations.map((s) => s.radiusClientIp?.trim()).find((v) => Boolean(v)) || null;

  let serversCreated = 0;
  let serversUpdated = 0;

  async function upsertServer(name: string, note: string) {
    const existing = await prisma.orgRadiusProfile.findFirst({
      where: { orgId, name, deletedAt: null },
      select: { id: true },
    });
    if (existing) {
      await prisma.orgRadiusProfile.update({
        where: { id: existing.id },
        data: {
          serverHost: hostHint,
          note,
          isActive: true,
          sourceStationId: null,
          sharedSecret: null,
          nasType: 'other',
        },
      });
      serversUpdated += 1;
      return existing.id;
    }
    const created = await prisma.orgRadiusProfile.create({
      data: {
        orgId,
        name,
        serverHost: hostHint,
        note,
        isActive: true,
        sharedSecret: null,
        nasType: 'other',
      },
      select: { id: true },
    });
    serversCreated += 1;
    return created.id;
  }

  const primaryId = await upsertServer(
    PRIMARY_NAME,
    'Default FreeRADIUS server for this tenant. NAS devices select this server and keep their own client secrets.'
  );

  // Optional Secondary only when an env host differs from Primary hint.
  const secondaryHost = process.env.FREERADIUS_SECONDARY_HOST?.trim() || null;
  if (secondaryHost && secondaryHost !== hostHint) {
    await upsertServer(
      SECONDARY_NAME,
      `Secondary FreeRADIUS server (${secondaryHost}).`
    );
    // Keep Secondary host explicit
    await prisma.orgRadiusProfile.updateMany({
      where: { orgId, name: SECONDARY_NAME, deletedAt: null },
      data: { serverHost: secondaryHost },
    });
  }

  let devicesCreated = 0;
  let devicesUpdated = 0;

  for (const station of stations) {
    const secret = station.radiusSecret?.trim() || null;
    const nasShortname =
      station.nasIdentifier?.trim() ||
      station.code.replace(/^ST-/i, '') ||
      station.code;
    const existing = await prisma.stationDevice.findFirst({
      where: { orgId, stationId: station.id, deletedAt: null },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });

    const data = {
      orgId,
      stationId: station.id,
      type: 'ROUTER' as const,
      note: `Seeded from site ${station.code}`,
      isRadiusClient: Boolean(secret),
      radiusProfileId: secret ? primaryId : null,
      radiusSecret: secret,
      nasShortname: secret ? nasShortname : null,
      nasServer: hostHint,
      nasType: 'other',
    };

    if (existing) {
      await prisma.stationDevice.update({
        where: { id: existing.id },
        data,
      });
      devicesUpdated += 1;
    } else {
      await prisma.stationDevice.create({ data });
      devicesCreated += 1;
    }
  }

  // Soft-delete orphan unassigned devices left from manual tests (keep if named intentionally).
  await prisma.stationDevice.updateMany({
    where: {
      orgId,
      deletedAt: null,
      stationId: null,
      note: null,
      isRadiusClient: false,
    },
    data: { deletedAt: new Date() },
  });

  return {
    orgCode,
    serversCreated,
    serversUpdated,
    serversRemoved,
    devicesCreated,
    devicesUpdated,
  };
}
