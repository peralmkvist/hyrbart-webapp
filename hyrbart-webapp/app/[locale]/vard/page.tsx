import HostCalendar from '@/components/HostCalendar';

export default async function HostCalendarPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <HostCalendar locale={locale} />;
}
