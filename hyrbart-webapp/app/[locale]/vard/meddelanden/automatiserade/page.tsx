import { redirect } from 'next/navigation';
import AutomatedMessages from '@/components/AutomatedMessages';
import { createClient } from '@/lib/supabase/server';

export default async function AutomatedMessagesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const en = locale === 'en';
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/topsecret/${locale}/logga-in?next=${encodeURIComponent(`/topsecret/${locale}/vard/meddelanden/automatiserade`)}`);
  return <section className="ds2Page"><header className="ds2Header"><h1>{en ? 'Automated messages' : 'Automatiserade meddelanden'}</h1><p>{en ? 'Create your own templates for your rentals.' : 'Skapa egna meddelandemallar för dina uthyrningar.'}</p></header><AutomatedMessages locale={locale}/></section>;
}
