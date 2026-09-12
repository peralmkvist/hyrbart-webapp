import RenterCalendar from '@/components/RenterCalendar';

export default async function RenterCalendarPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <RenterCalendar locale={locale} />;
}
