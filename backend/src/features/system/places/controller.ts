import { Request, Response } from 'express';
import Container from 'typedi';
import type { Prisma, PrismaClient } from '@/generated/prisma/client';
import { asyncController } from '@/utils/async-controller';
import { responseSuccess } from '@/utils/api-response';

export async function listDistinctPlaceTowns(
  prisma: PrismaClient,
  region?: string,
): Promise<string[]> {
  const where: Prisma.PlacesWhereInput = {
    deletedAt: null,
    town: { not: null },
    ...(region ? { region } : {}),
  };

  const rows = await prisma.places.findMany({
    where,
    select: { town: true },
    distinct: ['town'],
    orderBy: { town: 'asc' },
  });

  return rows.map((r) => r.town?.trim()).filter(Boolean) as string[];
}

/**
 * Places lookup — distinct town names from `tbl_places` for SMS township pickers.
 *
 *   GET /places/towns?region=Rakhine   distinct towns (auth)
 */
export class PlacesController {
  private get prisma(): PrismaClient {
    return Container.get<PrismaClient>('prismaClient');
  }

  public towns = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const region =
        typeof req.query.region === 'string' && req.query.region.trim()
          ? req.query.region.trim()
          : undefined;

      const list = await listDistinctPlaceTowns(this.prisma, region);

      responseSuccess(res, { message: 'Success', data: list });
    }),
  ];
}
