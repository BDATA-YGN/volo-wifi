import { DEFAULT_PAGINATION_LIMIT } from '@/config';
import { PaginationResult, PaginationArgs } from 'prisma-paginate';

export interface PaginationParams {
    take?: number;
    skip?: number;
    page?: number;
    limit?: number;
    search?: string | number;
    sort_by?: string; // Add sort_by to the interface
    order_by?: 'asc' | 'desc'; // Add order_by to specify the sort direction
  }

// Updated paginate function
export async function paginate({
  model,
  modelArgs = {},
  paginationParams,
}: {
  model: any; // Should be Prisma delegate like prisma.user
  modelArgs?: any;
  paginationParams?: PaginationParams;
}) {
  const paginationArgs = await getPrismaPaginationParams(paginationParams);

  // Order-by precedence (most → least specific):
  //   1. `sort_by` from the request — user-initiated (column header click).
  //      ALWAYS wins so list pages stay interactive.
  //   2. `modelArgs.orderBy` — the controller's static default for the
  //      feature (e.g. `{ jobCode: 'asc' }`). Applies on the initial load
  //      when no `sort_by` was sent.
  //   3. `{ createdAt: 'desc' }` — global fallback when neither is provided.
  //
  // Convention for relation-count columns:
  //   When `sort_by` matches a key already declared inside the controller's
  //   `include._count.select`, rewrite it as Prisma's relation-count syntax
  //   `{ <relation>: { _count: '<dir>' } }`. This lets columns like
  //   "Positions" (rendered from `_count.positions`) be sorted from the
  //   table header without any extra controller wiring — the same `include`
  //   that powers rendering also opts the column into sorting.
  const direction: 'asc' | 'desc' =
    paginationParams?.order_by === 'desc' ? 'desc' : 'asc';
  const sortKey = sanitizeSortField(paginationParams?.sort_by);
  const countFields: Record<string, unknown> | undefined =
    modelArgs?.include?._count?.select;
  const isCountSort = !!(sortKey && countFields && countFields[sortKey]);

  const orderBy = sortKey
    ? isCountSort
      ? { [sortKey]: { _count: direction } }
      : { [sortKey]: direction }
    : modelArgs.orderBy || { createdAt: 'desc' };

  const include =
    modelArgs.include && Object.keys(modelArgs.include).length > 0
      ? modelArgs.include
      : {};

  const result = await model.findMany({
    ...modelArgs,
    take: paginationArgs.limit,
    skip: (paginationArgs.page - 1) * paginationArgs.limit,
    orderBy,
    include,
  });

  const count = await model.count({
    where: modelArgs?.where,
  });

  return transformPaginationResult(result, paginationArgs.page, count, paginationArgs.limit);
}

// Utility function to get pagination parameters
/** Allow only simple Prisma field names (blocks nested-object orderBy injection). */
function sanitizeSortField(field?: string): string | undefined {
  if (field === undefined || field === null) return undefined;
  const key = String(field).trim();
  if (!key || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) return undefined;
  return key;
}

function getPrismaPaginationParams(paginationParams?: PaginationParams): Promise<PaginationArgs> {
  return Promise.resolve({
    limit: Number(paginationParams?.limit) || Number(DEFAULT_PAGINATION_LIMIT),
    page: paginationParams?.page || 1,
  });
}

// Transform pagination result into the expected format
function transformPaginationResult(result: any[], currentPage: number, count: number, limit: number) {
  return {
    data: result,
    meta: {
      currentPage: Number(currentPage),
      totalPages: Math.ceil(count / limit),
      totalRows: count,
    },
  };
}
