import EditListingFlow from '@/components/EditListingFlow';

export default async function EditListingPage({params}:{params:Promise<{locale:string;id:string}>}){
  const {locale,id}=await params;
  return <EditListingFlow locale={locale} id={decodeURIComponent(id)} />;
}
