import MessageInbox from '@/components/MessageInbox';

export default async function MessagesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <MessageInbox locale={locale} />;
}
