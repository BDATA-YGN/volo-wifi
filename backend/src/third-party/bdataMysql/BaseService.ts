import { Prisma, PrismaClient } from '@/generated/prisma/client';
import { paginate, PaginationParams } from './pagination';
import { logger } from '@/logging/logger';

export class BaseService<T, WhereInput = any> {
  public model: any;
  private prismaClient: PrismaClient;

  constructor(model: any, prismaClient: PrismaClient) {
    this.model = model;
    this.prismaClient = prismaClient;
  }

  // Fetch all records with pagination and optional search
  async findAll(paginationParams?: PaginationParams, searchFields: string[] = [], includeRelations: any = {}, whereObject?: any, customOrderBy?: any) {
    const { search } = paginationParams ?? {};
    
    // Remove undefined values from whereObject
    const cleanedWhere = Object.fromEntries(
      Object.entries(whereObject || {}).filter(([_, v]) => v !== undefined)
    );

    const whereCondition: WhereInput = {
      ...cleanedWhere,
      deletedAt: null,
    } as WhereInput;

    const searchIsInvalidNumber =
      typeof search === 'number' && !Number.isFinite(search);

    const hasSearch =
      !searchIsInvalidNumber &&
      search !== undefined &&
      search !== null &&
      search !== '' &&
      !(typeof search === 'string' && search.trim() === '') &&
      searchFields.length > 0;

    if (hasSearch) {
      const useExactMatch =
        typeof search === 'number' && Number.isFinite(search);

      whereCondition['OR'] = searchFields.map((field) =>
        useExactMatch
          ? { [field]: search }
          : { [field]: { contains: String(search), mode: 'insensitive' as const } },
      ) as any;
    }

    return paginate({
      model: this.model,
      modelArgs: {
        where: whereCondition,
        include: includeRelations,
        orderBy: customOrderBy,
      },
      paginationParams,
    });
  }

  // Fetch all raw data with pagination and search
  async rawFindAll(paginationParams?: PaginationParams, searchFields: string[] = [], includeRelations: any = {}) {
    return this.findAll(paginationParams, searchFields, includeRelations);
  }

  // Fetch data based on custom column
  async findWithCustomKey(column: string, columnValue?: any, includeRelations: any = {}, array = false) {
    const whereCondition: any = {
      [column]: columnValue ? columnValue : { not: null },
      deletedAt: null,
    };

    const records = await this.model.findMany({
      where: whereCondition,
      include: includeRelations,
    });

    return array ? records : records[0] || null;
  }

  async findWithCustomKeys(columnKeys: Record<string, any>, paginationParams?: PaginationParams, includeRelations: any = {}) {
    const query: any = {
      ...columnKeys,
      deletedAt: null,
    };

    return paginate({
      model: this.model,
      modelArgs: {
        where: query,
        include: includeRelations,
      },
      paginationParams,
    });
  }

  // Fetch a single record by ID with optional relations
  async findById(id: string | number, include: Record<string, boolean> | undefined = undefined, whereObject?: any) {
    const record = await this.model.findFirst({
      where: { id, deletedAt: null, ...whereObject },
      include: include || undefined,
    });
    if (!record) return null;
    return record;
  }

  // Create a new record
  async create(data: any, checkColumn?: any) {
    try {
      if (checkColumn) {
        const existingRecord = await this.model.findFirst({
          where: { [checkColumn]: data[checkColumn] },
        });
        if (existingRecord) {
          throw new Error('Record already exists');
        }
      }
      return this.model.create({ data });
    } catch (error) {
      logger.error('Error creating record', { error });
      throw error;
    }
  }

  // Create multiple records
  async createMany(dataArray: any[]) {
    return this.model.createMany({ data: dataArray });
  }

  // Update an existing record
  async update(id: string | number, data: any) {
    return this.model.update({ where: { id }, data });
  }

  // Upsert a record (update if exists, create if not)
  async upsert(where: any, data: any) {
    return this.model.upsert({
      where,
      update: data,
      create: data
    });
  }

  // Upsert multiple records
  async upsertMany<T extends { id?: string }>(records: T[]) {
    // Separate records into updates (those with an id) and inserts (those without an id)
    const updates = records.filter((record) => record.id !== undefined);
    const inserts = records.filter((record) => record.id === undefined);

    return this.prismaClient.$transaction([
      // Perform bulk upserts for updates
      ...updates.map((record) =>
        this.model.upsert({
          where: { id: record.id as string }, // Assert `id` is string
          update: record,
          create: record,
        })
      ),

      // Perform bulk inserts
      this.model.createMany({
        data: inserts,
        skipDuplicates: true, // Avoids inserting duplicates based on unique constraints
      }),
    ]);
  }

  // Delete a record by ID
  async delete(id: any) {
    return this.model.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  /**
   * Parameterized raw SQL only (`$queryRaw` tagged template). Prefer Prisma queries.
   */
  async executeRawQuery(query: TemplateStringsArray, ...params: any[]) {
    let result: any = await this.prismaClient.$queryRaw(query, ...params);
    result = result?.length > 0 ? result : null;
    return result;
  }

  /** Disabled — dynamic procedure names are an SQL injection risk. */
  async executeStoredProcedure(_procName: string): Promise<never> {
    throw new Error('executeStoredProcedure is disabled. Use Prisma or parameterized $queryRaw.');
  }

  /** Disabled — dynamic view/column SQL is an SQL injection risk. */
  async fetchView(_viewName: string, _whereOptions: Prisma.JsonObject = {}): Promise<never> {
    throw new Error('fetchView is disabled. Use Prisma models or parameterized $queryRaw.');
  }

  // Custom Prisma ORM query
  async customQuery(queryArgs: any) {
    const result = await this.model.findMany(queryArgs, this.prismaClient);
    return result;
  }

  // Execute operations in a transaction
  async executeTransaction(operations: (prisma: PrismaClient) => Prisma.PrismaPromise<any>[]) {
    const result = await this.prismaClient.$transaction(operations(this.prismaClient));
    return result;
  }

  baseModel() {
    return this.model;
  }
}
