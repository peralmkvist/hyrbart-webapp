'use client';

import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './sanity/schemaTypes';

export default defineConfig({
  name: 'default',
  title: 'Hyrbart',
  basePath: '/studio',
  projectId: 'djps09z6',
  dataset: 'production',
  plugins: [structureTool()],
  schema: { types: schemaTypes },
});
