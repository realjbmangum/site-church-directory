const FLASH: Record<string, string> = {
  approved: 'Approved. The public listing was updated from this row.',
  rejected: 'Rejected. The public listing was not changed.',
  applied: 'Applied. The public listing was updated from this check.',
  dismissed: 'Dismissed. The public listing was not changed.',
  saved: 'Saved in the queue. The public listing was not changed.',
};

const ERRORS: Record<string, string> = {
  already: 'That row was already decided.',
  missing: 'A required field was empty, or that church could not be found.',
  save_failed: 'The save did not finish.',
  invalid: 'That action is not recognized.',
};

export function flashMessage(code: string | null): string | null {
  if (!code) return null;
  return FLASH[code] ?? null;
}

export function errorMessage(code: string | null): string | null {
  if (!code) return null;
  return ERRORS[code] ?? 'Something went wrong.';
}

export function describeChanges(json: string | null): string[] {
  if (!json) return [];
  try {
    const value = JSON.parse(json) as Record<string, unknown>;
    return Object.entries(value).map(([key, item]) => `${key}: ${item == null || item === '' ? '(clear)' : String(item)}`);
  } catch {
    return [];
  }
}
