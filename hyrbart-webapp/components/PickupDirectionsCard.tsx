import { appleMapsDirectionsUrl, canRenterSeePickupLocation, googleMapsDirectionsUrl, hasPickupCoordinates, type PickupSnapshot } from '@/lib/pickup-directions';

type Props = PickupSnapshot & {
  status: string;
  locale: string;
};

export default function PickupDirectionsCard(props: Props) {
  const en = props.locale === 'en';
  if (!canRenterSeePickupLocation(props.status) || !hasPickupCoordinates(props)) return null;

  const googleUrl = googleMapsDirectionsUrl(props);
  const appleUrl = appleMapsDirectionsUrl(props);
  const title = props.pickup_location_name || (en ? 'Pickup location' : 'Utlämningsplats');
  const address = props.pickup_location_address;

  return <section aria-label={en ? 'Pickup location and directions' : 'Utlämningsplats och vägbeskrivning'} style={{background:'#fff',borderRadius:20,padding:18,display:'grid',gap:14}}>
    <div style={{display:'grid',gap:4}}>
      <span style={{fontSize:12,fontWeight:800,textTransform:'uppercase',letterSpacing:'.04em',color:'var(--muted)'}}>{en ? 'Pickup location' : 'Utlämningsplats'}</span>
      <strong style={{fontSize:18}}>{title}</strong>
      {address ? <span>{address}</span> : null}
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10}}>
      {googleUrl ? <a href={googleUrl} target="_blank" rel="noopener noreferrer" style={{minHeight:48,borderRadius:14,border:'1px solid var(--line)',display:'grid',placeItems:'center',fontWeight:800,textDecoration:'none',color:'inherit'}}>{en ? 'Google Maps' : 'Google Maps'}</a> : null}
      {appleUrl ? <a href={appleUrl} target="_blank" rel="noopener noreferrer" style={{minHeight:48,borderRadius:14,border:'1px solid var(--line)',display:'grid',placeItems:'center',fontWeight:800,textDecoration:'none',color:'inherit'}}>{en ? 'Apple Maps' : 'Apple Maps'}</a> : null}
    </div>
    <small style={{color:'var(--muted)'}}>{en ? 'The exact pickup location is shown only after payment.' : 'Den exakta utlämningsplatsen visas först efter betalning.'}</small>
  </section>;
}
