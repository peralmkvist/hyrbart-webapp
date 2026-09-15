'use client';

import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { svSELocale } from '@sanity/locale-sv-se';
import { schemaTypes } from './sanity/schemaTypes';
import { availabilityBlock } from './sanity/availabilitySchema';
import { CompactField } from './sanity/TranslationToolInput';

export default defineConfig({
  name: 'default',
  title: 'Hyrbart',
  basePath: '/studio',
  // Recovery project replacing the permanently deleted djps09z6 project.
  projectId: 'ew1i5o0v',
  dataset: 'production',
  plugins: [structureTool(), svSELocale()],
  schema: {
    types: [
      ...schemaTypes.filter((type) => type.name !== 'availabilityBlock'),
      availabilityBlock,
    ],
  },
  form: {
    components: {
      field: CompactField,
    },
  },
});
