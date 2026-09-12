import { redirect } from 'next/navigation';

export default async function HostMessagesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/topsecret/${locale}/vard`);
}
