export const PROFILE_PHOTO_REQUIRED_CODE = 'PROFILE_PHOTO_REQUIRED';

export function hasRequiredProfilePhoto(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const avatarUrl = value.trim();
  if (!avatarUrl) return false;

  try {
    const parsed = new URL(avatarUrl);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function profilePhotoRequiredMessage(locale: string, role: 'renter' | 'host'): string {
  const en = locale === 'en';
  if (role === 'host') {
    return en
      ? 'Add a profile photo before you can rent out or accept new bookings.'
      : 'Lägg till en profilbild innan du kan hyra ut eller godkänna nya bokningar.';
  }
  return en
    ? 'Add a profile photo before you can send a booking request.'
    : 'Lägg till en profilbild innan du kan skicka en bokningsförfrågan.';
}
