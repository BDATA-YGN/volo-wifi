import type { Prisma, PrismaClient } from '@/generated/prisma/client';

export type RetailPriceScope = 'RESELLER' | 'STATION' | 'STATION_SIZE' | 'DEFAULT';

type PriceBookRow = {
  id: string;
  isDefault: boolean;
  stationSizeId: string | null;
  stations: { stationId: string }[];
  resellers: { resellerId: string }[];
};

function pickPriceFromBooks(
  prices: { retailPrice: Prisma.Decimal; priceBookId: string }[],
  bookIds: Set<string>
): { price: Prisma.Decimal; priceBookId: string } | null {
  const match = prices.find((p) => bookIds.has(p.priceBookId));
  if (!match) return null;
  return { price: match.retailPrice, priceBookId: match.priceBookId };
}

/**
 * Resolve which price-book scope wins for a reseller + site.
 *
 * Winner-takes-all (no per-plan fallthrough):
 *   1. Reseller/Partner books (if any linked to this reseller)
 *   2. Site books (if any linked to this station)
 *   3. Station-size books
 *   4. Organization default book
 */
export function resolveWinningPriceBookIds(
  books: PriceBookRow[],
  resellerId: string,
  stationId: string,
  stationSizeId: string | null
): { scope: RetailPriceScope; bookIds: Set<string> } | null {
  const resellerBookIds = new Set(
    books.filter((b) => b.resellers.some((r) => r.resellerId === resellerId)).map((b) => b.id)
  );
  if (resellerBookIds.size > 0) {
    return { scope: 'RESELLER', bookIds: resellerBookIds };
  }

  const stationBookIds = new Set(
    books.filter((b) => b.stations.some((s) => s.stationId === stationId)).map((b) => b.id)
  );
  if (stationBookIds.size > 0) {
    return { scope: 'STATION', bookIds: stationBookIds };
  }

  const tierBookIds = new Set(
    books
      .filter(
        (b) =>
          Boolean(stationSizeId) &&
          b.stationSizeId === stationSizeId &&
          b.stations.length === 0 &&
          b.resellers.length === 0 &&
          !b.isDefault
      )
      .map((b) => b.id)
  );
  if (tierBookIds.size > 0) {
    return { scope: 'STATION_SIZE', bookIds: tierBookIds };
  }

  const defaultBookIds = new Set(books.filter((b) => b.isDefault).map((b) => b.id));
  if (defaultBookIds.size > 0) {
    return { scope: 'DEFAULT', bookIds: defaultBookIds };
  }

  return null;
}

/**
 * Resolve retail unit price for a partner sale.
 * Uses the winning scope book only — missing plan rows do not fall through
 * to a lower scope (Reseller → Site → Org default).
 */
export async function resolveRetailPrice(
  prisma: PrismaClient,
  orgId: string,
  resellerId: string,
  stationId: string,
  planId: string
): Promise<{ price: Prisma.Decimal; priceBookId: string; scope: RetailPriceScope } | null> {
  const station = await prisma.wifiStation.findFirst({
    where: { id: stationId, orgId, deletedAt: null },
    select: { id: true, stationSizeId: true },
  });
  if (!station) return null;

  const books = await prisma.planPriceBook.findMany({
    where: {
      orgId,
      deletedAt: null,
      OR: [
        { stations: { some: { stationId } } },
        { resellers: { some: { resellerId } } },
        { stationSizeId: station.stationSizeId },
        { isDefault: true },
      ],
    },
    select: {
      id: true,
      isDefault: true,
      stationSizeId: true,
      stations: { select: { stationId: true } },
      resellers: { select: { resellerId: true } },
    },
  });

  const winning = resolveWinningPriceBookIds(
    books,
    resellerId,
    stationId,
    station.stationSizeId
  );
  if (!winning) return null;

  const prices = await prisma.planPrice.findMany({
    where: {
      orgId,
      deletedAt: null,
      isActive: true,
      planId,
      priceBookId: { in: [...winning.bookIds] },
    },
    select: { retailPrice: true, priceBookId: true },
  });

  const picked = pickPriceFromBooks(prices, winning.bookIds);
  if (!picked) return null;
  return { ...picked, scope: winning.scope };
}

export type RetailPriceHit = {
  price: Prisma.Decimal;
  priceBookId: string;
  scope: RetailPriceScope;
};

/**
 * Resolve many plan/site prices with three queries instead of three per pair.
 * Same winner-takes-all rules as `resolveRetailPrice`.
 */
export async function loadRetailPriceIndex(
  prisma: PrismaClient,
  orgId: string,
  resellerId: string,
  stationIds: string[],
  planIds: string[],
): Promise<{
  priceFor: (stationId: string, planId: string) => RetailPriceHit | null;
  hasDefaultBook: boolean;
}> {
  const uniqueStations = [...new Set(stationIds)];
  const uniquePlans = [...new Set(planIds)];
  const empty = {
    priceFor: () => null as RetailPriceHit | null,
    hasDefaultBook: false,
  };
  if (uniqueStations.length === 0 || uniquePlans.length === 0) {
    const defaultBook = await prisma.planPriceBook.findFirst({
      where: { orgId, deletedAt: null, isDefault: true },
      select: { id: true },
    });
    return { ...empty, hasDefaultBook: Boolean(defaultBook) };
  }

  const stations = await prisma.wifiStation.findMany({
    where: { id: { in: uniqueStations }, orgId, deletedAt: null },
    select: { id: true, stationSizeId: true },
  });
  const stationById = new Map(stations.map((station) => [station.id, station]));
  const sizeIds = [
    ...new Set(stations.map((station) => station.stationSizeId).filter((id): id is string => Boolean(id))),
  ];

  const books = await prisma.planPriceBook.findMany({
    where: {
      orgId,
      deletedAt: null,
      OR: [
        { stations: { some: { stationId: { in: uniqueStations } } } },
        { resellers: { some: { resellerId } } },
        ...(sizeIds.length > 0 ? [{ stationSizeId: { in: sizeIds } }] : []),
        { isDefault: true },
      ],
    },
    select: {
      id: true,
      isDefault: true,
      stationSizeId: true,
      stations: { select: { stationId: true } },
      resellers: { select: { resellerId: true } },
    },
  });

  const winners = new Map<string, { scope: RetailPriceScope; bookIds: Set<string> }>();
  const bookIds = new Set<string>();
  for (const station of stations) {
    const winning = resolveWinningPriceBookIds(
      books,
      resellerId,
      station.id,
      station.stationSizeId,
    );
    if (!winning) continue;
    winners.set(station.id, winning);
    for (const id of winning.bookIds) bookIds.add(id);
  }

  const prices =
    bookIds.size === 0
      ? []
      : await prisma.planPrice.findMany({
          where: {
            orgId,
            deletedAt: null,
            isActive: true,
            planId: { in: uniquePlans },
            priceBookId: { in: [...bookIds] },
          },
          select: { retailPrice: true, priceBookId: true, planId: true },
        });
  const pricesByPlan = new Map<string, { retailPrice: Prisma.Decimal; priceBookId: string }[]>();
  for (const row of prices) {
    const list = pricesByPlan.get(row.planId) ?? [];
    list.push(row);
    pricesByPlan.set(row.planId, list);
  }

  return {
    hasDefaultBook: books.some((book) => book.isDefault),
    priceFor: (stationId: string, planId: string) => {
      if (!stationById.has(stationId)) return null;
      const winning = winners.get(stationId);
      if (!winning) return null;
      const picked = pickPriceFromBooks(pricesByPlan.get(planId) ?? [], winning.bookIds);
      if (!picked) return null;
      return { ...picked, scope: winning.scope };
    },
  };
}

/**
 * Partner selling readiness using the same winner-takes-all resolver as sales.
 */
export async function loadPricingReadiness(
  prisma: PrismaClient,
  orgId: string,
  resellerId: string,
  entitledPlanIds: string[],
  stationIds: string[]
): Promise<{
  pricedPlanCount: number;
  hasPricing: boolean;
  hasDefaultBook: boolean;
  pricedPlanIds: string[];
  priceScope: RetailPriceScope | null;
}> {
  if (entitledPlanIds.length === 0 || stationIds.length === 0) {
    const prices = await loadRetailPriceIndex(prisma, orgId, resellerId, [], []);
    return {
      pricedPlanCount: 0,
      hasPricing: false,
      hasDefaultBook: prices.hasDefaultBook,
      pricedPlanIds: [],
      priceScope: null,
    };
  }

  const covered = new Set<string>();
  let priceScope: RetailPriceScope | null = null;
  const prices = await loadRetailPriceIndex(
    prisma,
    orgId,
    resellerId,
    stationIds,
    entitledPlanIds,
  );

  for (const planId of entitledPlanIds) {
    for (const stationId of stationIds) {
      const price = prices.priceFor(stationId, planId);
      if (price) {
        covered.add(planId);
        priceScope = priceScope ?? price.scope;
        break;
      }
    }
  }

  return {
    pricedPlanCount: covered.size,
    hasPricing: covered.size > 0,
    hasDefaultBook: prices.hasDefaultBook,
    pricedPlanIds: [...covered],
    priceScope,
  };
}
