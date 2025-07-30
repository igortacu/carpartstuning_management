// src/utils/formatDate.ts
export function formatDateForInsert(raw: string): string {
  // split on dash or slash
  const parts = raw.split(/[-/]/);
  if (parts.length === 3) {
    let [day, month, year] = parts.map(p => p.padStart(2, '0'));
    // two‑digit year → assume 2000+
    if (year.length === 2) year = '20' + year;
    return `${year}-${month}-${day}`;
  }
  // fallback: return original
  return raw;
}
