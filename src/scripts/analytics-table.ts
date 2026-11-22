interface Row {
  name: string;
  slug: string;
  family: string;
  body: string;
  city: string;
  zip: string;
  languages: string;
  sunday: string;
  proof: string;
}

export function mountTable(table: HTMLTableElement, rows: Row[]): void {
  const tbody = table.querySelector('tbody');
  const filter = document.querySelector<HTMLInputElement>('#table-filter');
  const family = document.querySelector<HTMLSelectElement>('#table-family');
  const city = document.querySelector<HTMLSelectElement>('#table-city');
  if (!tbody) return;
  let sortKey: keyof Row = 'name';
  let direction = 1;

  function draw() {
    const q = filter?.value.trim().toLowerCase() ?? '';
    const familyValue = family?.value ?? '';
    const cityValue = city?.value ?? '';
    const visible = rows
      .filter((row) => {
        if (familyValue && row.family !== familyValue) return false;
        if (cityValue && row.city !== cityValue) return false;
        if (!q) return true;
        return Object.values(row).join(' ').toLowerCase().includes(q);
      })
      .sort((a, b) => a[sortKey].localeCompare(b[sortKey]) * direction);
    tbody.innerHTML = visible
      .map(
        (row) => `<tr class="border-t border-cream-200">
          <td class="px-3 py-2"><a class="text-primary-800 hover:underline" href="/church/${encodeURIComponent(row.slug)}">${escapeHtml(row.name)}</a></td>
          <td class="px-3 py-2">${escapeHtml(row.family)}</td>
          <td class="px-3 py-2">${escapeHtml(row.body)}</td>
          <td class="px-3 py-2">${escapeHtml(row.city)}</td>
          <td class="px-3 py-2">${escapeHtml(row.zip)}</td>
          <td class="px-3 py-2">${escapeHtml(row.languages)}</td>
          <td class="px-3 py-2">${escapeHtml(row.sunday || 'Not listed')}</td>
          <td class="px-3 py-2">${escapeHtml(row.proof)}</td>
        </tr>`,
      )
      .join('');
    const count = document.querySelector('#table-count');
    if (count) count.textContent = `${visible.length} churches`;
  }

  table.querySelectorAll<HTMLButtonElement>('[data-sort]').forEach((button) => {
    button.addEventListener('click', () => {
      const key = button.dataset.sort as keyof Row;
      if (sortKey === key) direction *= -1;
      else {
        sortKey = key;
        direction = 1;
      }
      draw();
    });
  });
  filter?.addEventListener('input', draw);
  family?.addEventListener('change', draw);
  city?.addEventListener('change', draw);
  draw();
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
