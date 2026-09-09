import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type TranslationEntry = {
  id: string;
  text: string;
};

function secureEquals(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function extractOutputText(payload: any) {
  if (typeof payload?.output_text === 'string') return payload.output_text;

  for (const item of payload?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (content?.type === 'output_text' && typeof content?.text === 'string') {
        return content.text;
      }
    }
  }

  return '';
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  const translationKey = process.env.HYRBART_TRANSLATION_KEY;

  if (!apiKey || !translationKey) {
    return NextResponse.json(
      { error: 'Översättningstjänsten är inte konfigurerad ännu.' },
      { status: 503 },
    );
  }

  const providedKey = request.headers.get('x-translation-key') ?? '';
  if (!providedKey || !secureEquals(providedKey, translationKey)) {
    return NextResponse.json({ error: 'Ogiltig översättningsnyckel.' }, { status: 401 });
  }

  let body: { entries?: TranslationEntry[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ogiltig förfrågan.' }, { status: 400 });
  }

  const entries = Array.isArray(body.entries) ? body.entries : [];
  const valid = entries.length > 0
    && entries.length <= 150
    && entries.every((entry) => (
      typeof entry?.id === 'string'
      && /^t\d+$/.test(entry.id)
      && typeof entry?.text === 'string'
      && entry.text.trim().length > 0
      && entry.text.length <= 6000
    ));

  const totalCharacters = entries.reduce((sum, entry) => sum + (entry?.text?.length ?? 0), 0);
  if (!valid || totalCharacters > 60000) {
    return NextResponse.json({ error: 'För mycket eller ogiltig text att översätta.' }, { status: 400 });
  }

  const prompt = [
    'Translate the following Swedish product-rental content into natural, concise English.',
    'The content is for Hyrbart, a Swedish tool and equipment rental service.',
    'Preserve the exact meaning and practical tone.',
    'Do not translate brand names, model names, product codes, numbers, dimensions, units or technical abbreviations.',
    'Return ONLY a valid JSON object where each input id maps to its English translation.',
    'Do not add markdown, explanations, comments or extra keys.',
    '',
    JSON.stringify(entries),
  ].join('\n');

  try {
    const openAIResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5.6-luna',
        input: prompt,
      }),
    });

    const payload = await openAIResponse.json();
    if (!openAIResponse.ok) {
      console.error('OpenAI translation error', payload);
      return NextResponse.json({ error: 'OpenAI kunde inte genomföra översättningen.' }, { status: 502 });
    }

    const rawText = extractOutputText(payload).trim();
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    const translations = JSON.parse(cleaned) as Record<string, unknown>;
    const complete = entries.every((entry) => (
      typeof translations?.[entry.id] === 'string'
      && (translations[entry.id] as string).trim().length > 0
    ));

    if (!complete) {
      throw new Error('Incomplete translation response');
    }

    const result: Record<string, string> = {};
    for (const entry of entries) {
      result[entry.id] = String(translations[entry.id]);
    }

    return NextResponse.json({ translations: result });
  } catch (error) {
    console.error('Translation endpoint error', error);
    return NextResponse.json({ error: 'Översättningen misslyckades. Försök igen.' }, { status: 502 });
  }
}
