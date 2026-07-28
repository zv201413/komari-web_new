let _tz: string | undefined;

export function setTimezone(tz: string | undefined) {
  _tz = tz || undefined;
}

export function getTimezone(): string | undefined {
  return _tz;
}

export function formatDate(
  value: Date | string | number,
  opts: Intl.DateTimeFormatOptions
): string {
  const date = value instanceof Date ? value : new Date(value);
  const timeZone = _tz || undefined;
  return date.toLocaleString([], timeZone ? { ...opts, timeZone } : opts);
}
