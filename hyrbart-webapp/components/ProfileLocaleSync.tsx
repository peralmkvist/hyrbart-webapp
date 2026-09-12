'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function ProfileLocaleSync({locale}:{locale:string}){
 const pathname=usePathname(); const router=useRouter();
 useEffect(()=>{let active=true;fetch('/api/profile/preferences',{cache:'no-store'}).then(r=>r.ok?r.json():null).then((data:{preferredLanguage?:string}|null)=>{if(!active)return;const preferred=data?.preferredLanguage==='en'?'en':'sv';if(preferred===locale)return;const next=pathname.replace(/\/(sv|en)(?=\/|$)/,`/${preferred}`);router.replace(next)}).catch(()=>{});return()=>{active=false}},[locale,pathname,router]);
 return null;
}
