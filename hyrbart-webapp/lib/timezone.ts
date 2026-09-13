const STOCKHOLM_TIME_ZONE = 'Europe/Stockholm';

function offsetMinutesFor(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'longOffset',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
  const zone = formatter.formatToParts(date).find(part => part.type === 'timeZoneName')?.value ?? 'GMT+00:00';
  const match = zone.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return match[1] === '-' ? -minutes : minutes;
}

export function stockholmLocalDateTimeToIso(date: string, time: string) {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const wallClockAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  const firstOffset = offsetMinutesFor(new Date(wallClockAsUtc), STOCKHOLM_TIME_ZONE);
  let instant = new Date(wallClockAsUtc - firstOffset * 60_000);
  const correctedOffset = offsetMinutesFor(instant, STOCKHOLM_TIME_ZONE);
  if (correctedOffset !== firstOffset) instant = new Date(wallClockAsUtc - correctedOffset * 60_000);
  return instant.toISOString();
}
