import L from 'leaflet';
import { choiceCount, matchesSearch, readSearchFilters, type SearchableChurch } from '@shared/filters';

export interface MapChurch extends SearchableChurch {
  lat: number | null;
  lng: number | null;
  sunday: string;
  address: string;
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
      `<strong>${escapeHtml(church.name)}</strong><br>${escapeHtml(church.typeName || 'Church type not listed yet')}<br>${escapeHtml(church.sunday || 'Sunday time not listed')}<br><a href="/church/${encodeURIComponent(church.slug)}">Open the listing</a>`,
    );
    markers.set(church.slug, marker);
  }

  const form = document.querySelector<HTMLFormElement>('#map-filters');

  function currentFilters() {
    const params = new URLSearchParams();
    const raw = new FormData(form ?? undefined);
    for (const [key, value] of raw.entries()) {
      if (typeof value === 'string' && value.trim()) params.append(key, value.trim());
    }
    return readSearchFilters(params);
  }

  function render() {
    const filters = currentFilters();
    const visible = churches.filter((church) => matchesSearch(church, filters));
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
            <span class="schedule-meta">${escapeHtml([church.city, church.typeName].filter(Boolean).join(', ') || 'Charlotte')}</span>
            ${pin}
          </span>
        </a>`;
      })
      .join('');
    const params = new URLSearchParams();
    const raw = new FormData(form ?? undefined);
    for (const [key, value] of raw.entries()) {
      if (typeof value === 'string' && value.trim()) params.append(key, value.trim());
    }
    const query = params.toString();
    const next = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.replaceState(null, '', next);
    document.querySelectorAll<HTMLElement>('.choice-count').forEach((node) => {
      const key = node.dataset.for || '';
      const split = key.indexOf(':');
      if (split < 0) return;
      const name = key.slice(0, split);
      const value = key.slice(split + 1);
      node.textContent = String(choiceCount(churches, filters, name, value));
    });
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
