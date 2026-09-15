const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE = /(?:\+?46|0)[\s-]?(?:\d[\s-]?){7,10}\d/;
const URL = /(?:https?:\/\/|www\.)\S+/i;

export type MessagePrivacyCheck = { allowed: true } | { allowed: false; reason: 'email'|'phone'|'url' };

export function checkMessagePrivacy(value: string): MessagePrivacyCheck {
  const text = value.trim();
  if (EMAIL.test(text)) return { allowed: false, reason: 'email' };
  if (PHONE.test(text)) return { allowed: false, reason: 'phone' };
  if (URL.test(text)) return { allowed: false, reason: 'url' };
  return { allowed: true };
}

export function messagePrivacyError(reason: 'email'|'phone'|'url', en=false) {
  if (en) return reason === 'email' ? 'For your privacy, keep email addresses out of booking messages.' : reason === 'phone' ? 'For your privacy, keep phone numbers out of booking messages.' : 'For your privacy, keep external links out of booking messages.';
  return reason === 'email' ? 'För din integritet ska e-postadresser inte delas i bokningsmeddelanden.' : reason === 'phone' ? 'För din integritet ska telefonnummer inte delas i bokningsmeddelanden.' : 'För din integritet ska externa länkar inte delas i bokningsmeddelanden.';
}
