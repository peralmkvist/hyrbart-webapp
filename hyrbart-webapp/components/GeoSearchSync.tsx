'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type GeoResult = { label?: string };

export default function GeoSearchSync({ locale }: { locale: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const running = useRef(false);
  const signature = searchParams.toString();

  useEffect(() => {
    const params = new URLSearchParams(signature);
    const hasCoordinates = Number.isFinite(Number(params.get('lat'))) && Number.isFinite(Number(params.get('lng'))) && params.has('lat') && params.has('lng');
    if (hasCoordinates || params.get('geoError') === 'denied' || !navigator.geolocation || running.current) return;

    const explicitlyNearby = params.get('nearby') === '1';
    const hasNamedPlace = Boolean(params.get('place')?.trim());

    async function locate() {
      running.current = true;
      navigator.geolocation.getCurrentPosition(async position => {
        const lat = Number(position.coords.latitude.toFixed(5));
        const lng = Number(position.coords.longitude.toFixed(5));
        let label = locale === 'en' ? 'My location' : 'Min plats';
        try {
          const response = await fetch(`/api/reverse-geocode?lat=${lat}&lng=${lng}`, { cache: 'no-store' });
          if (response.ok) {
            const data = await response.json() as GeoResult;
            if (data.label?.trim()) label = data.label.trim();
          }
        } catch {}
        const next = new URLSearchParams(signature);
        next.set('lat', String(lat));
        next.set('lng', String(lng));
        next.set('geo', 'current');
        next.set('nearby', '1');
        next.set('place', label);
        if (!next.get('radius')) next.set('radius', '10');
        next.delete('geoError');
        running.current = false;
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      }, error => {
        running.current = false;
        if (explicitlyNearby && (error.code === error.PERMISSION_DENIED || error.code === error.POSITION_UNAVAILABLE || error.code === error.TIMEOUT)) {
          const next = new URLSearchParams(signature);
          next.delete('nearby');
          next.delete('lat');
          next.delete('lng');
          next.delete('geo');
          next.set('geoError', error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable');
          router.replace(`${pathname}?${next.toString()}`, { scroll: false });
        }
      }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
    }

    if (explicitlyNearby) {
      void locate();
      return;
    }
    if (hasNamedPlace) return;

    if ('permissions' in navigator && navigator.permissions?.query) {
      navigator.permissions.query({ name: 'geolocation' }).then(status => {
        if (status.state === 'granted') void locate();
      }).catch(() => {});
    }
  }, [locale, pathname, router, signature]);

  return null;
}
