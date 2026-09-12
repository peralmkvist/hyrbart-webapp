import { redirect } from 'next/navigation';

export default async function MessagesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/topsecret/${locale}/kalender`);
}
