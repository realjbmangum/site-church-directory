import { PUBLIC_EDIT_FIELDS, parseProposedChanges } from './listing-patch.mjs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function text(value, max) {
  if (value == null) return '';
  return String(value).replace(/\u0000/g, '').trim().slice(0, max);
}

export function submissionInput(raw) {
  return {
    name: text(raw.name, 200),
    contact_name: text(raw.contact_name, 120),
    contact_email: text(raw.contact_email, 200).toLowerCase(),
    phone: text(raw.phone, 40),
    website: text(raw.website, 300),
    street_address: text(raw.street_address, 200),
    city: text(raw.city, 80),
    state: text(raw.state, 40),
    postal_code: text(raw.postal_code, 12),
    service_times_text: text(raw.service_times_text, 4000),
    languages_text: text(raw.languages_text, 300),
    campus_name: text(raw.campus_name, 120),
    family_id: text(raw.family_id, 80),
    message: text(raw.message, 2000),
    honeypot: text(raw.company_website || raw.honeypot, 200),
    form_loaded_at: Number(raw.form_loaded_at) || 0,
  };
}

export function validateSubmission(input, now = Date.now()) {
  if (input.honeypot) return { ok: false, spam: true, reason: 'honeypot' };
  let msToSubmit;
  if (input.form_loaded_at) {
    msToSubmit = now - input.form_loaded_at;
    if (msToSubmit >= 0 && msToSubmit < 2000) {
      return { ok: false, spam: true, reason: 'too_fast', msToSubmit };
    }
    if (msToSubmit < 0 || msToSubmit > 1000 * 60 * 60 * 24) msToSubmit = undefined;
  }
  const errors = [];
  if (input.name.length < 2) errors.push('Church name is required.');
  if (!EMAIL_RE.test(input.contact_email)) errors.push('A valid email is required.');
  if (input.city.length < 2) errors.push('City is required.');
  if (input.state.length < 2) errors.push('State is required.');
  if (input.phone && input.phone.length < 7) errors.push('That phone number looks too short.');
  if (input.website) {
    try {
      const url = new URL(input.website);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') errors.push('Website must start with http:// or https://.');
    } catch {
      errors.push('Website must be a full link, including https://.');
    }
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, msToSubmit };
}

export function editInput(raw) {
  const fields = {
    church_id: text(raw.church_id, 120),
    contact_name: text(raw.contact_name, 120),
    contact_email: text(raw.contact_email, 200).toLowerCase(),
    message: text(raw.message, 2000),
    honeypot: text(raw.company_website || raw.honeypot, 200),
    form_loaded_at: Number(raw.form_loaded_at) || 0,
  };
  const patch = {};
  for (const key of PUBLIC_EDIT_FIELDS) {
    const value = text(raw[key], 4000);
    if (value) patch[key] = value;
  }
  return { ...fields, patch };
}

export function validateEdit(input, now = Date.now()) {
  if (input.honeypot) return { ok: false, spam: true, reason: 'honeypot' };
  let msToSubmit;
  if (input.form_loaded_at) {
    msToSubmit = now - input.form_loaded_at;
    if (msToSubmit >= 0 && msToSubmit < 2000) {
      return { ok: false, spam: true, reason: 'too_fast', msToSubmit };
    }
    if (msToSubmit < 0 || msToSubmit > 1000 * 60 * 60 * 24) msToSubmit = undefined;
  }
  const errors = [];
  if (!input.church_id) errors.push('Choose the church you want to correct.');
  if (!EMAIL_RE.test(input.contact_email)) errors.push('A valid email is required.');
  const parsed = parseProposedChanges(input.patch, PUBLIC_EDIT_FIELDS);
  if (!parsed.ok) {
    errors.push(parsed.field ? `Check the ${parsed.field.replaceAll('_', ' ')} field.` : 'One of the suggested changes is not in a form we can store.');
  }
  if (parsed.ok && Object.keys(parsed.patch).length === 0 && input.message.length < 8) {
    errors.push('Suggest a change, or tell us what to look at.');
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, msToSubmit, patch: parsed.ok ? parsed.patch : {} };
}
