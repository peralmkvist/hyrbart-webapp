'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Photo = { id:string; stage:'pickup'|'return'; created_at:string; url:string|null };

type Props = {
  bookingId: string;
  status: string;
  locale: string;
  isRenter: boolean;
};

export default function BookingConditionEvidence({ bookingId, status, locale, isRenter }: Props) {
  const en = locale === 'en';
  const router = useRouter();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const pickupPhotos = useMemo(() => photos.filter(photo => photo.stage === 'pickup'), [photos]);
  const returnPhotos = useMemo(() => photos.filter(photo => photo.stage === 'return'), [photos]);
  const requiredStage: 'pickup'|'return'|null = isRenter && status === 'paid'
    ? 'pickup'
    : isRenter && status === 'active'
      ? 'return'
      : null;

  async function load() {
    try {
      const response = await fetch(`/api/bookings/${bookingId}/condition-photos`, { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json() as { photos?: Photo[] };
      setPhotos(data.photos ?? []);
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, [bookingId]);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !requiredStage) return;
    setUploading(true); setError('');
    try {
      const body = new FormData();
      body.set('stage', requiredStage);
      body.set('file', file);
      const response = await fetch(`/api/bookings/${bookingId}/condition-photos`, { method: 'POST', body });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || (en ? 'Could not save photo.' : 'Kunde inte spara bilden.'));
      await load();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : (en ? 'Something went wrong.' : 'Något gick fel.'));
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  const nextCopy = (() => {
    if (['requested','reserved'].includes(status)) return isRenter
      ? (en ? 'Waiting for the owner to respond to your request.' : 'Väntar på att uthyraren ska svara på din förfrågan.')
      : (en ? 'Respond to the booking request.' : 'Svara på bokningsförfrågan.');
    if (status === 'accepted') return isRenter
      ? (en ? 'The booking is approved. Pay before pickup can begin.' : 'Bokningen är godkänd. Betala innan utlämningen kan påbörjas.')
      : (en ? 'The booking is approved and waiting for payment from the renter.' : 'Bokningen är godkänd och väntar på betalning från hyrestagaren.');
    if (status === 'paid') return isRenter
      ? (en ? 'At pickup you must document the condition with at least one photo before the rental can start.' : 'Vid utlämning måste du dokumentera skicket med minst en bild innan hyran kan starta.')
      : (en ? 'Payment is complete. The renter must photograph the item at pickup before the rental starts.' : 'Betalningen är klar. Hyrestagaren måste fotografera produkten vid utlämning innan hyran startar.');
    if (status === 'active') return isRenter
      ? (en ? 'At return you must take at least one new condition photo before the rental can be marked returned.' : 'Vid återlämning måste du ta minst en ny skickbild innan hyran kan markeras som återlämnad.')
      : (en ? 'Rental in progress. The renter must add a return photo when handing it back.' : 'Uthyrningen pågår. Hyrestagaren måste lägga till en återlämningsbild när produkten lämnas tillbaka.');
    if (status === 'returned') return isRenter
      ? (en ? 'Returned. The owner will confirm completion.' : 'Återlämnad. Uthyraren bekräftar därefter att uthyrningen är avslutad.')
      : (en ? 'The renter has documented the return. Confirm completion when everything looks correct.' : 'Hyrestagaren har dokumenterat återlämningen. Bekräfta avslut när allt ser korrekt ut.');
    if (status === 'completed') return en ? 'Rental completed.' : 'Uthyrningen är avslutad.';
    if (status === 'cancelled') return en ? 'Booking cancelled.' : 'Bokningen är avbokad.';
    if (status === 'refunded') return en ? 'Booking cancelled and payment marked as refunded.' : 'Bokningen är avbokad och betalningen markerad som återbetald.';
    if (status === 'declined') return en ? 'Booking request declined.' : 'Bokningsförfrågan är nekad.';
    return null;
  })();

  return <section className="bookingConditionCard">
    <div className="bookingConditionHeader">
      <div>
        <span>{en ? 'Condition documentation' : 'Skickdokumentation'}</span>
        <strong>{en ? 'Photos at pickup and return' : 'Bilder vid utlämning och återlämning'}</strong>
      </div>
      <span className="bookingConditionRequired">{en ? 'Required' : 'Obligatoriskt'}</span>
    </div>

    {nextCopy ? <div className="bookingNextStep"><span>{en ? 'Next step' : 'Nästa steg'}</span><strong>{nextCopy}</strong></div> : null}

    <div className="bookingConditionStages">
      <ConditionStage title={en?'Pickup':'Utlämning'} photos={pickupPhotos} empty={en?'No photo yet':'Ingen bild ännu'} />
      <ConditionStage title={en?'Return':'Återlämning'} photos={returnPhotos} empty={en?'No photo yet':'Ingen bild ännu'} />
    </div>

    {requiredStage ? <label className="bookingConditionCapture">
      <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" capture="environment" disabled={uploading} onChange={upload}/>
      <span>{uploading
        ? (en ? 'Saving photo…' : 'Sparar bild…')
        : requiredStage === 'pickup'
          ? (en ? 'Take pickup photo and start rental' : 'Ta utlämningsbild och starta hyran')
          : (en ? 'Take return photo and mark returned' : 'Ta återlämningsbild och markera återlämnad')}</span>
    </label> : null}

    {!loading && isRenter ? <small className="bookingConditionHint">{en ? 'At least one image is required at each handover. The camera opens directly on supported phones.' : 'Minst en bild krävs vid varje överlämning. På telefoner som stöder det öppnas kameran direkt.'}</small> : null}
    {error ? <small className="bookingDecisionError" role="alert">{error}</small> : null}
  </section>;
}

function ConditionStage({ title, photos, empty }: { title:string; photos:Photo[]; empty:string }) {
  return <div className="bookingConditionStage">
    <div className="bookingConditionStageTitle"><strong>{title}</strong><span>{photos.length ? `${photos.length} ✓` : '—'}</span></div>
    {photos.length ? <div className="bookingConditionPhotos">{photos.map(photo => photo.url ? <a key={photo.id} href={photo.url} target="_blank" rel="noreferrer"><img src={photo.url} alt="" /></a> : null)}</div> : <small>{empty}</small>}
  </div>;
}
