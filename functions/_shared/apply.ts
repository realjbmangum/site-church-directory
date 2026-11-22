import { applyChurchStatements } from '../../shared/listing-patch.mjs';

interface Statement {
  sql: string;
  binds: unknown[];
}

export async function applyPatch(db: D1Database, churchId: string, patch: Record<string, unknown>): Promise<void> {
  if (patch.body_id) {
    const body = await db.prepare('SELECT id, family_id FROM denomination_bodies WHERE id = ?')
      .bind(patch.body_id)
      .first<{ id: string; family_id: string }>();
    if (!body) throw new Error('bad_body_id');
    if (patch.family_id && patch.family_id !== body.family_id) throw new Error('family_body_mismatch');
    patch.family_id = body.family_id;
  } else if (patch.family_id) {
    const family = await db.prepare('SELECT id FROM denomination_families WHERE id = ?')
      .bind(patch.family_id)
      .first<{ id: string }>();
    if (!family) throw new Error('bad_family_id');
  }

  const statements = applyChurchStatements({ churchId, patch }) as Statement[];
  if (statements.length === 0) return;
  await db.batch(statements.map((statement) => db.prepare(statement.sql).bind(...statement.binds)));
}

export async function decide(db: D1Database, sql: string, binds: unknown[]): Promise<boolean> {
  const result = await db.prepare(sql).bind(...binds).run();
  return (result.meta?.changes ?? 0) > 0;
}
