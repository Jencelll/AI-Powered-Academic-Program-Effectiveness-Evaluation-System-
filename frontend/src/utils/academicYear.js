// Utility helpers to parse and format academic year strings consistently

// Parse base year from strings like "A.Y. 2024–2025", "2024/2025", "2024-2025"
export function parseAcademicYearBase(input) {
  if (!input) return null;
  const s = String(input).trim();
  // Extract two years if present
  const matchTwo = s.match(/(\d{4})\s*[\-/–—]\s*(\d{4})/);
  if (matchTwo) {
    const y1 = Number(matchTwo[1]);
    const y2 = Number(matchTwo[2]);
    if (!isNaN(y1) && !isNaN(y2)) return Math.min(y1, y2);
  }
  // Extract single year
  const matchOne = s.match(/(\d{4})/);
  if (matchOne) {
    const y = Number(matchOne[1]);
    if (!isNaN(y)) return y;
  }
  return null;
}

export function formatAcademicYearRange(baseYear) {
  const y = Number(baseYear);
  if (isNaN(y) || y <= 0) return '';
  return `${y}–${y + 1}`; // use en dash
}

// Get year from upload object (supports different shapes)
export function getYearFromUpload(upload) {
  // Prefer explicit year (check both 'academic_year' and 'year' props)
  const explicitYear = parseAcademicYearBase(upload?.academic_year || upload?.year);
  if (explicitYear) return explicitYear;
  // Try analysis_date
  const d = new Date(String(upload?.analysis_date || ''));
  if (!isNaN(d.getTime())) return d.getFullYear();
  // Try metadata embedded
  const metaStr = upload?.file_paths || upload?.metadata;
  if (metaStr) {
    try {
      const obj = typeof metaStr === 'string' ? JSON.parse(metaStr) : metaStr;
      const ay = obj?.metadata?.academic_year || obj?.metadata?.year || obj?.academic_year;
      const parsed = parseAcademicYearBase(ay);
      if (parsed) return parsed;
    } catch {}
  }
  return null;
}

export function sortByAcademicYear(items, order = 'newest', getYear = getYearFromUpload) {
  const arr = [...(items || [])];
  arr.sort((a, b) => {
    const ya = getYear(a) ?? -Infinity;
    const yb = getYear(b) ?? -Infinity;
    return order === 'oldest' ? ya - yb : yb - ya;
  });
  return arr;
}