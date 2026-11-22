/** Pure inbox row builder. The worker does not write churches. */

const LIMITS = {
  sender_name: 200,
  sender_email: 200,
  recipient: 500,
  subject: 300,
  text_body: 20000,
  html_body: 20000,
  message_id: 500,
  in_reply_to: 500,
  references_header: 2000,
};

function clip(value, max) {
  if (value == null) return null;
  const text = String(value).replace(/\u0000/g, '').trim();
  if (!text) return null;
  return text.length > max ? text.slice(0, max) : text;
}

export function inboxRow(parts) {
  return {
    dedupe_key: parts.dedupeKey,
    received_at: parts.receivedAt,
    sender_name: clip(parts.senderName, LIMITS.sender_name),
    sender_email: clip(parts.senderEmail, LIMITS.sender_email),
    recipient: clip(parts.recipient, LIMITS.recipient),
    subject: clip(parts.subject, LIMITS.subject),
    text_body: clip(parts.text, LIMITS.text_body),
    html_body: clip(parts.html, LIMITS.html_body),
    message_id: clip(parts.messageId, LIMITS.message_id),
    in_reply_to: clip(parts.inReplyTo, LIMITS.in_reply_to),
    references_header: clip(parts.references, LIMITS.references_header),
    raw_size: Number.isFinite(parts.rawSize) ? parts.rawSize : null,
    forward_error: clip(parts.forwardError, 300),
  };
}

export function inboxStatement(row) {
  const columns = [
    'id', 'dedupe_key', 'received_at', 'sender_name', 'sender_email', 'recipient', 'subject',
    'text_body', 'html_body', 'message_id', 'in_reply_to', 'references_header', 'raw_size', 'forward_error',
  ];
  return {
    sql: `INSERT INTO inbox_messages (${columns.join(', ')})
      VALUES (${columns.map(() => '?').join(', ')})
      ON CONFLICT(dedupe_key) DO UPDATE SET
        forward_error = excluded.forward_error,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
    binds: columns.map((column) => row[column] ?? null),
  };
}
