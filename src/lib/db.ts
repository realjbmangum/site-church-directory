export function getDb(locals: App.Locals): D1Database | null {
  return locals.runtime?.env?.DB ?? null;
}

export function getBucket(locals: App.Locals): R2Bucket | null {
  return locals.runtime?.env?.ASSETS_BUCKET ?? null;
}

export async function all<T>(db: D1Database, sql: string, ...binds: unknown[]): Promise<T[]> {
  const result = await db.prepare(sql).bind(...binds).all<T>();
  return result.results ?? [];
}

export async function first<T>(db: D1Database, sql: string, ...binds: unknown[]): Promise<T | null> {
  const row = await db.prepare(sql).bind(...binds).first<T>();
  return row ?? null;
}

export function actorEmail(locals: App.Locals): string {
  const email = locals.cfUser?.email?.trim();
  return email || 'dev@localhost';
}
