import { notFound } from 'next/navigation';
import ProfileLocaleSync from '@/components/ProfileLocaleSync';
import NotificationBell from '@/components/NotificationBell';

export function generateStaticParams() { return [{ locale: 'sv' }, { locale: 'en' }]; }

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== 'sv' && locale !== 'en') notFound();
  return <><ProfileLocaleSync locale={locale}/><NotificationBell locale={locale}/>{children}</>;
}
