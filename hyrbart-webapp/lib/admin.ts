import 'server-only';
import {createClient} from '@/lib/supabase/server';

export async function requireAdmin(){
  const s=await createClient();
  const {data:{user}}=await s.auth.getUser();
  if(!user)return null;
  const configured=(process.env.HYRBART_ADMIN_EMAILS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
  if(!user.email||!configured.includes(user.email.toLowerCase()))return null;
  return user;
}
