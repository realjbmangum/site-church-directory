import { churchTypeName, churchTypeSlug, partOfLine } from '@shared/church-types';
import { isStatedYes, outreachTokens, statedParts, worshipTokens, type SearchableChurch } from '@shared/filters';
import { parseServiceTimes, type StructuredServiceTime } from '@shared/service-times';
import type { ChurchRecord } from './queries';

export interface AttributeRow {
  church_id: string;
  church_type: string | null;
  specific_body: string | null;
  nursery: string | null;
  nursery_proof: string | null;
  nursery_url: string | null;
  kids_ministry: string | null;
  kids_ministry_proof: string | null;
  kids_ministry_url: string | null;
  youth_group: string | null;
  youth_group_proof: string | null;
  youth_group_url: string | null;
  worship_style: string | null;
  worship_style_proof: string | null;
  worship_style_url: string | null;
  choir: string | null;
  choir_proof: string | null;
  choir_url: string | null;
  young_adults: string | null;
  young_adults_proof: string | null;
  young_adults_url: string | null;
  college_ministry: string | null;
  college_ministry_proof: string | null;
  college_ministry_url: string | null;
  outreach: string | null;
  outreach_proof: string | null;
  outreach_url: string | null;
  livestream_online: string | null;
  livestream_online_proof: string | null;
  livestream_online_url: string | null;
  accessibility: string | null;
  accessibility_proof: string | null;
  accessibility_url: string | null;
  small_groups_bible_study: string | null;
  small_groups_bible_study_proof: string | null;
  small_groups_bible_study_url: string | null;
  school_preschool: string | null;
  school_preschool_proof: string | null;
  school_preschool_url: string | null;
  beliefs_url: string | null;
  lgbtq_stance: string | null;
  lgbtq_stance_proof: string | null;
  lgbtq_stance_url: string | null;
}

export interface ProofBadge {
  label: string;
  url: string | null;
}

const SELECT = `SELECT church_id, church_type, specific_body,
  nursery, nursery_proof, nursery_url,
  kids_ministry, kids_ministry_proof, kids_ministry_url,
  youth_group, youth_group_proof, youth_group_url,
  worship_style, worship_style_proof, worship_style_url,
  choir, choir_proof, choir_url,
  young_adults, young_adults_proof, young_adults_url,
  college_ministry, college_ministry_proof, college_ministry_url,
  outreach, outreach_proof, outreach_url,
  livestream_online, livestream_online_proof, livestream_online_url,
  accessibility, accessibility_proof, accessibility_url,
  small_groups_bible_study, small_groups_bible_study_proof, small_groups_bible_study_url,
  school_preschool, school_preschool_proof, school_preschool_url,
  beliefs_url, lgbtq_stance, lgbtq_stance_proof, lgbtq_stance_url
  FROM church_attributes`;

/** Empty when the migration has not been applied. That is not an error. */
export async function listAttributes(db: D1Database): Promise<{ rows: AttributeRow[]; ready: boolean }> {
  try {
    const result = await db.prepare(SELECT).all<AttributeRow>();
    if (result.success === false) return { rows: [], ready: false };
    return { rows: result.results ?? [], ready: true };
  } catch (error) {
    console.error('church_attributes is not loaded yet', error);
    return { rows: [], ready: false };
  }
}

export function servicesOf(church: Pick<ChurchRecord, 'service_times' | 'service_times_structured'>): { day: string; minutes: number | null }[] {
  let structured: StructuredServiceTime[] = [];
  if (church.service_times_structured) {
    try {
      const parsed = JSON.parse(church.service_times_structured) as StructuredServiceTime[];
      if (Array.isArray(parsed)) structured = parsed;
    } catch {
      structured = [];
    }
  }
  if (structured.length === 0) structured = parseServiceTimes(church.service_times);
  return structured.map((slot) => ({ day: slot.day || '', minutes: slot.minutes }));
}

export function toSearchable(church: ChurchRecord, row: AttributeRow | undefined): SearchableChurch {
  const typeName = churchTypeName(church.family_name, church.body_name, row?.church_type);
  return {
    slug: church.slug,
    name: church.name,
    city: church.city || '',
    zip: church.zip || '',
    typeSlug: churchTypeSlug(typeName),
    typeName,
    languages: (church.languages_text || '').split(';').map((part) => part.trim()).filter(Boolean),
    services: servicesOf(church),
    worship: worshipTokens(row?.worship_style),
    outreach: outreachTokens(row?.outreach),
    nursery: isStatedYes(row?.nursery),
    kids: isStatedYes(row?.kids_ministry),
    youth: isStatedYes(row?.youth_group),
    youngAdults: isStatedYes(row?.young_adults),
    choir: isStatedYes(row?.choir),
    livestream: isStatedYes(row?.livestream_online),
    groups: isStatedYes(row?.small_groups_bible_study),
    school: isStatedYes(row?.school_preschool),
  };
}

function cleanQuote(value: string | null | undefined): string | null {
  const text = (value || '').replace(/^\[[^\]]+\]\s*/, '').trim();
  return text || null;
}

function badge(label: string, url: string | null | undefined): ProofBadge {
  return { label, url: url || null };
}

const WORSHIP_BADGE: Record<string, string> = {
  traditional: 'Traditional worship',
  contemporary: 'Contemporary worship',
  liturgical: 'Liturgical worship',
  blended: 'Blended worship',
  gospel: 'Gospel worship',
  charismatic: 'Charismatic worship',
};

const OUTREACH_BADGE: Record<string, string> = {
  'community-service': 'Community service',
  missions: 'Missions',
  'food-pantry': 'Food pantry',
  grief: 'Grief and care support',
  recovery: 'Recovery',
  esl: 'ESL',
};

const ACCESS_BADGE: Record<string, string> = {
  'wheelchair access': 'Wheelchair access',
  'hearing assistance': 'Hearing assistance',
  asl: 'ASL',
};

/** Badges for facts the church stated. Missing research produces no badges. */
export function proofBadges(row: AttributeRow | null | undefined): ProofBadge[] {
  if (!row) return [];
  const badges: ProofBadge[] = [];
  if (isStatedYes(row.kids_ministry)) badges.push(badge('Kids ministry', row.kids_ministry_url));
  if (isStatedYes(row.youth_group)) badges.push(badge('Youth group', row.youth_group_url));
  if (isStatedYes(row.nursery)) badges.push(badge('Nursery', row.nursery_url));
  if (isStatedYes(row.young_adults)) badges.push(badge('Young adults', row.young_adults_url));
  if (isStatedYes(row.college_ministry)) badges.push(badge('College ministry', row.college_ministry_url));
  for (const token of worshipTokens(row.worship_style)) {
    badges.push(badge(WORSHIP_BADGE[token] || token, row.worship_style_url));
  }
  if (isStatedYes(row.choir)) badges.push(badge('Choir', row.choir_url));
  if (isStatedYes(row.livestream_online)) badges.push(badge('Livestream', row.livestream_online_url));
  if (isStatedYes(row.small_groups_bible_study)) badges.push(badge('Small groups or Bible study', row.small_groups_bible_study_url));
  for (const token of outreachTokens(row.outreach)) {
    badges.push(badge(OUTREACH_BADGE[token] || token, row.outreach_url));
  }
  if (isStatedYes(row.school_preschool)) badges.push(badge('School or preschool', row.school_preschool_url));
  for (const part of statedParts(row.accessibility)) {
    badges.push(badge(ACCESS_BADGE[part.toLowerCase()] || part, row.accessibility_url));
  }
  if ((row.lgbtq_stance || '').trim().toLowerCase() === 'affirming') {
    badges.push(badge('Affirming, in their words', row.lgbtq_stance_url));
  }
  return badges;
}

export function beliefsLink(row: AttributeRow | null | undefined): string | null {
  const url = row?.beliefs_url?.trim();
  return url || null;
}

export function specificBodyLine(church: ChurchRecord, row: AttributeRow | undefined): string | null {
  return partOfLine(row?.specific_body || church.body_name);
}

export function quoteHint(row: AttributeRow | null | undefined, label: string): string | null {
  if (!row) return null;
  const table: [string, string | null][] = [
    ['Kids ministry', row.kids_ministry_proof],
    ['Youth group', row.youth_group_proof],
    ['Nursery', row.nursery_proof],
    ['Young adults', row.young_adults_proof],
    ['College ministry', row.college_ministry_proof],
    ['Choir', row.choir_proof],
    ['Livestream', row.livestream_online_proof],
    ['Small groups or Bible study', row.small_groups_bible_study_proof],
    ['School or preschool', row.school_preschool_proof],
    ['Traditional worship', row.worship_style_proof],
    ['Contemporary worship', row.worship_style_proof],
    ['Liturgical worship', row.worship_style_proof],
    ['Blended worship', row.worship_style_proof],
    ['Gospel worship', row.worship_style_proof],
    ['Charismatic worship', row.worship_style_proof],
    ['Community service', row.outreach_proof],
    ['Missions', row.outreach_proof],
    ['Food pantry', row.outreach_proof],
    ['Grief and care support', row.outreach_proof],
    ['Recovery', row.outreach_proof],
    ['ESL', row.outreach_proof],
    ['Wheelchair access', row.accessibility_proof],
    ['Hearing assistance', row.accessibility_proof],
    ['ASL', row.accessibility_proof],
    ['Affirming, in their words', row.lgbtq_stance_proof],
  ];
  const found = table.find(([name]) => name === label);
  return cleanQuote(found?.[1]);
}
