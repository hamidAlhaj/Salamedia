// Arabic formatting helpers (CLAUDE.md §4.10). "ar-SY" everywhere so digits are consistently
// Arabic-Indic (plain "ar" gives Western digits in relative times: "قبل 5 دقائق").
const LOCALE = "ar-SY";
const TIME_ZONE = "Asia/Damascus";

const relative = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" });
const compact = new Intl.NumberFormat(LOCALE, { notation: "compact" });
const plain = new Intl.NumberFormat(LOCALE);
const twoDigits = new Intl.NumberFormat(LOCALE, { minimumIntegerDigits: 2 });
const dateFormat = new Intl.DateTimeFormat(LOCALE, { dateStyle: "medium", timeZone: TIME_ZONE });
const dateTimeFormat = new Intl.DateTimeFormat(LOCALE, {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: TIME_ZONE,
});

const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

/** "الآن", "قبل ٥ دقائق", "أمس", "قبل أسبوعين"… */
export function relativeTime(date: string | Date, now: Date = new Date()): string {
  const seconds = Math.round((new Date(date).getTime() - now.getTime()) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return "الآن";
  for (const [unit, size] of STEPS) {
    if (abs >= size) return relative.format(Math.trunc(seconds / size), unit);
  }
  return "الآن";
}

/** "١٧‏/١١‏/٢٠٢٦" (Damascus time). */
export function formatDate(date: string | Date): string {
  return dateFormat.format(new Date(date));
}

/** Date and time, for tooltips and admin tables. */
export function formatDateTime(date: string | Date): string {
  return dateTimeFormat.format(new Date(date));
}

/** "١٫٥ ألف" */
export function compactCount(n: number): string {
  return compact.format(n);
}

/** "١٢٣" */
export function formatNumber(n: number): string {
  return plain.format(n);
}

/** Video duration as m:ss, e.g. "١:٠٧". */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${plain.format(Math.floor(total / 60))}:${twoDigits.format(total % 60)}`;
}
