#!/usr/bin/env node

import { execSync } from 'child_process';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as readline from 'readline';
dotenv.config();

const DEFAULT_SSL_CERT = 'ca-certificate-volo-private.crt';

function backendRoot(): string {
  return path.resolve(__dirname, '..');
}

function resolveSslRootCertPath(): string {
  const raw = (process.env.DATABASE_SSL_ROOT_CERT ?? '').trim();
  const candidates: string[] = [];

  if (raw) {
    candidates.push(path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw));
    candidates.push(path.join(backendRoot(), raw));
  }
  candidates.push(path.join(backendRoot(), 'ssl', DEFAULT_SSL_CERT));

  for (const candidate of [...new Set(candidates)]) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return '';
}

function isDatabaseSslEnabled(): boolean {
  const mode = (process.env.DATABASE_SSL_MODE ?? '').trim().toLowerCase();
  return mode !== '' && mode !== 'disable' && mode !== 'allow' && mode !== 'prefer';
}

function applyPgSslEnv(): void {
  const mode = (process.env.DATABASE_SSL_MODE ?? '').trim();
  const certPath = resolveSslRootCertPath();
  if (mode && mode.toLowerCase() !== 'disable') {
    process.env.PGSSLMODE = mode;
  }
  if (certPath) {
    process.env.PGSSLROOTCERT = certPath;
  }
}

applyPgSslEnv();

interface DbConnection {
  database: string;
  user: string;
  password: string;
  host: string;
  port: string;
}

function parseDatabaseUrl(url: string): DbConnection | null {
  try {
    const parsed = new URL(url);
    const database = parsed.pathname.replace(/^\//, '').split('?')[0];
    if (!database) return null;
    return {
      host: parsed.hostname,
      port: parsed.port || '5432',
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database,
    };
  } catch {
    return null;
  }
}

/** Prefer DATABASE_URL; fall back to DB_* env vars. */
function resolveConnection(): DbConnection {
  const fromUrl = process.env.DATABASE_URL?.trim()
    ? parseDatabaseUrl(process.env.DATABASE_URL.trim())
    : null;

  return {
    database: fromUrl?.database || process.env.DB_DATABASE || 'bdata_core',
    user: fromUrl?.user || process.env.DB_USER || 'postgres',
    password: fromUrl?.password || process.env.DB_PASSWORD || 'password',
    host: fromUrl?.host || process.env.DB_HOST || 'localhost',
    port: fromUrl?.port || process.env.DB_PORT || '5432',
  };
}

const dbDefaults = resolveConnection();

interface Argv {
  dbname: string;
  user: string;
  password: string;
  host: string;
  port: string;
  output?: string;
  file?: string;
  source?: string;
  target?: string;
  _: (string | number)[];
  $0: string;
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

const argv: Argv = yargs(hideBin(process.argv))
  .default('dbname', dbDefaults.database)
  .default('user', dbDefaults.user)
  .default('password', dbDefaults.password)
  .default('host', dbDefaults.host)
  .default('port', dbDefaults.port)
  .command<Argv>(
    'backup',
    'Backup a PostgreSQL database',
    (yargs) =>
      yargs
        .option('dbname', {
          description: 'Name of the database to backup',
          default: dbDefaults.database,
          type: 'string',
          demandOption: true,
        })
        .option('user', {
          description: 'Database user',
          default: dbDefaults.user,
          type: 'string',
          demandOption: true,
        })
        .option('password', {
          description: 'Database password',
          default: dbDefaults.password,
          type: 'string',
          demandOption: true,
        })
        .option('host', {
          description: 'Database host',
          default: dbDefaults.host,
          type: 'string',
          demandOption: true,
        })
        .option('port', {
          description: 'Database port',
          default: dbDefaults.port,
          type: 'string',
          demandOption: true,
        })
        .option('output', {
          description: 'Output backup file path',
          default: () => `${dbDefaults.database}-backup.sql`,
          type: 'string',
        }),
    () => {},
  )
  .command<Argv>(
    'restore',
    'Restore a PostgreSQL database',
    (yargs) =>
      yargs
        .option('dbname', {
          description: 'Name of the database to restore to',
          default: dbDefaults.database,
          type: 'string',
          demandOption: true,
        })
        .option('user', {
          description: 'Database user',
          default: dbDefaults.user,
          type: 'string',
          demandOption: true,
        })
        .option('password', {
          description: 'Database password',
          default: dbDefaults.password,
          type: 'string',
          demandOption: true,
        })
        .option('host', {
          description: 'Database host',
          default: dbDefaults.host,
          type: 'string',
          demandOption: true,
        })
        .option('port', {
          description: 'Database port',
          default: dbDefaults.port,
          type: 'string',
          demandOption: true,
        })
        .option('file', {
          description: 'Backup file to restore from',
          default: () => `${dbDefaults.database}-backup.sql`,
          type: 'string',
        }),
    () => {},
  )
  .command<Argv>(
    'clone',
    'Clone a PostgreSQL database to a new database',
    (yargs) =>
      yargs
        .option('source', {
          description: 'Source database name to clone from',
          type: 'string',
          demandOption: true,
        })
        .option('target', {
          description: 'Target database name to clone to',
          type: 'string',
        })
        .option('user', {
          description: 'Database user',
          default: dbDefaults.user,
          type: 'string',
          demandOption: true,
        })
        .option('password', {
          description: 'Database password',
          default: dbDefaults.password,
          type: 'string',
          demandOption: true,
        })
        .option('host', {
          description: 'Database host',
          default: dbDefaults.host,
          type: 'string',
          demandOption: true,
        })
        .option('port', {
          description: 'Database port',
          default: dbDefaults.port,
          type: 'string',
          demandOption: true,
        }),
    () => {},
  )
  .demandCommand(1, 'Please specify a command: backup, restore, or clone')
  .help()
  .parseSync() as Argv;

process.env.PGPASSWORD = argv.password;

function isLocalHost(host: string): boolean {
  return host === 'localhost' || host === '127.0.0.1';
}

/**
 * Docker server tools only for local Postgres on the default mapped port (5432).
 * Custom ports (e.g. 5433) and remote hosts use host pg_dump/psql or docker client image.
 */
function resolveDockerContainer(): string {
  const container = process.env.PG_DOCKER_CONTAINER?.trim() || '';
  if (!container || !isLocalHost(argv.host) || argv.port !== '5432') return '';
  return container;
}

const dockerContainer = resolveDockerContainer();
const pgClientImage = process.env.PG_CLIENT_DOCKER_IMAGE?.trim() || 'postgres:18';

type PgExecutionMode = 'local-docker-server' | 'docker-client' | 'host-cli';

function pgExecutionMode(): PgExecutionMode {
  if (dockerContainer) return 'local-docker-server';
  if (!isLocalHost(argv.host)) return 'docker-client';
  // Local custom port or PG 18 dumps (\restrict) need the Docker client (postgres:18).
  if (process.env.PG_CLIENT_DOCKER_IMAGE?.trim()) return 'docker-client';
  return 'host-cli';
}

/** Inside Docker, localhost is the container — reach host Postgres via host.docker.internal. */
function dockerClientHost(): string {
  return isLocalHost(argv.host) ? 'host.docker.internal' : argv.host;
}

function pgToolEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PGPASSWORD: argv.password,
  };
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function dockerClientRunArgs(options?: { interactive?: boolean; extraVolumes?: string[] }): string {
  const parts = ['docker run --rm'];
  if (options?.interactive) parts.push('-i');

  const certPath = resolveSslRootCertPath();
  parts.push(`-e PGPASSWORD=${shellQuote(argv.password)}`);

  if (isDatabaseSslEnabled()) {
    if (process.env.PGSSLMODE) {
      parts.push(`-e PGSSLMODE=${shellQuote(process.env.PGSSLMODE)}`);
    }
    if (certPath) {
      const certDir = path.dirname(certPath);
      const certFile = path.basename(certPath);
      parts.push(`-v ${shellQuote(`${certDir}:/ssl:ro`)}`);
      parts.push(`-e PGSSLROOTCERT=${shellQuote(`/ssl/${certFile}`)}`);
    }
  }

  for (const volume of options?.extraVolumes ?? []) {
    parts.push(`-v ${shellQuote(volume)}`);
  }

  parts.push(pgClientImage);
  return parts.join(' ');
}

function logConnectionTarget(action: string): void {
  const ssl = isDatabaseSslEnabled();
  const cert = resolveSslRootCertPath();
  const mode = pgExecutionMode();
  console.log(
    `${action} ${argv.user}@${argv.host}:${argv.port}/${argv.dbname}` +
      (ssl ? ` (SSL: ${process.env.PGSSLMODE}${cert ? `, CA: ${cert}` : ''})` : '') +
      (mode === 'docker-client'
        ? ` via Docker ${pgClientImage}${isLocalHost(argv.host) ? ' (host.docker.internal)' : ''}`
        : ''),
  );
}

function runPgDump(outputPath: string, dbName: string): void {
  if (pgExecutionMode() === 'local-docker-server') {
    const cmd = `docker exec -e PGPASSWORD="${argv.password}" ${dockerContainer} pg_dump -h localhost -p 5432 -U ${argv.user} -F p -b -v ${dbName}`;
    const sql = execSync(cmd, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 512, env: pgToolEnv() });
    fs.writeFileSync(outputPath, sql);
    return;
  }

  if (pgExecutionMode() === 'docker-client') {
    const outputDir = path.dirname(outputPath);
    const outputName = path.basename(outputPath);
    const cmd =
      `${dockerClientRunArgs({ extraVolumes: [`${outputDir}:/backup`] })} ` +
      `pg_dump -h ${dockerClientHost()} -p ${argv.port} -U ${argv.user} -F p -b -v -f /backup/${outputName} ${dbName}`;
    execSync(cmd, { stdio: 'inherit', env: pgToolEnv() });
    return;
  }

  const backupCommand = `pg_dump -h ${argv.host} -p ${argv.port} -U ${argv.user} -F p -b -v -f "${outputPath}" ${dbName}`;
  execSync(backupCommand, { stdio: 'inherit', env: pgToolEnv() });
}

function runPsqlFile(dbName: string, sqlFile: string): void {
  const sql = fs.readFileSync(sqlFile, 'utf8');

  if (pgExecutionMode() === 'local-docker-server') {
    execSync(
      `docker exec -i -e PGPASSWORD="${argv.password}" ${dockerContainer} psql -h localhost -p 5432 -U ${argv.user} -d ${dbName}`,
      { input: sql, stdio: ['pipe', 'inherit', 'inherit'], env: pgToolEnv() },
    );
    return;
  }

  if (pgExecutionMode() === 'docker-client') {
    execSync(
      `${dockerClientRunArgs({ interactive: true })} psql -h ${dockerClientHost()} -p ${argv.port} -U ${argv.user} -d ${dbName}`,
      { input: sql, stdio: ['pipe', 'inherit', 'inherit'], env: pgToolEnv() },
    );
    return;
  }

  const restoreCommand = `psql -h ${argv.host} -p ${argv.port} -U ${argv.user} -d ${dbName} -f "${sqlFile}"`;
  execSync(restoreCommand, { stdio: 'inherit', env: pgToolEnv() });
}

function runPsqlSql(dbName: string, sql: string): void {
  const escapedSql = sql.replace(/"/g, '\\"');

  if (pgExecutionMode() === 'local-docker-server') {
    execSync(
      `docker exec -i -e PGPASSWORD="${argv.password}" ${dockerContainer} psql -h localhost -p 5432 -U ${argv.user} -d ${dbName} -c "${escapedSql}"`,
      { stdio: 'inherit', env: pgToolEnv() },
    );
    return;
  }

  if (pgExecutionMode() === 'docker-client') {
    execSync(
      `${dockerClientRunArgs()} psql -h ${dockerClientHost()} -p ${argv.port} -U ${argv.user} -d ${dbName} -c "${escapedSql}"`,
      { stdio: 'inherit', env: pgToolEnv() },
    );
    return;
  }

  execSync(
    `psql -h ${argv.host} -p ${argv.port} -U ${argv.user} -d ${dbName} -c "${escapedSql}"`,
    { stdio: 'inherit', env: pgToolEnv() },
  );
}

function catalogDatabase(): string {
  return isLocalHost(argv.host) ? 'postgres' : argv.dbname;
}

function backupDatabase(): void {
  try {
    const outputPath: string = path.resolve(argv.output!);
    logConnectionTarget('Backing up');
    if (dockerContainer) {
      console.log(`Using pg_dump from Docker container "${dockerContainer}"`);
    }
    runPgDump(outputPath, argv.dbname);
    console.log(`Backup successful! Saved to ${outputPath}`);
  } catch (error: any) {
    if (!dockerContainer && String(error.message).includes('server version mismatch')) {
      console.error(
        'Backup failed: local pg_dump version does not match the Postgres server.\n' +
          'Set PG_CLIENT_DOCKER_IMAGE=postgres:18 in backend/.env and retry.',
      );
    } else {
      console.error('Backup failed:', error.message);
    }
    process.exit(1);
  }
}

function databaseExists(dbName: string): boolean {
  const escaped = dbName.replace(/'/g, "''");
  const sql = `SELECT 1 FROM pg_database WHERE datname = '${escaped}'`;
  const catalogDb = catalogDatabase();

  try {
    let result = '';

    if (pgExecutionMode() === 'local-docker-server') {
      result = execSync(
        `docker exec -i -e PGPASSWORD="${argv.password}" ${dockerContainer} psql -h localhost -p 5432 -U ${argv.user} -d ${catalogDb} -tAc "${sql}"`,
        { encoding: 'utf8', env: pgToolEnv() },
      ).trim();
    } else if (pgExecutionMode() === 'docker-client') {
      result = execSync(
        `${dockerClientRunArgs()} psql -h ${dockerClientHost()} -p ${argv.port} -U ${argv.user} -d ${catalogDb} -tAc "${sql}"`,
        { encoding: 'utf8', env: pgToolEnv() },
      ).trim();
    } else {
      result = execSync(
        `psql -h ${argv.host} -p ${argv.port} -U ${argv.user} -d ${catalogDb} -tAc "${sql}"`,
        { encoding: 'utf8', env: pgToolEnv() },
      ).trim();
    }

    return result === '1';
  } catch {
    return false;
  }
}

function createDatabase(dbName: string): void {
  if (!isLocalHost(argv.host)) {
    console.log(`Remote database: skipping CREATE DATABASE (managed host "${argv.host}").`);
    return;
  }

  if (databaseExists(dbName)) {
    console.log(`Database ${dbName} already exists.`);
    return;
  }

  try {
    runPsqlSql('postgres', `CREATE DATABASE ${dbName};`);
    console.log(`Database ${dbName} created.`);
  } catch (error: any) {
    console.error('Failed to create database:', error.message);
    process.exit(1);
  }
}

function restoreDatabase(): void {
  try {
    const backupFile: string = path.resolve(argv.file!);
    if (!fs.existsSync(backupFile)) {
      throw new Error(`Backup file ${backupFile} does not exist`);
    }

    logConnectionTarget('Restoring to');
    createDatabase(argv.dbname);

    if (dockerContainer) {
      console.log(`Using psql from Docker container "${dockerContainer}"`);
    }
    runPsqlFile(argv.dbname, backupFile);
    console.log(`Restore successful to database ${argv.dbname}`);
  } catch (error: any) {
    console.error('Restore failed:', error.message);
    process.exit(1);
  }
}

async function cloneDatabase(): Promise<void> {
  try {
    const sourceDb = argv.source!;
    let targetDb = argv.target;

    if (!targetDb) {
      targetDb = await prompt(`Enter name for the new database (cloning from ${sourceDb}): `);
      if (!targetDb) {
        throw new Error('Target database name is required');
      }
    }

    const tempBackupFile = path.join(process.cwd(), `temp-${sourceDb}-backup.sql`);

    console.log(`Creating backup of ${sourceDb}...`);
    logConnectionTarget('Backing up');
    if (dockerContainer) {
      console.log(`Using pg_dump from Docker container "${dockerContainer}"`);
    }
    runPgDump(tempBackupFile, sourceDb);

    createDatabase(targetDb);

    console.log(`Restoring backup to ${targetDb}...`);
    runPsqlFile(targetDb, tempBackupFile);

    fs.unlinkSync(tempBackupFile);

    console.log(`Database cloned successfully from ${sourceDb} to ${targetDb}`);
  } catch (error: any) {
    console.error('Clone failed:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

if (argv._[0] === 'backup') {
  backupDatabase();
} else if (argv._[0] === 'restore') {
  restoreDatabase();
} else if (argv._[0] === 'clone') {
  cloneDatabase()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
} else {
  yargs(hideBin(process.argv)).showHelp();
}
