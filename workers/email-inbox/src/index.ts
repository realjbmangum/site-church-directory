/**
 * Inbound mail for the church directory only.
 * Stores the message in inbox_messages. Does not read or write churches.
 *
 * The routing address list is omitted on purpose. Putting it in Wrangler config
 * and deploying would create or take over a live Email Routing rule.
 * The staged rule is email-routing.rule.json.
 */
import PostalMime from 'postal-mime';
import { inboxRow, inboxStatement } from './prepare.mjs';

const MAX_PARSE_BYTES = 1_000_000;

interface InboxEnv {
  DB?: D1Database;
  BACKUP_FORWARD_TO?: string;
}

function log(event: string, fields: Record<string, string | number | boolean | null>): void {
  console.log(JSON.stringify({ event, ...fields }));
}

function errText(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/\s+/g, ' ').slice(0, 300);
}

function header(message: ForwardableEmailMessage, name: string): string | null {
  const value = message.headers.get(name);
  const text = value == null ? '' : value.trim();
  return text || null;
}

async function dedupeKey(messageId: string | null, fallback: string): Promise<string> {
  const material = (messageId || fallback).trim().toLowerCase();
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(material));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function backupAddress(value: string | undefined): string | null {
  const text = (value || '').trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) ? text : null;
}

export default {
  async email(message, env: InboxEnv): Promise<void> {
    let text: string | null = null;
    let html: string | null = null;
    let senderName: string | null = null;
    let messageId = header(message, 'message-id');
    const senderEmail = message.from || header(message, 'from');
    const subject = header(message, 'subject');

    if (message.rawSize <= MAX_PARSE_BYTES) {
      try {
        const raw = await new Response(message.raw).arrayBuffer();
        const parsed = await PostalMime.parse(raw);
        text = parsed.text || null;
        html = parsed.html || null;
        senderName = parsed.from?.name || null;
        messageId = parsed.messageId || messageId;
      } catch (error) {
        log('inbox_parse_failed', { error: errText(error) });
      }
    } else {
      log('inbox_too_big', { bytes: message.rawSize });
    }

    const backup = backupAddress(env.BACKUP_FORWARD_TO);
    let forwardError: string | null = null;
    if (!backup) {
      forwardError = 'backup_forward_unset';
      log('inbox_forward_unset', {});
    } else {
      try {
        await message.forward(backup);
      } catch (error) {
        forwardError = errText(error);
        log('inbox_forward_failed', { error: forwardError });
      }
    }

    const key = await dedupeKey(messageId, `${senderEmail || ''}|${subject || ''}|${header(message, 'date') || ''}`);
    if (!env.DB) {
      log('inbox_store_failed', { error: 'd1_not_configured' });
    } else {
      try {
        const row = inboxRow({
          dedupeKey: key,
          receivedAt: new Date().toISOString(),
          senderName,
          senderEmail,
          recipient: message.to,
          subject,
          text,
          html,
          messageId,
          inReplyTo: header(message, 'in-reply-to'),
          references: header(message, 'references'),
          rawSize: message.rawSize,
          forwardError,
        });
        const statement = inboxStatement({ ...row, id: crypto.randomUUID() });
        await env.DB.prepare(statement.sql).bind(...statement.binds).run();
        log('inbox_stored', { forward_ok: forwardError == null });
      } catch (error) {
        log('inbox_store_failed', { error: errText(error) });
        if (forwardError) throw new Error(forwardError);
        return;
      }
    }

    if (forwardError && forwardError !== 'backup_forward_unset') {
      throw new Error(forwardError);
    }
  },
} satisfies ExportedHandler<InboxEnv>;
