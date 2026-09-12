import HostListingsManager from '@/components/HostListingsManager';

export default async function HostListingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <HostListingsManager locale={locale} />;
}
