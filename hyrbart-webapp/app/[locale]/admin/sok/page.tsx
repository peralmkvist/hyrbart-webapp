import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { getProducts } from '@/lib/sanity-products';

function normalize(value:unknown){return String(value||'').trim().toLowerCase();}

export default async function AdminSearchPage({
  params,
  searchParams,
}:{
  params:Promise<{locale:string}>;
  searchParams:Promise<{q?:string}>;
}){
  const {locale}=await params;
  const {q=''}=await searchParams;
  const user=await requireAdmin();
  if(!user)redirect(`/${locale}`);
  const query=q.trim();
  const needle=query.toLowerCase();
  const admin=createAdminClient();

  let profiles:any[]=[];
  let bookings:any[]=[];
  let products:any[]=[];
  let authById=new Map<string,{email:string|null}>();

  if(query.length>=2){
    const [{data:profileRows},{data:bookingRows},productRows,authResult]=await Promise.all([
      admin.from('profiles').select('id,display_name,first_name,last_name,city,bankid_verified,identity_verification_status,created_at').order('created_at',{ascending:false}).limit(300),
      admin.from('bookings').select('id,renter_id,owner_id,product_id,status,start_date,end_date,total_price,created_at').order('created_at',{ascending:false}).limit(500),
      getProducts(),
      admin.auth.admin.listUsers({page:1,perPage:500}),
    ]);
    authById=new Map((authResult.data?.users||[]).map(authUser=>[authUser.id,{email:authUser.email||null}]));
    const authMatches=new Set((authResult.data?.users||[]).filter(authUser=>normalize(authUser.email).includes(needle)).map(authUser=>authUser.id));
    profiles=(profileRows||[]).filter(profile=>[
      profile.display_name,profile.first_name,profile.last_name,profile.city,profile.id,
    ].some(value=>normalize(value).includes(needle))||authMatches.has(profile.id)).slice(0,50);
    const matchedUsers=new Set(profiles.map(profile=>profile.id));
    bookings=(bookingRows||[]).filter(booking=>[
      booking.id,booking.status,booking.product_id,booking.start_date,booking.end_date,
    ].some(value=>normalize(value).includes(needle))||matchedUsers.has(booking.renter_id)||matchedUsers.has(booking.owner_id)).slice(0,50);
    products=(productRows||[]).filter(product=>[
      product.id,product.slug,product.brand,product.name,product.type,product.category,product.owner?.name,product.owner?.city,
    ].some(value=>normalize(value).includes(needle))).slice(0,50);
  }

  return <main className="adminPage">
    <header className="adminHeader"><div><span>HYRBART ADMIN</span><h1>Global sök</h1><p>Sök användare, bokningar och annonser från en plats.</p><Link href={`/${locale}/admin`} style={{display:'inline-block',marginTop:10}}>← Adminöversikt</Link></div><div className="adminAvatar">H</div></header>

    <form method="get" style={{display:'flex',gap:10,margin:'0 0 24px'}}>
      <input name="q" defaultValue={query} autoFocus placeholder="Namn, e-post, boknings-id, produkt…" style={{flex:1,minHeight:50,border:'1px solid var(--line)',borderRadius:15,padding:'0 15px',fontSize:16}}/>
      <button type="submit" style={{minHeight:50,border:0,borderRadius:15,padding:'0 18px',background:'var(--accent)',fontWeight:850}}>Sök</button>
    </form>

    {query.length<2?<div className="adminEmpty">Skriv minst två tecken för att söka.</div>:<>
      <section style={{marginBottom:28}}><h2>Användare <small style={{fontWeight:500}}>({profiles.length})</small></h2><div className="adminQueue">{profiles.map(profile=>{
        const auth=authById.get(profile.id);
        const verified=Boolean(profile.bankid_verified||profile.identity_verification_status==='verified');
        return <Link key={profile.id} href={`/${locale}/admin/anvandare/${profile.id}`} className="adminCaseRow"><div className={`adminStatus ${verified?'resolved':'open'}`}/><div><span>{profile.city||'Ort saknas'} · skapad {new Date(profile.created_at).toLocaleDateString('sv-SE')}</span><strong>{profile.display_name||[profile.first_name,profile.last_name].filter(Boolean).join(' ')||'Namnlös användare'}</strong><small>{auth?.email||profile.id}</small></div><b>{verified?'Verifierad':'Ej verifierad'}</b><i>›</i></Link>})}{!profiles.length?<div className="adminEmpty">Inga användare matchar.</div>:null}</div></section>

      <section style={{marginBottom:28}}><h2>Bokningar <small style={{fontWeight:500}}>({bookings.length})</small></h2><div className="adminQueue">{bookings.map(booking=><Link key={booking.id} href={`/${locale}/bokningar/${booking.id}`} className="adminCaseRow"><div className={`adminStatus ${booking.status==='completed'?'resolved':['cancelled','declined','refunded'].includes(booking.status)?'rejected':'open'}`}/><div><span>{booking.start_date}–{booking.end_date}</span><strong>{booking.id}</strong><small>{booking.product_id} · {Number(booking.total_price||0).toLocaleString('sv-SE')} kr</small></div><b>{booking.status}</b><i>›</i></Link>)}{!bookings.length?<div className="adminEmpty">Inga bokningar matchar.</div>:null}</div></section>

      <section><h2>Annonser <small style={{fontWeight:500}}>({products.length})</small></h2><div className="adminQueue">{products.map(product=><div key={product.id||product.slug} className="adminCaseRow" style={{cursor:'default'}}><div className="adminStatus resolved"/><div><span>{product.category||'Kategori saknas'} · {product.type||''}</span><strong>{[product.brand,product.name].filter(Boolean).join(' ')}</strong><small>{product.slug}{product.owner?.name?` · ${product.owner.name}`:''}</small></div><b>{product.price||'—'}</b></div>)}{!products.length?<div className="adminEmpty">Inga annonser matchar.</div>:null}</div></section>
    </>}
  </main>;
}
