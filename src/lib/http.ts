export function originDenied(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  return origin !== new URL(request.url).origin;
}

export function redirect(location: string): Response {
  return new Response(null, { status: 303, headers: { Location: location } });
}

export function formText(form: FormData, name: string, max = 500): string {
  const value = form.get(name);
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

export function honeypotTripped(form: FormData): boolean {
  return formText(form, 'company_fax', 200) !== '';
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function looksLikeEmail(value: string): boolean {
  return EMAIL_RE.test(value) && value.length <= 200;
}
