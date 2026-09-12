import NewListingFlow from '@/components/NewListingFlow';

export default async function NewListingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <NewListingFlow locale={locale} />;
}
