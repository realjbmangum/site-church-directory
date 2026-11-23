import L from 'leaflet';
import { TIME_BUCKETS, timeBucket } from '@shared/time';

export interface MapChurch {
  slug: string;
  name: string;
  lat: number | null;
  lng: number | null;
  family: string;
  familySlug: string;
  body: string;
  bodySlug: string;
  city: string;
  zip: string;
  languages: string;
  minutes: number | null;
  sunday: string;
  address: string;
}

interface Filters {
  q: string;
  family: string;
  body: string;
  language: string;
  place: string;
  time: string;
}

function readFilters(params: URLSearchParams): Filters {
  return {
    q: params.get('q')?.trim().toLowerCase() ?? '',
    family: params.get('family') ?? '',
    body: params.get('body') ?? '',
    language: params.get('language') ?? '',
    place: params.get('place')?.trim().toLowerCase() ?? '',
    time: params.get('time') ?? '',
  };
}

function matches(church: MapChurch, filters: Filters): boolean {
  if (filters.family && church.familySlug !== filters.family) return false;
  if (filters.body && church.bodySlug !== filters.body) return false;
  if (filters.language) {
    const languages = church.languages.toLowerCase().split(';').map((part) => part.trim());
    if (!languages.includes(filters.language.toLowerCase())) return false;
  }
  if (filters.time && timeBucket(church.minutes) !== filters.time) return false;
  if (filters.place) {
    const hay = `${church.city} ${church.zip}`.toLowerCase();
    if (!hay.includes(filters.place)) return false;
  }
  if (filters.q) {
    const hay = `${church.name} ${church.city} ${church.zip} ${church.family} ${church.body}`.toLowerCase();
    if (!hay.includes(filters.q)) return false;
  }
  return true;
}

export function mountMap(mapEl: HTMLElement, listEl: HTMLElement, countEl: HTMLElement, churches: MapChurch[]): void {
  const map = L.map(mapEl, { scrollWheelZoom: true }).setView([35.2271, -80.8431], 10);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  const group = L.featureGroup().addTo(map);
  const markers = new Map<string, L.CircleMarker>();
  for (const church of churches) {
    if (church.lat == null || church.lng == null) continue;
    const marker = L.circleMarker([church.lat, church.lng], pinStyle(false));
    marker.bindPopup(
      `<strong>${escapeHtml(church.name)}</strong><br>${escapeHtml(church.family || 'Denomination not stated')}<br>${escapeHtml(church.sunday || 'Sunday time not listed')}<br><a href="/church/${encodeURIComponent(church.slug)}">Open the listing</a>`,
    );
    markers.set(church.slug, marker);
  }

  const form = document.querySelector<HTMLFormElement>('#map-filters');
  const bodySelect = document.querySelector<HTMLSelectElement>('#filter-body');

  function currentFilters(): Filters {
    const data = new FormData(form ?? undefined);
    return {
      q: String(data.get('q') ?? '').trim().toLowerCase(),
      family: String(data.get('family') ?? ''),
      body: String(data.get('body') ?? ''),
      language: String(data.get('language') ?? ''),
      place: String(data.get('place') ?? '').trim().toLowerCase(),
      time: String(data.get('time') ?? ''),
    };
  }

  function syncBodyOptions(family: string) {
    if (!bodySelect) return;
    const current = bodySelect.value;
    for (const option of Array.from(bodySelect.options)) {
      if (!option.value) {
        option.hidden = false;
        continue;
      }
      const optionFamily = option.dataset.family ?? '';
      option.hidden = Boolean(family) && optionFamily !== family;
    }
    const selected = bodySelect.selectedOptions[0];
    if (selected?.hidden) bodySelect.value = '';
    else bodySelect.value = current;
  }

  function render() {
    const filters = currentFilters();
    syncBodyOptions(filters.family);
    const visible = churches.filter((church) => matches(church, filters));
    group.clearLayers();
    for (const church of visible) {
      const marker = markers.get(church.slug);
      if (marker) group.addLayer(marker);
    }
    if (group.getLayers().length > 0) {
      map.invalidateSize();
      map.fitBounds(group.getBounds().pad(0.2), { maxZoom: 13 });
    }
    countEl.textContent = `${visible.length} ${visible.length === 1 ? 'church' : 'churches'}`;
    listEl.innerHTML = visible
      .map((church) => {
        const pin = church.lat == null ? '<span class="schedule-meta">No map pin yet</span>' : '';
        return `<a class="schedule-row" data-slug="${escapeHtml(church.slug)}" href="/church/${encodeURIComponent(church.slug)}">
          <span class="schedule-time">${escapeHtml(church.sunday || 'Time not listed')}</span>
          <span>
            <span class="schedule-name">${escapeHtml(church.name)}</span>
            <span class="schedule-meta">${escapeHtml([church.city, church.family].filter(Boolean).join(', ') || 'Charlotte')}</span>
            ${pin}
          </span>
        </a>`;
      })
      .join('');
    const params = new URLSearchParams();
    const raw = new FormData(form ?? undefined);
    for (const [key, value] of raw.entries()) {
      if (typeof value === 'string' && value.trim()) params.set(key, value.trim());
    }
    const query = params.toString();
    const next = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.replaceState(null, '', next);
  }

  function highlight(slug: string | null) {
    for (const [key, marker] of markers) marker.setStyle(pinStyle(key === slug));
  }

  listEl.addEventListener('mouseover', (event) => {
    const row = (event.target as HTMLElement).closest<HTMLElement>('[data-slug]');
    highlight(row?.dataset.slug ?? null);
  });
  listEl.addEventListener('mouseout', (event) => {
    const next = (event.relatedTarget as HTMLElement | null)?.closest?.('[data-slug]');
    if (!next) highlight(null);
  });
  listEl.addEventListener('focusin', (event) => {
    const row = (event.target as HTMLElement).closest<HTMLElement>('[data-slug]');
    highlight(row?.dataset.slug ?? null);
  });
  listEl.addEventListener('focusout', () => highlight(null));

  form?.addEventListener('input', render);
  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    render();
  });
  render();
  window.setTimeout(() => {
    map.invalidateSize();
    if (group.getLayers().length > 0) map.fitBounds(group.getBounds().pad(0.2), { maxZoom: 13 });
  }, 200);
}

export function mountDetail(el: HTMLElement, lat: number, lng: number, name: string): void {
  const map = L.map(el, { scrollWheelZoom: false }).setView([lat, lng], 15);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);
  L.circleMarker([lat, lng], pinStyle(true)).addTo(map).bindTooltip(escapeHtml(name));
  window.setTimeout(() => map.invalidateSize(), 200);
}

function pinStyle(active: boolean): L.CircleMarkerOptions {
  return {
    radius: active ? 10 : 7,
    color: active ? '#5c3b1c' : '#1c2430',
    weight: 2,
    fillColor: active ? '#8a5a2b' : '#243044',
    fillOpacity: 0.95,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export { TIME_BUCKETS };
