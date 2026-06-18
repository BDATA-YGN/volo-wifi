import mongoose, { Model, Document, PipelineStage } from 'mongoose';

// PaginationParams interface defined outside the BaseService class
export interface PaginationParams {
  take?: number;
  skip?: number;
  page?: number;
  limit?: number;
  search?: string | number;
  sort_by?: string; // Add sort_by to the interface
  order_by?: 'asc' | 'desc'; // Add order_by to specify the sort direction
}

export class BaseService<T extends Document> {
  constructor(private model: Model<T>, private paginationLimit: number = 10) {}

  // Fetch all records with pagination and optional search
  async findAll(
    paginationParams?: PaginationParams,
    searchFields: string[] = [],
    includeRelations: string | string[] = [],
    select = [],
    filter?: any,
  ) {
    const { search, page, limit, sort_by, order_by } = paginationParams ?? {};
    // console.log("search", search, searchFields, paginationParams);
    let query: any = {
      deletedAt: null, // Assuming you want to ignore soft-deleted records
    };

    // Handle search functionality
    if (search && searchFields.length) {
      query['$or'] = searchFields.map(field => {
        const isNumber = !isNaN(Number(search));
        return isNumber
          ? { [field]: Number(search) } // Direct number match
          : { [field]: { $regex: search, $options: 'i' } }; // Case-insensitive text search
      });
    }

    if (filter) {
      query = { ...query, ...filter };
    }

    // Prepare sorting options
    const sortOptions = sort_by ? { [sort_by]: order_by || 'asc' } : {};

    // Pagination setup
    const pageNumber = page || 1;
    const pageLimit = limit || this.paginationLimit;
    const skip = (pageNumber - 1) * pageLimit;

    let func = this.model.find(query).skip(skip).limit(pageLimit).sort(sortOptions);

    if (includeRelations) {
      if (!Array.isArray(includeRelations)) {
        includeRelations = [includeRelations];
      }

      includeRelations.forEach(includeRelation => {
        func = func.populate(includeRelation);
      });
    }
    // Fetch paginated results
    const results = await func.select(select.join(' ')).exec();

    // Get total count for pagination metadata
    const count = await this.model.countDocuments(query);

    return this.transformPaginationResult(results, pageNumber, count, pageLimit);
  }

  // Fetch records by custom column keys
  async findWithCustomKeys(columnKeys: Record<string, any>, paginationParams?: PaginationParams, includeRelations: any = []) {
    const { page, limit, sort_by, order_by } = paginationParams ?? {};
    const query: any = { ...columnKeys, deletedAt: null }; // Combine custom keys with soft-delete check

    // Prepare sorting options
    const sortOptions = sort_by ? { [sort_by]: order_by || 'asc' } : {};

    // Pagination setup
    const pageNumber = page || 1;
    const pageLimit = limit || this.paginationLimit;
    const skip = (pageNumber - 1) * pageLimit;

    let func = this.model.find(query).skip(skip).limit(pageLimit).sort(sortOptions);

    if (includeRelations) {
      if (!Array.isArray(includeRelations)) {
        includeRelations = [includeRelations];
      }

      includeRelations.forEach(includeRelation => {
        func = func.populate(includeRelation);
      });
    }
    // Fetch results
    const results = await func.exec();

    // Get total count for pagination metadata
    const count = await this.model.countDocuments(query);

    return this.transformPaginationResult(results, pageNumber, count, pageLimit);
  }

  // Fetch records by custom column keys
  async findOne(columnKeys: Record<string, any>, includeRelations: any = []) {
    const query: any = { ...columnKeys, deletedAt: null }; // Combine custom keys with soft-delete check
    // Fetch results
    const result = await this.model.findOne(query).populate(includeRelations);
    return result;
  }

  // Fetch records by a single custom column key
  async findWithCustomKey(columnKey: string, columnValue: any, includeRelations: any = {}, select = []): Promise<T | null> {
    const query: any = { [columnKey]: columnValue, deletedAt: null };

    let queryBuilder = this.model.findOne(query).select(select.join(' '));

    // Dynamically handle population for single or multiple relations
    if (Object.keys(includeRelations).length) {
      if (Array.isArray(includeRelations)) {
        // Populate multiple relations dynamically
        includeRelations.forEach(relation => {
          queryBuilder = queryBuilder.populate(relation);
        });
      } else if (typeof includeRelations === 'object') {
        // Populate nested relations with path & options
        queryBuilder = queryBuilder.populate(includeRelations);
      }
    }

    const result = await queryBuilder.exec();

    console.log(result);

    return result ? (result.toObject() as T) : null;
  }

  // Fetch a single record by ID with optional relations
  async findById(id: string, includeRelations: any = {}) {
    let queryBuilder = this.model.findById(id);

    // Dynamically handle population for single or multiple relations
    if (Object.keys(includeRelations).length) {
      if (Array.isArray(includeRelations)) {
        // Populate multiple relations dynamically
        includeRelations.forEach(relation => {
          queryBuilder = queryBuilder.populate(relation);
        });
      } else if (typeof includeRelations === 'object') {
        // Populate nested relations with path & options
        queryBuilder = queryBuilder.populate(includeRelations);
      }
    }

    const result = await queryBuilder.exec();

    return result ? (result.toObject() as T) : null;
  }

  // Get counts
  async getCount(filter?: any): Promise<number> {
    return await this.model.countDocuments(filter);
  }

  // Create a new record
  async create(data: any) {
    return this.model.create(data);
  }

  // Create multiple records at once
  async createMany(dataArray: any[]) {
    return this.model.insertMany(dataArray);
  }

  // Update an existing record
  async update(id: string, data: any) {
    return this.model.findByIdAndUpdate(id, data, { new: true });
  }

  // Delete a record by ID
  async delete(id: string) {
    return this.model.findByIdAndDelete(id);
  }

  // Upsert multiple records
  async upsertMany(records: Partial<T>[]) {
    // Separate records into updates and inserts
    const updates = records.filter(record => record._id);
    const inserts = records.filter(record => !record._id);

    // Prepare bulk operations for updates
    const bulkOps = updates.map(record => ({
      updateOne: {
        filter: { _id: record._id },
        update: { $set: record as any }, // Type assertion to bypass strict typing
        upsert: true,
      },
    }));

    // Perform bulk updates
    const updateResult = await this.model.bulkWrite(bulkOps);

    // Perform bulk inserts
    const insertResult = await this.model.insertMany(inserts);

    return {
      updateResult,
      insertResult,
    };
  }

  // Fetch records with a join
  async joinWithLookup(localField: string, foreignCollection: string, foreignField: string, alias: string, additionalPipeline: any[] = []) {
    const pipeline = [
      {
        $lookup: {
          from: foreignCollection,
          localField,
          foreignField,
          as: alias,
        },
      },
      ...additionalPipeline, // Add more aggregation stages if needed
    ];

    return this.model.aggregate(pipeline);
  }

  async random(limit: number, $project?: PipelineStage.Project['$project']) {
    const query: any[] = [{ $sample: { size: limit } }];
    if ($project) {
      query.push({ $project });
    }
    return this.model.aggregate(query);
  }

  // Transform pagination result into the expected format
  private transformPaginationResult(result: any[], currentPage: number, count: number, limit: number) {
    return {
      data: result,
      meta: {
        currentPage: Number(currentPage),
        totalPages: Math.ceil(count / limit),
        totalRows: count,
      },
    };
  }
}
