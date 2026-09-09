import { defineArrayMember, defineField, defineType } from 'sanity';
import { TranslationToolInput } from './TranslationToolInput';

export const localizedString = defineType({
  name: 'localizedString',
  title: 'Lokaliserad korttext',
  type: 'object',
  fields: [
    defineField({ name: 'sv', title: 'Svenska', type: 'string' }),
    defineField({ name: 'en', title: 'Engelska', type: 'string' }),
  ],
});

export const localizedText = defineType({
  name: 'localizedText',
  title: 'Lokaliserad text',
  type: 'object',
  fields: [
    defineField({ name: 'sv', title: 'Svenska', type: 'text', rows: 4 }),
    defineField({ name: 'en', title: 'Engelska', type: 'text', rows: 4 }),
  ],
});

export const rentalPrice = defineType({
  name: 'rentalPrice',
  title: 'Hyrespris',
  type: 'object',
  fields: [
    defineField({
      name: 'days',
      title: 'Antal dagar',
      type: 'number',
      options: { list: [1, 3, 7] },
    }),
    defineField({ name: 'price', title: 'Pris', type: 'number' }),
  ],
});

export const specification = defineType({
  name: 'specification',
  title: 'Specifikation',
  type: 'object',
  fields: [
    defineField({ name: 'label', title: 'Rubrik', type: 'localizedString' }),
    defineField({ name: 'value', title: 'Värde', type: 'string' }),
  ],
});

export const guideCard = defineType({
  name: 'guideCard',
  title: 'Guidekort',
  type: 'object',
  fields: [
    defineField({ name: 'title', title: 'Rubrik', type: 'localizedString' }),
    defineField({ name: 'body', title: 'Text', type: 'localizedText' }),
  ],
});

export const guideSection = defineType({
  name: 'guideSection',
  title: 'Guidesektion',
  type: 'object',
  fields: [
    defineField({ name: 'key', title: 'Nyckel', type: 'string' }),
    defineField({ name: 'stepNumber', title: 'Stegnummer', type: 'number' }),
    defineField({ name: 'title', title: 'Rubrik', type: 'localizedString' }),
    defineField({ name: 'intro', title: 'Introduktion', type: 'localizedText' }),
    defineField({
      name: 'cards',
      title: 'Guidekort',
      type: 'array',
      of: [defineArrayMember({ type: 'guideCard' })],
    }),
    defineField({
      name: 'infoBox',
      title: 'Informationsruta',
      type: 'object',
      fields: [
        defineField({ name: 'title', title: 'Rubrik', type: 'localizedString' }),
        defineField({ name: 'body', title: 'Text', type: 'localizedText' }),
      ],
    }),
  ],
});

const categories = [
  'Arbetsbelysning',
  'Barnsaker',
  'Biltillbehör',
  'Borra & Skruva',
  'Handverktyg',
  'Hem & hushåll',
  'Håltagning',
  'Kontor',
  'Luftverktyg',
  'Mäta',
  'Städa & Tvätta',
  'Såga & Slipa',
  'Trädgård',
  'Värme',
];

export const product = defineType({
  name: 'product',
  title: 'Produkt',
  type: 'document',
  fields: [
    defineField({
      name: 'translationTool',
      title: 'Automatisk översättning',
      type: 'string',
      components: { input: TranslationToolInput },
      description: 'Översätter produktens svenska texter till engelska utan att ändra annan produktdata.',
    }),
    defineField({ name: 'brand', title: 'Varumärke', type: 'string' }),
    defineField({ name: 'name', title: 'Produktnamn', type: 'string' }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'name' },
      validation: (rule) => rule.required(),
    }),
    defineField({ name: 'typeSv', title: 'Produkttyp – svenska', type: 'string' }),
    defineField({ name: 'typeEn', title: 'Produkttyp – engelska', type: 'string' }),
    defineField({
      name: 'category',
      title: 'Kategori',
      type: 'string',
      options: { list: categories.map((value) => ({ title: value, value })) },
    }),
    defineField({ name: 'accent', title: 'Accentfärg', type: 'string' }),
    defineField({
      name: 'images',
      title: 'Produktbilder',
      type: 'array',
      of: [defineArrayMember({ type: 'image' })],
    }),
    defineField({ name: 'image', title: 'Äldre huvudbild', type: 'image' }),
    defineField({ name: 'legacyImagePath', title: 'Äldre bildsökväg', type: 'string' }),
    defineField({
      name: 'badge',
      title: 'Popularitetsstämpel',
      type: 'string',
      options: {
        list: [
          { title: 'POPULÄR', value: 'popular' },
          { title: 'JÄTTEPOPULÄR', value: 'very-popular' },
        ],
        layout: 'radio',
      },
    }),
    defineField({ name: 'rating', title: 'Betyg', type: 'number' }),
    defineField({ name: 'reviewCount', title: 'Antal omdömen', type: 'number' }),
    defineField({
      name: 'cardHighlight',
      title: 'Korttext / lyft fram',
      type: 'localizedString',
      description: 'Valfri kort rad som visas under produktnamnet på produktkortet, till exempel “Munstycken ingår”.',
    }),
    defineField({
      name: 'rentalPrices',
      title: 'Hyrespriser',
      type: 'array',
      of: [defineArrayMember({ type: 'rentalPrice' })],
    }),
    defineField({ name: 'detailCategory', title: 'Kategori på produktsidan', type: 'localizedString' }),
    defineField({
      name: 'included',
      title: 'Detta ingår',
      type: 'array',
      of: [defineArrayMember({ type: 'localizedString' })],
    }),
    defineField({ name: 'description', title: 'Beskrivning', type: 'localizedText' }),
    defineField({
      name: 'specifications',
      title: 'Specifikationer',
      type: 'array',
      of: [defineArrayMember({ type: 'specification' })],
    }),
    defineField({
      name: 'guideSections',
      title: 'Användarguide',
      type: 'array',
      of: [defineArrayMember({ type: 'guideSection' })],
    }),
    defineField({
      name: 'hyggloUrl',
      title: 'Hygglo-länk',
      type: 'url',
      validation: (rule) => rule.uri({ scheme: ['http', 'https'] }),
    }),
    defineField({ name: 'sortOrder', title: 'Sorteringsordning', type: 'number' }),
  ],
  preview: {
    select: { brand: 'brand', name: 'name', media: 'images.0' },
    prepare({ brand, name, media }) {
      return { title: `${brand ?? ''} ${name ?? ''}`.trim(), media };
    },
  },
});

export const schemaTypes = [
  product,
  localizedString,
  localizedText,
  rentalPrice,
  specification,
  guideCard,
  guideSection,
];
