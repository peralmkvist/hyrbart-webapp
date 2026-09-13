import { notFound, redirect } from 'next/navigation';
import { getProducts } from '@/lib/sanity-products';
import { resolveUserIdFromSanityProfile } from '@/lib/review-summaries';

export const dynamic = 'force-dynamic';

export default async function LegacyPublicProfilePage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;
  const products=await getProducts();
  const owner=products.find(product=>product.owner?.name==='Per')?.owner ?? products.find(product=>product.owner)?.owner;
  const userId=await resolveUserIdFromSanityProfile(owner?.id);
  if(!userId)notFound();
  redirect(`/${locale}/profil/${userId}`);
}
