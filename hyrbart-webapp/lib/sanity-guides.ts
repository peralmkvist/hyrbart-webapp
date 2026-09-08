const projectId = 'djps09z6';
const dataset = 'production';
const apiVersion = '2026-09-08';

export type LocalizedGuideText = {
  sv?: string;
  en?: string;
};

export type GuideCard = {
  title?: LocalizedGuideText;
  body?: LocalizedGuideText;
};

export type GuideInfoBox = {
  title?: LocalizedGuideText;
  body?: LocalizedGuideText;
};

export type GuideSection = {
  key: string;
  stepNumber?: number;
  title?: LocalizedGuideText;
  intro?: LocalizedGuideText;
  cards?: GuideCard[];
  infoBox?: GuideInfoBox;
};

export type ProductGuide = {
  brand: string;
  name: string;
  slug: string;
  sections: GuideSection[];
};

async function sanityQuery<T>(query: string): Promise<T> {
  const url = `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?query=${encodeURIComponent(query)}`;
  const response = await fetch(url, { next: { revalidate: 60 } });

  if (!response.ok) {
    throw new Error(`Sanity request failed: ${response.status}`);
  }

  const payload = (await response.json()) as { result: T };
  return payload.result;
}

export async function getProductGuide(slug: string): Promise<ProductGuide | null> {
  try {
    const safeSlug = JSON.stringify(slug);
    return await sanityQuery<ProductGuide | null>(`*[_type == "product" && slug.current == ${safeSlug}][0]{
      brand,
      name,
      "slug": slug.current,
      "sections": guideSections[]{
        key,
        stepNumber,
        title{sv, en},
        intro{sv, en},
        cards[]{
          title{sv, en},
          body{sv, en}
        },
        infoBox{
          title{sv, en},
          body{sv, en}
        }
      }
    }`);
  } catch (error) {
    console.error(`Could not load guide for ${slug} from Sanity.`, error);
    return null;
  }
}
