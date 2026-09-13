export function formatProfileTenure(startDate: string | null | undefined, locale: string, now = new Date()) {
  if (!startDate) return '–';
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime()) || start > now) return '–';

  let months = (now.getUTCFullYear() - start.getUTCFullYear()) * 12 + (now.getUTCMonth() - start.getUTCMonth());
  if (now.getUTCDate() < start.getUTCDate()) months -= 1;
  months = Math.max(0, months);

  const en = locale === 'en';
  if (months < 12) return en ? `${months} mo` : `${months} mån`;

  const years = Math.round(((now.getTime() - start.getTime()) / (365.2425 * 24 * 60 * 60 * 1000)) * 2) / 2;
  const value = Number.isInteger(years) ? String(years) : (en ? years.toFixed(1) : years.toFixed(1).replace('.', ','));
  return en ? `${value} yr` : `${value} år`;
}
