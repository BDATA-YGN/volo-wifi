import { Pool, type PoolClient, type QueryResultRow } from 'pg';

/** Logical field → possible physical column names (camelCase first for live volo_db). */
const FIELD_ALIASES: Record<string, string[]> = {
  id: ['id'],
  orgId: ['orgId', 'org_id'],
  adminId: ['adminId', 'admin_id'],
  code: ['code'],
  name: ['name'],
  description: ['description'],
  stationCodePrefix: ['stationCodePrefix', 'station_code_prefix'],
  planCodePrefix: ['planCodePrefix', 'plan_code_prefix'],
  resellerCodePrefix: ['resellerCodePrefix', 'reseller_code_prefix'],
  agentCodePrefix: ['agentCodePrefix', 'agent_code_prefix'],
  timezone: ['timezone'],
  currency: ['currency'],
  announcement: ['announcement'],
  enableAnnouncement: ['enableAnnouncement', 'enable_announcement'],
  isActive: ['isActive', 'is_active'],
  createdAt: ['createdAt', 'created_at'],
  updatedAt: ['updatedAt', 'updated_at'],
  deletedAt: ['deletedAt', 'deleted_at'],
  location: ['location'],
  address: ['address'],
  status: ['status'],
  portalBaseUrl: ['portalBaseUrl', 'portal_base_url'],
  nasIdentifier: ['nasIdentifier', 'nas_identifier'],
  radiusClientIp: ['radiusClientIp', 'radius_client_ip'],
  radiusSecret: ['radiusSecret', 'radius_secret'],
  vlanId: ['vlanId', 'vlan_id'],
  radiusVendorProfileId: ['radiusVendorProfileId', 'radius_vendor_profile_id'],
  stationId: ['stationId', 'station_id'],
  type: ['type'],
  vendor: ['vendor'],
  model: ['model'],
  serialNo: ['serialNo', 'serial_no'],
  macAddr: ['macAddr', 'mac_addr'],
  ipAddr: ['ipAddr', 'ip_addr'],
  note: ['note'],
  isRadiusClient: ['isRadiusClient', 'is_radius_client'],
  nasShortname: ['nasShortname', 'nas_shortname'],
  nasType: ['nasType', 'nas_type'],
  nasPorts: ['nasPorts', 'nas_ports'],
  nasServer: ['nasServer', 'nas_server'],
  nasCommunity: ['nasCommunity', 'nas_community'],
  quotaType: ['quotaType', 'quota_type'],
  timeAmount: ['timeAmount', 'time_amount'],
  timeUnit: ['timeUnit', 'time_unit'],
  dataMb: ['dataMb', 'data_mb'],
  validityDays: ['validityDays', 'validity_days'],
  maxDevices: ['maxDevices', 'max_devices'],
  timeUsageMode: ['timeUsageMode', 'time_usage_mode'],
  isDefault: ['isDefault', 'is_default'],
  resellerId: ['resellerId', 'reseller_id'],
  agentId: ['agentId', 'agent_id'],
  priceBookId: ['priceBookId', 'price_book_id'],
  planId: ['planId', 'plan_id'],
  retailPrice: ['retailPrice', 'retail_price'],
  costPrice: ['costPrice', 'cost_price'],
  phone: ['phone'],
  email: ['email'],
  stationIds: ['stationIds', 'station_ids'],
  isEnabled: ['isEnabled', 'is_enabled'],
  batchNo: ['batchNo', 'batch_no'],
  quantity: ['quantity'],
  remainingQuantity: ['remainingQuantity', 'remaining_quantity'],
  prefix: ['prefix'],
  token: ['token'],
  username: ['username'],
  passwordHash: ['passwordHash', 'password_hash'],
  soldAt: ['soldAt', 'sold_at'],
  activatedAt: ['activatedAt', 'activated_at'],
  expiresAt: ['expiresAt', 'expires_at'],
  revokedAt: ['revokedAt', 'revoked_at'],
  singleSessionResellerUnlockAt: [
    'singleSessionResellerUnlockAt',
    'single_session_reseller_unlock_at',
  ],
  timeRemainingSec: ['timeRemainingSec', 'time_remaining_sec'],
  dataRemainingMb: ['dataRemainingMb', 'data_remaining_mb'],
  voucherBatchId: ['voucherBatchId', 'voucher_batch_id'],
  orderNo: ['orderNo', 'order_no'],
  subtotal: ['subtotal'],
  discount: ['discount'],
  total: ['total'],
  orderId: ['orderId', 'order_id'],
  credentialId: ['credentialId', 'credential_id'],
  qty: ['qty'],
  unitPrice: ['unitPrice', 'unit_price'],
  lineTotal: ['lineTotal', 'line_total'],
  method: ['method'],
  amount: ['amount'],
  refNo: ['refNo', 'ref_no'],
  paidAt: ['paidAt', 'paid_at'],
  periodFrom: ['periodFrom', 'period_from'],
  periodTo: ['periodTo', 'period_to'],
  value: ['value'],
  stationLimit: ['stationLimit', 'station_limit'],
  currentActiveStationCount: [
    'currentActiveStationCount',
    'current_active_station_count',
  ],
  unitPricePerStation: ['unitPricePerStation', 'unit_price_per_station'],
  billingCycle: ['billingCycle', 'billing_cycle'],
  effectiveFrom: ['effectiveFrom', 'effective_from'],
  notes: ['notes'],
};

export type NamingStyle = 'camelCase' | 'snake_case' | 'mixed' | 'unknown';

export class OldSource {
  readonly pool: Pool;
  private columnsByTable = new Map<string, Set<string>>();
  private resolved = new Map<string, string | null>();
  tablesPresent: string[] = [];
  namingStyle: NamingStyle = 'unknown';
  adminTable: 'cd_admin' | 'tbl_admin' = 'cd_admin';

  constructor(connectionString: string, sslEnabled: boolean) {
    this.pool = new Pool({
      connectionString,
      max: 4,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 20_000,
      ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
    });
  }

  async connect(): Promise<void> {
    const client = await this.pool.connect();
    try {
      const tables = await client.query<{ table_name: string }>(
        `SELECT table_name
         FROM information_schema.tables
         WHERE table_schema = 'public'
           AND (table_name LIKE 'wf_%' OR table_name IN ('cd_admin', 'tbl_admin'))
         ORDER BY table_name`,
      );
      this.tablesPresent = tables.rows.map((r) => r.table_name);
      this.adminTable = this.tablesPresent.includes('cd_admin')
        ? 'cd_admin'
        : 'tbl_admin';

      for (const table of this.tablesPresent) {
        const cols = await client.query<{ column_name: string }>(
          `SELECT column_name
           FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = $1`,
          [table],
        );
        this.columnsByTable.set(table, new Set(cols.rows.map((r) => r.column_name)));
      }

      const sample = this.columnsByTable.get('wf_org');
      if (sample) {
        const hasCamel = sample.has('orgId') || sample.has('isActive') || sample.has('createdAt');
        const hasSnake = sample.has('org_id') || sample.has('is_active') || sample.has('created_at');
        if (hasCamel && hasSnake) this.namingStyle = 'mixed';
        else if (hasCamel) this.namingStyle = 'camelCase';
        else if (hasSnake) this.namingStyle = 'snake_case';
      }
    } finally {
      client.release();
    }
  }

  hasTable(table: string): boolean {
    return this.columnsByTable.has(table);
  }

  hasColumn(table: string, logicalField: string): boolean {
    return this.col(table, logicalField) != null;
  }

  /** Resolve physical column for a logical field, or null if absent. */
  col(table: string, logicalField: string): string | null {
    const key = `${table}.${logicalField}`;
    if (this.resolved.has(key)) return this.resolved.get(key)!;

    const cols = this.columnsByTable.get(table);
    if (!cols) {
      this.resolved.set(key, null);
      return null;
    }

    const aliases = FIELD_ALIASES[logicalField] ?? [logicalField, toSnake(logicalField)];
    for (const alias of aliases) {
      if (cols.has(alias)) {
        this.resolved.set(key, alias);
        return alias;
      }
    }
    this.resolved.set(key, null);
    return null;
  }

  /** Quote identifier for SQL. */
  q(ident: string): string {
    return `"${ident.replace(/"/g, '""')}"`;
  }

  /** Build SELECT list: `physical AS "logical"`. Skips missing fields. */
  selectList(table: string, fields: string[]): string {
    const parts: string[] = [];
    for (const field of fields) {
      const physical = this.col(table, field);
      if (!physical) continue;
      parts.push(`${this.q(physical)} AS ${this.q(field)}`);
    }
    if (!parts.length) {
      throw new Error(`No selectable columns for ${table} among ${fields.join(', ')}`);
    }
    return parts.join(', ');
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    const result = await this.pool.query<T>(sql, params);
    return result.rows;
  }

  async count(table: string, whereSql = '', params: unknown[] = []): Promise<number> {
    const rows = await this.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM ${this.q(table)} ${whereSql}`,
      params,
    );
    return Number(rows[0]?.count ?? 0);
  }

  /**
   * Keyset-paginate by id (text UUIDs). Yields batches of rows with logical aliases.
   */
  async *paginate<T extends QueryResultRow>(
    table: string,
    fields: string[],
    opts: {
      whereSql?: string;
      params?: unknown[];
      batchSize: number;
      orderCol?: string;
    },
  ): AsyncGenerator<T[]> {
    const orderPhysical = this.col(table, opts.orderCol ?? 'id');
    if (!orderPhysical) throw new Error(`${table} missing id column`);

    const select = this.selectList(table, fields);
    const where = opts.whereSql?.trim() ? opts.whereSql.trim() : '';
    let lastId: string | null = null;
    const baseParams = opts.params ?? [];

    for (;;) {
      const params = [...baseParams];
      let keyset = '';
      if (lastId != null) {
        params.push(lastId);
        keyset = `${where ? 'AND' : 'WHERE'} ${this.q(orderPhysical)} > $${params.length}`;
      }
      params.push(opts.batchSize);
      const limitParam = `$${params.length}`;

      const sql = `
        SELECT ${select}
        FROM ${this.q(table)}
        ${where}
        ${keyset}
        ORDER BY ${this.q(orderPhysical)}
        LIMIT ${limitParam}
      `;
      const batch = await this.query<T>(sql, params);
      if (!batch.length) break;
      yield batch;
      lastId = String(batch[batch.length - 1].id);
      if (batch.length < opts.batchSize) break;
    }
  }

  async withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      return await fn(client);
    } finally {
      client.release();
    }
  }

  async end(): Promise<void> {
    await this.pool.end();
  }
}

function toSnake(value: string): string {
  return value.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
}

export function buildOldSslEnabled(): boolean {
  const mode = (
    process.env.OLD_DATABASE_SSL_MODE ||
    process.env.DATABASE_SSL_MODE ||
    ''
  )
    .trim()
    .toLowerCase();
  if (mode === 'disable') return false;
  if (mode) return true;
  const url = process.env.OLD_DATABASE_URL || '';
  return /ondigitalocean|amazonaws|azure|sslmode=require/i.test(url);
}

export function redactDatabaseHost(url: string): string {
  try {
    const u = new URL(url.replace(/^postgresql:/, 'http:'));
    return `${u.hostname}:${u.port || '5432'}/${u.pathname.replace(/^\//, '')}`;
  } catch {
    return '(unparsed)';
  }
}
