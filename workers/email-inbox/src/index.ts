/**
 * Inbound mail for the church directory.
 * Stores the message in inbox_messages. Does not update churches.
 * Does not send mail. Forwards only when BACKUP_FORWARD_TO is set.
 * `addresses` is omitted so deploy does not take over a live routing rule.
 */
import PostalMime from 'postal-mime';
import { dedupeKey, htmlToText, matchChurch, type ChurchMatch } from './prepare';

interface Env {
  DB: D1Database;
  BACKUP_FORWARD_TO?: string;
}

const MAX_PARSE_BYTES = 1_000_000;

function log(event: string, fields: Record<string, string | number | boolean | null>): void {
  console.log(JSON.stringify({ event, ...fields }));
}

function errText(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/\s+/g, ' ').slice(0, 300);
}

function backupAddress(value: string | undefined): string | null {
  const text = (value || '').trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) ? text : null;
}

export default {
  async email(message, env): Promise<void> {
    let raw: ArrayBuffer | null = null;
    if (message.rawSize <= MAX_PARSE_BYTES) {
      try {
        raw = await new Response(message.raw).arrayBuffer();
      } catch (error) {
        log('inbox_raw_failed', { error: errText(error) });
      }
    } else {
      log('inbox_too_big', { bytes: message.rawSize });
    }

    const backup = backupAddress(env.BACKUP_FORWARD_TO);
    let forwardError: string | null = null;
    if (backup) {
      try {
        await message.forward(backup);
      } catch (error) {
        forwardError = errText(error);
        log('inbox_forward_failed', { error: forwardError });
      }
    }

    let stored = false;
    try {
      stored = await storeMessage(env.DB, message, raw, forwardError);
    } catch (error) {
      log('inbox_store_failed', { error: errText(error) });
    }

    if (forwardError) throw new Error(forwardError);
    if (!stored) log('inbox_unstored', {});
  },
} satisfies ExportedHandler<Env>;

async function storeMessage(
  db: D1Database,
  message: ForwardableEmailMessage,
  raw: ArrayBuffer | null,
  forwardError: string | null,
): Promise<boolean> {
  const parsed = raw ? await PostalMime.parse(raw) : null;
  const senderEmail = parsed?.from?.address || message.from || null;
  const senderName = parsed?.from?.name || null;
  const subject = parsed?.subject || message.headers.get('subject') || '';
  const text = parsed?.text || (parsed?.html ? htmlToText(parsed.html) : null);
  const churches = await loadChurches(db);
  const match = matchChurch(churches, subject || '', text || '', senderEmail);
  const messageId = parsed?.messageId || message.headers.get('message-id');
  const key = await dedupeKey(messageId, raw);
  const received = new Date().toISOString();
  try {
    await db.prepare(
      `INSERT INTO inbox_messages (
        id, dedupe_key, received_at, sender_name, sender_email, recipient, subject, text_body, html_body,
        message_id, in_reply_to, references_header, matched_church_id, match_method, forward_error, raw_size
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      crypto.randomUUID(),
      key,
      received,
      senderName,
      senderEmail,
      message.to || null,
      subject || null,
      text,
      parsed?.html ? parsed.html.slice(0, 20000) : null,
      messageId,
      parsed?.inReplyTo || message.headers.get('in-reply-to'),
      parsed?.references || message.headers.get('references'),
      match.churchId,
      match.method,
      forwardError,
      message.rawSize,
    ).run();
  } catch (error) {
    if (!/unique constraint failed/i.test(errText(error))) throw error;
    await db.prepare(`UPDATE inbox_messages SET forward_error = ? WHERE dedupe_key = ?`).bind(forwardError, key).run();
  }
  log('inbox_stored', { method: match.method, linked: match.churchId != null, forward_ok: forwardError == null });
  return true;
}

async function loadChurches(db: D1Database): Promise<ChurchMatch[]> {
  const result = await db.prepare(`SELECT id, name, website FROM churches`).all<ChurchMatch>();
  return result.results ?? [];
}
