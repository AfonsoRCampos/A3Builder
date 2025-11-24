// Utilities to generate time buckets (date-only ISO strings) for Check/Act data entry.
// Supported frequencies: 'daily', 'weekly', 'monthly'. Weeks start on Monday.
// All dates are treated as date-only (YYYY-MM-DD) and returned as ISO date strings (YYYY-MM-DD).

// Parse a date-like value (Date or YYYY-MM-DD string) into a Date at UTC midnight
function parseToDate(dateLike) {
  if (!dateLike) return null;
  if (dateLike instanceof Date) {
    // normalize to UTC midnight
    return new Date(Date.UTC(dateLike.getUTCFullYear(), dateLike.getUTCMonth(), dateLike.getUTCDate()));
  }
  const s = String(dateLike).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const parts = s.split('-');
  const y = Number(parts[0]);
  const m = Number(parts[1]) - 1;
  const d = Number(parts[2]);
  return new Date(Date.UTC(y, m, d));
}

// Format a Date (or date-like) as YYYY-MM-DD
function formatIso(dateLike) {
  const d = parseToDate(dateLike);
  if (!d) return '';
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(date, days) {
  const t = new Date(date.getTime());
  t.setUTCDate(t.getUTCDate() + days);
  return t;
}

function startOfWeekMonday(date) {
  // date is Date (UTC)
  const day = date.getUTCDay(); // 0=Sun,1=Mon...
  const diff = (day === 0) ? -6 : (1 - day); // shift to Monday
  return addDays(date, diff);
}

function startOfMonth(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function generateBuckets(startIso, endIso, frequency = 'monthly') {
  // Returns array of Date objects (UTC midnight) representing bucket start dates inclusive.
  const start = parseToDate(startIso);
  const end = parseToDate(endIso);
  if (!start || !end || start.getTime() > end.getTime()) return [];

  const buckets = [];
  if (frequency === 'daily') {
    let cursor = start;
    while (cursor.getTime() <= end.getTime()) {
      buckets.push(parseToDate(cursor));
      cursor = addDays(cursor, 1);
    }
    return buckets;
  }

  if (frequency === 'weekly') {
    // Align to Monday of the week that includes the start date
    let cursor = startOfWeekMonday(start);
    while (cursor.getTime() <= end.getTime()) {
      buckets.push(parseToDate(cursor));
      cursor = addDays(cursor, 7);
    }
    return buckets;
  }

  if (frequency === 'monthly') {
    let cursor = startOfMonth(start);
    while (cursor.getTime() <= end.getTime()) {
      buckets.push(parseToDate(cursor));
      // advance month
      const y = cursor.getUTCFullYear();
      const m = cursor.getUTCMonth();
      cursor = new Date(Date.UTC(y, m + 1, 1));
    }
    return buckets;
  }

  // unknown frequency
  return [];
}

export function countBuckets(startIso, endIso, frequency = 'monthly') {
  return generateBuckets(startIso, endIso, frequency).length;
}

export function shouldDisableFrequency(startIso, endIso, frequency = 'monthly', maxBuckets = 50) {
  const n = countBuckets(startIso, endIso, frequency);
  return n > maxBuckets || n < 2;
}

const bucketUtils = {
  generateBuckets,
  countBuckets,
  shouldDisableFrequency,
  formatIso,
  parseToDate
};

export default bucketUtils;
