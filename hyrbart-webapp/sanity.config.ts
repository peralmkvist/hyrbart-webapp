'use client';

import { assist } from '@sanity/assist';
import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './sanity/schemaTypes';

function translationOutputs(
  documentMember: any,
  enclosingType: any,
  translateFromLanguageId: string,
  translateToLanguageIds: string[],
) {
  const localizedTypes = new Set(['localizedString', 'localizedText']);

  if (
    localizedTypes.has(enclosingType?.name) &&
    documentMember?.name === translateFromLanguageId
  ) {
    return translateToLanguageIds.map((languageId) => ({
      id: languageId,
      outputPath: [...documentMember.path.slice(0, -1), languageId],
    }));
  }

  if (enclosingType?.name === 'product') {
    if (translateFromLanguageId === 'sv' && documentMember?.name === 'typeSv') {
      return translateToLanguageIds
        .filter((languageId) => languageId === 'en')
        .map(() => ({ id: 'en', outputPath: ['typeEn'] }));
    }

    if (translateFromLanguageId === 'en' && documentMember?.name === 'typeEn') {
      return translateToLanguageIds
        .filter((languageId) => languageId === 'sv')
        .map(() => ({ id: 'sv', outputPath: ['typeSv'] }));
    }
  }

  return undefined;
}

export default defineConfig({
  name: 'default',
  title: 'Hyrbart',
  basePath: '/studio',
  projectId: 'djps09z6',
  dataset: 'production',
  plugins: [
    structureTool(),
    assist({
      assist: {
        maxPathDepth: 8,
        temperature: 0.2,
      },
      translate: {
        styleguide:
          'Translate naturally and concisely for a Swedish tool and equipment rental service. Keep brand names, model names, product codes, numbers, dimensions and units unchanged. Use clear practical English and preserve the meaning exactly.',
        field: {
          documentTypes: ['product'],
          languages: [
            { id: 'sv', title: 'Svenska' },
            { id: 'en', title: 'English' },
          ],
          translationOutputs,
        },
      },
    }),
  ],
  schema: { types: schemaTypes },
});
