/** Parse `postgresql://…` into connection parts used by tools / legacy pg Pool. */
export type DatabaseUrlParts = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
};

export function parseDatabaseUrl(url: string): DatabaseUrlParts | null {
  try {
    const parsed = new URL(url);
    const database = parsed.pathname.replace(/^\//, '').split('?')[0];
    if (!database) return null;
    return {
      host: parsed.hostname || 'localhost',
      port: parsed.port ? Number(parsed.port) : 5432,
      user: decodeURIComponent(parsed.username || 'postgres'),
      password: decodeURIComponent(parsed.password || ''),
      database,
    };
  } catch {
    return null;
  }
}
