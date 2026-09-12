import HostBookingsWorkspace from '@/components/HostBookingsWorkspace';

export default async function HostCalendarPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <HostBookingsWorkspace locale={locale} />;
}
