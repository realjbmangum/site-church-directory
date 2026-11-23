import { patchFromCheck, sanitizePatch, type ChurchPatch } from '@shared/desk';
import { splitLanguages } from '@shared/languages';
import { parseServiceTimes } from '@shared/service-times';
import { familyForType } from '@shared/church-types';
import { churchSlug, slugify, uniqueSlug } from '@shared/slug';
import { first } from './db';

const now = () => new Date().toISOString();

async function nextSlug(db: D1Database, name: string, city: string | null): Promise<string> {
  const base = churchSlug(name, city);
  let slug = base;
  let n = 2;
  while (await first<{ id: string }>(db, `SELECT id FROM churches WHERE id = ? OR slug = ?`, slug, slug)) {
    const suffix = `-${n++}`;
    slug = `${base.slice(0, 80 - suffix.length)}${suffix}`;
  }
  return slug;
}

async function ensureCity(db: D1Database, city: string | null, state: string | null): Promise<string | null> {
  if (!city) return null;
  const stateCode = (state || 'NC').slice(0, 2).toUpperCase();
  const existing = await first<{ id: string }>(db, `SELECT id FROM cities WHERE name = ? AND state = ?`, city, stateCode);
  if (existing) return existing.id;
  const usedRows = await db.prepare(`SELECT slug FROM cities`).all<{ slug: string }>();
  const used = new Set((usedRows.results ?? []).map((row) => row.slug));
  const id = uniqueSlug(slugify(city), used);
  await db.prepare(`INSERT INTO cities (id, metro_id, slug, name, state) VALUES (?, 'charlotte', ?, ?, ?)`).bind(id, id, city, stateCode).run();
  return id;
}

function patchStatements(db: D1Database, churchId: string, patch: ChurchPatch, cityId: string | null | undefined): D1PreparedStatement[] {
  const keys = Object.keys(patch) as (keyof ChurchPatch)[];
  const statements: D1PreparedStatement[] = [];
  if (keys.length > 0 || cityId !== undefined) {
    const sets = keys.map((key) => `${key} = ?`);
    const binds: unknown[] = keys.map((key) => patch[key]);
    if (cityId !== undefined) {
      sets.push('city_id = ?');
      binds.push(cityId);
    }
    sets.push('updated_at = ?');
    binds.push(now(), churchId);
    statements.push(db.prepare(`UPDATE churches SET ${sets.join(', ')} WHERE id = ?`).bind(...binds));
  } else {
    statements.push(db.prepare(`UPDATE churches SET updated_at = ? WHERE id = ?`).bind(now(), churchId));
  }
  if ('languages_text' in patch) {
    statements.push(db.prepare(`DELETE FROM church_languages WHERE church_id = ?`).bind(churchId));
    const languages = splitLanguages(typeof patch.languages_text === 'string' ? patch.languages_text : '');
    for (const language of languages) {
      statements.push(db.prepare(`INSERT INTO church_languages (church_id, language) VALUES (?, ?)`).bind(churchId, language));
    }
  }
  if ('service_times' in patch) {
    statements.push(db.prepare(`DELETE FROM church_service_times WHERE church_id = ?`).bind(churchId));
    const slots = parseServiceTimes(typeof patch.service_times === 'string' ? patch.service_times : '');
    const structured = slots.length ? JSON.stringify(slots) : null;
    statements.push(db.prepare(`UPDATE churches SET service_times_structured = ? WHERE id = ?`).bind(structured, churchId));
    slots.forEach((slot, index) => {
      statements.push(
        db.prepare(
          `INSERT INTO church_service_times (id, church_id, day, time_label, minutes, source_text, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ).bind(`${churchId}-t${index + 1}-${Date.now()}`, churchId, slot.day, slot.time_label, slot.minutes, slot.source_text, index + 1),
      );
    });
  }
  return statements;
}

export async function approveSubmission(
  db: D1Database,
  id: string,
  actor: string,
): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  const sub = await first<{
    id: string;
    name: string;
    status: string;
    campus_name: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    phone: string | null;
    website: string | null;
    email: string | null;
    denomination_family: string | null;
    denomination_body: string | null;
    languages_text: string | null;
    service_times: string | null;
    note: string | null;
  }>(db, `SELECT * FROM church_submissions WHERE id = ?`, id);
  if (!sub) return { ok: false, error: 'missing' };
  if (sub.status !== 'waiting') return { ok: false, error: 'already' };

  const familyName = sub.denomination_family ? (familyForType(sub.denomination_family) || sub.denomination_family) : null;
  const family = familyName
    ? await first<{ id: string }>(db, `SELECT id FROM denomination_families WHERE name = ? COLLATE NOCASE`, familyName)
    : null;
  const body = sub.denomination_body
    ? await first<{ id: string }>(
        db,
        `SELECT id FROM denomination_bodies WHERE name = ? COLLATE NOCASE ${family ? 'AND family_id = ?' : ''}`,
        ...(family ? [sub.denomination_body, family.id] : [sub.denomination_body]),
      )
    : null;
  const slug = await nextSlug(db, sub.name, sub.city);
  const cityId = await ensureCity(db, sub.city, sub.state);
  const languages = splitLanguages(sub.languages_text);
  const slots = parseServiceTimes(sub.service_times);
  const stamp = now();
  const statements: D1PreparedStatement[] = [
    db.prepare(
      `INSERT INTO churches (
        id, slug, name, status, metro_id, city_id, campus_name, address, city, state, zip, phone, website, email,
        denomination_family_id, denomination_body_id, denomination_original, languages_text, service_times, service_times_structured,
        note, created_at, updated_at
      ) VALUES (?, ?, ?, 'open', 'charlotte', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      slug,
      slug,
      sub.name,
      cityId,
      sub.campus_name,
      sub.address,
      sub.city,
      sub.state,
      sub.zip,
      sub.phone,
      sub.website,
      sub.email,
      family?.id ?? null,
      body?.id ?? null,
      sub.denomination_body || sub.denomination_family,
      languages.length ? languages.join('; ') : null,
      sub.service_times,
      slots.length ? JSON.stringify(slots) : null,
      sub.note,
      stamp,
      stamp,
    ),
  ];
  for (const language of languages) {
    statements.push(db.prepare(`INSERT INTO church_languages (church_id, language) VALUES (?, ?)`).bind(slug, language));
  }
  slots.forEach((slot, index) => {
    statements.push(
      db.prepare(
        `INSERT INTO church_service_times (id, church_id, day, time_label, minutes, source_text, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).bind(`${slug}-t${index + 1}`, slug, slot.day, slot.time_label, slot.minutes, slot.source_text, index + 1),
    );
  });
  statements.push(
    db.prepare(
      `UPDATE church_submissions SET status = 'approved', decided_by = ?, decided_at = ?, church_id = ? WHERE id = ? AND status = 'waiting'`,
    ).bind(actor, stamp, slug, id),
  );
  await db.batch(statements);
  return { ok: true, slug };
}

export async function rejectSubmission(db: D1Database, id: string, actor: string): Promise<{ ok: boolean; error?: string }> {
  const result = await db.prepare(
    `UPDATE church_submissions SET status = 'rejected', decided_by = ?, decided_at = ? WHERE id = ? AND status = 'waiting'`,
  ).bind(actor, now(), id).run();
  if (!result.meta.changes) return { ok: false, error: 'already' };
  return { ok: true };
}

async function applyPatch(db: D1Database, churchId: string, patch: ChurchPatch): Promise<void> {
  let cityId: string | null | undefined;
  if ('city' in patch || 'state' in patch) {
    const current = await first<{ city: string | null; state: string | null }>(db, `SELECT city, state FROM churches WHERE id = ?`, churchId);
    const city = (typeof patch.city === 'string' ? patch.city : patch.city === null ? null : current?.city) ?? null;
    const state = (typeof patch.state === 'string' ? patch.state : patch.state === null ? null : current?.state) ?? null;
    cityId = await ensureCity(db, city, state);
  }
  const statements = patchStatements(db, churchId, patch, cityId);
  if (statements.length === 1) await statements[0].run();
  else await db.batch(statements);
}

export async function approveEdit(
  db: D1Database,
  bucket: R2Bucket | null,
  id: string,
  actor: string,
): Promise<{ ok: boolean; error?: string }> {
  const edit = await first<{
    id: string;
    church_id: string | null;
    status: string;
    proposed_changes: string;
    pending_asset_key: string | null;
    pending_asset_type: string | null;
    pending_asset_role: string | null;
  }>(db, `SELECT * FROM church_edit_requests WHERE id = ?`, id);
  if (!edit) return { ok: false, error: 'missing' };
  if (edit.status !== 'waiting') return { ok: false, error: 'already' };
  if (!edit.church_id) return { ok: false, error: 'missing' };
  const church = await first<{ slug: string }>(db, `SELECT slug FROM churches WHERE id = ?`, edit.church_id);
  if (!church) return { ok: false, error: 'missing' };

  let proposed: unknown = {};
  try {
    proposed = JSON.parse(edit.proposed_changes || '{}');
  } catch {
    proposed = {};
  }
  const patch = sanitizePatch(proposed);
  if (edit.pending_asset_key) {
    if (!bucket) return { ok: false, error: 'save_failed' };
    const object = await bucket.get(edit.pending_asset_key);
    if (!object) return { ok: false, error: 'save_failed' };
    const ext = edit.pending_asset_type === 'image/png' ? 'png' : edit.pending_asset_type === 'image/webp' ? 'webp' : 'jpg';
    const role = edit.pending_asset_role === 'logo' ? 'logo' : 'photo';
    const finalKey = `churches/${church.slug}/${role}.${ext}`;
    await bucket.put(finalKey, object.body, { httpMetadata: { contentType: edit.pending_asset_type || 'image/jpeg' } });
    await bucket.delete(edit.pending_asset_key);
    if (role === 'logo') patch.logo_key = finalKey;
    else patch.photo_key = finalKey;
  }
  if (Object.keys(patch).length > 0) await applyPatch(db, edit.church_id, patch);
  await db.prepare(
    `UPDATE church_edit_requests SET status = 'approved', decided_by = ?, decided_at = ?, pending_asset_key = NULL WHERE id = ? AND status = 'waiting'`,
  ).bind(actor, now(), id).run();
  return { ok: true };
}

export async function rejectEdit(
  db: D1Database,
  bucket: R2Bucket | null,
  id: string,
  actor: string,
): Promise<{ ok: boolean; error?: string }> {
  const edit = await first<{ pending_asset_key: string | null; status: string }>(
    db,
    `SELECT pending_asset_key, status FROM church_edit_requests WHERE id = ?`,
    id,
  );
  if (!edit || edit.status !== 'waiting') return { ok: false, error: 'already' };
  if (edit.pending_asset_key && bucket) await bucket.delete(edit.pending_asset_key);
  const result = await db.prepare(
    `UPDATE church_edit_requests SET status = 'rejected', decided_by = ?, decided_at = ?, pending_asset_key = NULL WHERE id = ? AND status = 'waiting'`,
  ).bind(actor, now(), id).run();
  if (!result.meta.changes) return { ok: false, error: 'already' };
  return { ok: true };
}

export async function applyCheck(db: D1Database, id: string, actor: string): Promise<{ ok: boolean; error?: string }> {
  const check = await first<{
    id: string;
    church_id: string;
    status: string;
    classification: string;
    reason: string;
    proposed_changes: string | null;
    checked_at: string;
  }>(db, `SELECT * FROM church_listing_checks WHERE id = ?`, id);
  if (!check) return { ok: false, error: 'missing' };
  if (check.status !== 'waiting') return { ok: false, error: 'already' };
  const church = await first<{ id: string }>(db, `SELECT id FROM churches WHERE id = ?`, check.church_id);
  if (!church) return { ok: false, error: 'missing' };
  const patch = patchFromCheck(check);
  await applyPatch(db, check.church_id, patch);
  await db.prepare(
    `UPDATE church_listing_checks SET status = 'applied', decided_by = ?, decided_at = ? WHERE id = ? AND status = 'waiting'`,
  ).bind(actor, now(), id).run();
  return { ok: true };
}

export async function dismissCheck(db: D1Database, id: string, actor: string): Promise<{ ok: boolean; error?: string }> {
  const result = await db.prepare(
    `UPDATE church_listing_checks SET status = 'dismissed', decided_by = ?, decided_at = ? WHERE id = ? AND status = 'waiting'`,
  ).bind(actor, now(), id).run();
  if (!result.meta.changes) return { ok: false, error: 'already' };
  return { ok: true };
}
