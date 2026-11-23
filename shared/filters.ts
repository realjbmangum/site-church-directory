import { TIME_BUCKETS, timeBucket, type TimeBucketId } from './time.ts';

/** A church reduced to the fields the search actually compares. */
export interface SearchableChurch {
  slug: string;
  name: string;
  city: string;
  zip: string;
  typeSlug: string;
  typeName: string;
  languages: string[];
  services: { day: string; minutes: number | null }[];
  worship: string[];
  outreach: string[];
  nursery: boolean;
  kids: boolean;
  youth: boolean;
  youngAdults: boolean;
  choir: boolean;
  livestream: boolean;
  groups: boolean;
  school: boolean;
}

export interface SearchFilters {
  q: string;
  place: string;
  type: string;
  languages: string[];
  days: string[];
  times: string[];
  worship: string[];
  outreach: string[];
  nursery: boolean;
  kids: boolean;
  youth: boolean;
  youngAdults: boolean;
  choir: boolean;
  livestream: boolean;
  groups: boolean;
  school: boolean;
}

export interface FilterChoice {
  name: string;
  value: string;
  label: string;
  count: number;
  checked: boolean;
}

export interface FilterGroup {
  legend: string;
  choices: FilterChoice[];
}

export const DAY_CHOICES = [
  ['sunday', 'Sunday'],
  ['monday', 'Monday'],
  ['tuesday', 'Tuesday'],
  ['wednesday', 'Wednesday'],
  ['thursday', 'Thursday'],
  ['friday', 'Friday'],
  ['saturday', 'Saturday'],
] as const;

export const WORSHIP_CHOICES = [
  ['traditional', 'Traditional'],
  ['contemporary', 'Contemporary'],
  ['liturgical', 'Liturgical'],
] as const;

export const OUTREACH_CHOICES = [
  ['community-service', 'Community service'],
  ['missions', 'Missions'],
  ['food-pantry', 'Food pantry'],
] as const;

const OUTREACH_LABELS: Record<string, string> = {
  'community service': 'community-service',
  missions: 'missions',
  'food pantry or food ministry': 'food-pantry',
  'grief and care support': 'grief',
  'recovery/twelve step': 'recovery',
  esl: 'esl',
};

const WORSHIP_LABELS: Record<string, string> = {
  traditional: 'traditional',
  contemporary: 'contemporary',
  liturgical: 'liturgical',
  blended: 'blended',
  gospel: 'gospel',
  charismatic: 'charismatic',
};

export function emptyFilters(): SearchFilters {
  return {
    q: '',
    place: '',
    type: '',
    languages: [],
    days: [],
    times: [],
    worship: [],
    outreach: [],
    nursery: false,
    kids: false,
    youth: false,
    youngAdults: false,
    choir: false,
    livestream: false,
    groups: false,
    school: false,
  };
}

export function readSearchFilters(params: URLSearchParams): SearchFilters {
  const flag = (key: string) => params.get(key) === '1';
  return {
    q: params.get('q')?.trim().toLowerCase() ?? '',
    place: params.get('place')?.trim().toLowerCase() ?? '',
    type: params.get('type') ?? '',
    languages: params.getAll('language').map((value) => value.trim()).filter(Boolean),
    days: params.getAll('day'),
    times: params.getAll('time'),
    worship: params.getAll('worship'),
    outreach: params.getAll('outreach'),
    nursery: flag('nursery'),
    kids: flag('kids'),
    youth: flag('youth'),
    youngAdults: flag('young'),
    choir: flag('choir'),
    livestream: flag('live'),
    groups: flag('groups'),
    school: flag('school'),
  };
}

function serviceMatches(church: SearchableChurch, filters: SearchFilters): boolean {
  const needsDay = filters.days.length > 0;
  const needsTime = filters.times.length > 0;
  if (!needsDay && !needsTime) return true;
  return church.services.some((service) => {
    const day = (service.day || '').toLowerCase();
    if (needsDay && !filters.days.includes(day)) return false;
    if (needsTime && !filters.times.includes(timeBucket(service.minutes))) return false;
    return true;
  });
}

/** Across groups every pick must match. Inside a group, any selected choice counts. */
export function matchesSearch(church: SearchableChurch, filters: SearchFilters): boolean {
  if (filters.type && church.typeSlug !== filters.type) return false;
  if (filters.languages.length > 0) {
    const names = church.languages.map((language) => language.toLowerCase());
    if (!filters.languages.some((language) => names.includes(language.toLowerCase()))) return false;
  }
  if (!serviceMatches(church, filters)) return false;
  if (filters.worship.length > 0 && !filters.worship.some((style) => church.worship.includes(style))) return false;
  if (filters.outreach.length > 0 && !filters.outreach.some((kind) => church.outreach.includes(kind))) return false;
  if (filters.nursery && !church.nursery) return false;
  if (filters.kids && !church.kids) return false;
  if (filters.youth && !church.youth) return false;
  if (filters.youngAdults && !church.youngAdults) return false;
  if (filters.choir && !church.choir) return false;
  if (filters.livestream && !church.livestream) return false;
  if (filters.groups && !church.groups) return false;
  if (filters.school && !church.school) return false;
  if (filters.place) {
    const hay = `${church.city} ${church.zip}`.toLowerCase();
    if (!hay.includes(filters.place)) return false;
  }
  if (filters.q) {
    const hay = `${church.name} ${church.city} ${church.zip} ${church.typeName}`.toLowerCase();
    if (!hay.includes(filters.q)) return false;
  }
  return true;
}

function withoutGroup(filters: SearchFilters, name: string): SearchFilters {
  const next = { ...filters, languages: [...filters.languages], days: [...filters.days], times: [...filters.times], worship: [...filters.worship], outreach: [...filters.outreach] };
  if (name === 'language') next.languages = [];
  else if (name === 'day') next.days = [];
  else if (name === 'time') next.times = [];
  else if (name === 'worship') next.worship = [];
  else if (name === 'outreach') next.outreach = [];
  else if (name === 'nursery') next.nursery = false;
  else if (name === 'kids') next.kids = false;
  else if (name === 'youth') next.youth = false;
  else if (name === 'young') next.youngAdults = false;
  else if (name === 'choir') next.choir = false;
  else if (name === 'live') next.livestream = false;
  else if (name === 'groups') next.groups = false;
  else if (name === 'school') next.school = false;
  return next;
}

function withChoice(filters: SearchFilters, name: string, value: string): SearchFilters {
  const next = withoutGroup(filters, name);
  if (name === 'language') next.languages = [value];
  else if (name === 'day') next.days = [value];
  else if (name === 'time') next.times = [value];
  else if (name === 'worship') next.worship = [value];
  else if (name === 'outreach') next.outreach = [value];
  else if (name === 'nursery') next.nursery = true;
  else if (name === 'kids') next.kids = true;
  else if (name === 'youth') next.youth = true;
  else if (name === 'young') next.youngAdults = true;
  else if (name === 'choir') next.choir = true;
  else if (name === 'live') next.livestream = true;
  else if (name === 'groups') next.groups = true;
  else if (name === 'school') next.school = true;
  return next;
}

export function choiceCount(churches: SearchableChurch[], filters: SearchFilters, name: string, value: string): number {
  const narrowed = withChoice(filters, name, value);
  return churches.filter((church) => matchesSearch(church, narrowed)).length;
}

function checked(filters: SearchFilters, name: string, value: string): boolean {
  if (name === 'language') return filters.languages.some((item) => item.toLowerCase() === value.toLowerCase());
  if (name === 'day') return filters.days.includes(value);
  if (name === 'time') return filters.times.includes(value);
  if (name === 'worship') return filters.worship.includes(value);
  if (name === 'outreach') return filters.outreach.includes(value);
  if (name === 'nursery') return filters.nursery;
  if (name === 'kids') return filters.kids;
  if (name === 'youth') return filters.youth;
  if (name === 'young') return filters.youngAdults;
  if (name === 'choir') return filters.choir;
  if (name === 'live') return filters.livestream;
  if (name === 'groups') return filters.groups;
  if (name === 'school') return filters.school;
  return false;
}

function choicesFor(
  churches: SearchableChurch[],
  filters: SearchFilters,
  name: string,
  pairs: readonly (readonly [string, string])[],
  minimumShare = 0,
): FilterChoice[] {
  return pairs
    .map(([value, label]) => ({
      name,
      value,
      label,
      checked: checked(filters, name, value),
      count: choiceCount(churches, filters, name, value),
    }))
    .filter((choice) => choice.count > 0 || choice.checked)
    .filter((choice) => minimumShare === 0 || choiceCount(churches, emptyFilters(), name, choice.value) / Math.max(churches.length, 1) >= minimumShare || choice.checked);
}

/** Chip groups for the home search and the map. Days under 15 percent stay off the list. */
export function filterGroups(churches: SearchableChurch[], filters: SearchFilters): FilterGroup[] {
  const languages = [...new Set(churches.flatMap((church) => church.languages))]
    .filter((language) => language && language.toLowerCase() !== 'not listed')
    .sort((a, b) => a.localeCompare(b))
    .map((language) => [language, language] as const);
  const days = DAY_CHOICES.filter(([value]) => {
    const count = churches.filter((church) => church.services.some((service) => (service.day || '').toLowerCase() === value)).length;
    return count / Math.max(churches.length, 1) >= 0.15;
  });
  const times = TIME_BUCKETS.filter((bucket) => bucket.id !== 'not-listed').map((bucket) => [bucket.id, bucket.label] as const);
  const worship = [
    ...WORSHIP_CHOICES.map(([value, label]) => ({ name: 'worship', value, label })),
    { name: 'choir', value: '1', label: 'Choir' },
  ];
  const groups: FilterGroup[] = [
    { legend: 'Service day', choices: choicesFor(churches, filters, 'day', days) },
    { legend: 'Service time', choices: choicesFor(churches, filters, 'time', times) },
    { legend: 'Language', choices: choicesFor(churches, filters, 'language', languages) },
    {
      legend: 'Ministries',
      choices: [
        ...choicesFor(churches, filters, 'kids', [['1', 'Kids ministry']]),
        ...choicesFor(churches, filters, 'youth', [['1', 'Youth group']]),
        ...choicesFor(churches, filters, 'nursery', [['1', 'Nursery']]),
        ...choicesFor(churches, filters, 'young', [['1', 'Young adults']]),
      ],
    },
    {
      legend: 'Worship style',
      choices: worship.map((choice) => ({
        ...choice,
        checked: checked(filters, choice.name, choice.value),
        count: choiceCount(churches, filters, choice.name, choice.value),
      })).filter((choice) => choice.count > 0 || choice.checked),
    },
    { legend: 'Outreach', choices: choicesFor(churches, filters, 'outreach', OUTREACH_CHOICES) },
    {
      legend: 'Also stated on the church site',
      choices: [
        ...choicesFor(churches, filters, 'live', [['1', 'Livestream']]),
        ...choicesFor(churches, filters, 'groups', [['1', 'Small groups or Bible study']]),
        ...choicesFor(churches, filters, 'school', [['1', 'School or preschool']]),
      ],
    },
  ];
  return groups.filter((item) => item.choices.length > 0);
}

export function statedParts(value: string | null | undefined): string[] {
  if (!value) return [];
  const clean = value.trim();
  if (!clean || clean.toLowerCase() === 'unknown') return [];
  return clean.split(';').map((part) => part.trim()).filter((part) => part && part.toLowerCase() !== 'unknown');
}

export function isStatedYes(value: string | null | undefined): boolean {
  return (value || '').trim().toLowerCase() === 'yes';
}

export function worshipTokens(value: string | null | undefined): string[] {
  return statedParts(value).map((part) => WORSHIP_LABELS[part.toLowerCase()] || part.toLowerCase());
}

export function outreachTokens(value: string | null | undefined): string[] {
  return statedParts(value).map((part) => OUTREACH_LABELS[part.toLowerCase()] || part.toLowerCase());
}

export type { TimeBucketId };
